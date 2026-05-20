/**
 * LiveLock — API Key Management tRPC Router
 *
 * Used by the LiveLock dashboard to create/revoke API keys.
 * The actual REST API calls use these keys via Bearer auth.
 */
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { apiKeys } from "../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getTeamsByUserId } from "./sessionDb";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export const apiKeyRouter = router({
  /**
   * Create a new API key for the caller's team.
   * Returns the FULL key once — it is never stored and cannot be retrieved again.
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100).trim(),
      teamId: z.number().int().positive(),
      webhookUrl: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify user belongs to the team
      const memberships = await getTeamsByUserId(ctx.user.id);
      const membership = memberships.find(m => m.team.id === input.teamId);
      if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this team" });

      // Generate key: sk_live_ + 32 hex bytes
      const rawBytes = crypto.randomBytes(32).toString("hex");
      const fullKey = `sk_live_${rawBytes}`;
      const keyPrefix = fullKey.slice(0, 14) + "…"; // "sk_live_a1b2c" + ellipsis
      const keyHash = hashKey(fullKey);

      // Generate webhook signing secret
      const webhookSecret = crypto.randomBytes(24).toString("hex");

      await db.insert(apiKeys).values({
        teamId: input.teamId,
        name: input.name,
        keyPrefix,
        keyHash,
        webhookUrl: input.webhookUrl ?? null,
        webhookSecret,
        scopes: "sessions:write,sessions:read,members:read",
      });

      // Return the full key — THIS IS THE ONLY TIME IT'S VISIBLE
      return { fullKey, webhookSecret, keyPrefix, name: input.name };
    }),

  /**
   * List all API keys for the caller's teams (keys are never shown, only metadata).
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const memberships = await getTeamsByUserId(ctx.user.id);
    if (memberships.length === 0) return [];

    const teamIds = memberships.map(m => m.team.id);
    const rows = await db.select().from(apiKeys);
    return rows
      .filter(k => teamIds.includes(k.teamId) && !k.revokedAt)
      .map(k => ({
        id: k.id,
        teamId: k.teamId,
        name: k.name,
        keyPrefix: k.keyPrefix,
        webhookUrl: k.webhookUrl,
        scopes: k.scopes,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      }));
  }),

  /**
   * Update webhook URL for a key.
   */
  updateWebhook: protectedProcedure
    .input(z.object({
      keyId: z.number().int().positive(),
      webhookUrl: z.string().url().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const memberships = await getTeamsByUserId(ctx.user.id);
      const teamIds = memberships.map(m => m.team.id);

      const rows = await db.select().from(apiKeys).where(eq(apiKeys.id, input.keyId)).limit(1);
      const key = rows[0];
      if (!key || !teamIds.includes(key.teamId)) throw new TRPCError({ code: "FORBIDDEN" });

      await db.update(apiKeys).set({ webhookUrl: input.webhookUrl }).where(eq(apiKeys.id, input.keyId));
      return { success: true };
    }),

  /**
   * Revoke a key — immediately stops it from working.
   */
  revoke: protectedProcedure
    .input(z.object({ keyId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const memberships = await getTeamsByUserId(ctx.user.id);
      const teamIds = memberships.map(m => m.team.id);

      const rows = await db.select().from(apiKeys).where(eq(apiKeys.id, input.keyId)).limit(1);
      const key = rows[0];
      if (!key || !teamIds.includes(key.teamId)) throw new TRPCError({ code: "FORBIDDEN" });

      await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, input.keyId));
      return { success: true };
    }),
});
