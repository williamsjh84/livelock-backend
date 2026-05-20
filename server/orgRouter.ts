/**
 * LiveLock — Organization & SSO tRPC Router
 *
 * Procedures:
 *   org.create            — create an org and claim a domain
 *   org.getMyOrg          — get the current user's org
 *   org.updateSamlConfig  — save IdP metadata (entryPoint, cert, issuer)
 *   org.toggleSso         — enable/disable SSO for the org
 *   org.checkDomain       — check if a domain has SSO configured (public)
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { organizations, samlConfigs, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const orgRouter = router({
  /**
   * Create an organization and claim a domain.
   * One user can own one org.
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(200).trim(),
      domain: z.string().min(3).max(255).toLowerCase().trim(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check domain not already claimed
      const existing = await db.select().from(organizations).where(eq(organizations.domain, input.domain)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "This domain is already registered" });
      }

      const slug = input.domain.replace(/\./g, "-").replace(/[^a-z0-9-]/g, "");
      await db.insert(organizations).values({
        name: input.name,
        slug,
        domain: input.domain,
        ownerId: ctx.user.id,
        ssoEnabled: false,
      });

      // Link user to org
      const orgRows = await db.select().from(organizations).where(eq(organizations.domain, input.domain)).limit(1);
      const org = orgRows[0];
      await db.update(users).set({ orgId: org.id }).where(eq(users.id, ctx.user.id));

      return org;
    }),

  /**
   * Get the current user's organization and SAML config.
   */
  getMyOrg: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const user = ctx.user;
    if (!user.orgId) return null;

    const orgRows = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
    const org = orgRows[0];
    if (!org) return null;

    const cfgRows = await db.select().from(samlConfigs).where(eq(samlConfigs.orgId, org.id)).limit(1);
    const cfg = cfgRows[0] ?? null;

    return {
      org,
      saml: cfg ? {
        entryPoint: cfg.entryPoint,
        issuer: cfg.issuer,
        // Don't expose the full cert in the response — just indicate it's set
        certSet: cfg.cert.length > 10,
        nameIdFormat: cfg.nameIdFormat,
        updatedAt: cfg.updatedAt,
      } : null,
      // SP details for the admin to paste into their IdP
      spEntityId: process.env.RAILWAY_ENVIRONMENT ? "https://livelock.io/auth/sso/metadata" : "http://localhost:3000/auth/sso/metadata",
      acsUrl: process.env.RAILWAY_ENVIRONMENT ? "https://livelock.io/auth/sso/callback" : "http://localhost:3000/auth/sso/callback",
    };
  }),

  /**
   * Save or update the SAML configuration for the org.
   * entryPoint: IdP SSO URL (e.g. https://your-org.okta.com/app/xxx/sso/saml)
   * issuer: IdP Entity ID
   * cert: X.509 certificate from IdP (PEM or raw base64)
   */
  updateSamlConfig: protectedProcedure
    .input(z.object({
      entryPoint: z.string().url("Must be a valid URL"),
      issuer: z.string().min(1).max(500),
      cert: z.string().min(50, "Certificate appears too short — paste the full PEM certificate"),
      nameIdFormat: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "You must create an organization first" });

      const orgRows = await db.select().from(organizations).where(eq(organizations.id, ctx.user.orgId)).limit(1);
      const org = orgRows[0];
      if (!org || org.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the org owner can configure SSO" });
      }

      // Normalize cert — strip PEM headers if present, strip whitespace
      let cert = input.cert.trim();
      cert = cert.replace(/-----BEGIN CERTIFICATE-----/g, "").replace(/-----END CERTIFICATE-----/g, "").replace(/\s/g, "");

      const existing = await db.select().from(samlConfigs).where(eq(samlConfigs.orgId, org.id)).limit(1);

      if (existing.length > 0) {
        await db.update(samlConfigs).set({
          entryPoint: input.entryPoint,
          issuer: input.issuer,
          cert,
          nameIdFormat: input.nameIdFormat ?? existing[0].nameIdFormat,
        }).where(eq(samlConfigs.orgId, org.id));
      } else {
        await db.insert(samlConfigs).values({
          orgId: org.id,
          entryPoint: input.entryPoint,
          issuer: input.issuer,
          cert,
          nameIdFormat: input.nameIdFormat ?? "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
        });
      }

      return { success: true };
    }),

  /**
   * Enable or disable SSO for the org.
   * Requires a SAML config to already be saved before enabling.
   */
  toggleSso: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "No organization found" });

      const orgRows = await db.select().from(organizations).where(eq(organizations.id, ctx.user.orgId)).limit(1);
      const org = orgRows[0];
      if (!org || org.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the org owner can toggle SSO" });
      }

      if (input.enabled) {
        // Verify SAML config exists before enabling
        const cfgRows = await db.select().from(samlConfigs).where(eq(samlConfigs.orgId, org.id)).limit(1);
        if (!cfgRows.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Save your SAML configuration before enabling SSO" });
        }
      }

      await db.update(organizations).set({ ssoEnabled: input.enabled }).where(eq(organizations.id, org.id));
      return { success: true, enabled: input.enabled };
    }),

  /**
   * Public — check if a domain has SSO configured.
   * Used by the login page to auto-detect SSO domains.
   */
  checkDomain: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const domain = input.email.split("@")[1]?.toLowerCase();
      if (!domain) return { hasSso: false };
      const db = await getDb();
      if (!db) return { hasSso: false };
      const rows = await db.select().from(organizations).where(eq(organizations.domain, domain)).limit(1);
      const org = rows[0];
      return { hasSso: !!org?.ssoEnabled, orgName: org?.name ?? null };
    }),
});
