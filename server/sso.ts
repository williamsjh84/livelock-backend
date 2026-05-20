/**
 * LiveLock — SSO / SAML Handler
 *
 * Implements SAML 2.0 SP (Service Provider) flows:
 *   SP-initiated: /auth/sso/initiate?email=joe@acme.com
 *     → looks up domain → builds AuthnRequest → redirects to IdP
 *
 *   ACS (callback): POST /auth/sso/callback
 *     → validates SAML assertion → upserts user → issues JWT → redirects to app
 *
 *   Metadata: GET /auth/sso/metadata?domain=acme.com
 *     → returns SP metadata XML for enterprise IT to paste into their IdP
 *
 * Compatible with Okta, Azure AD, Google Workspace, and any SAML 2.0 IdP.
 */
import type { Request, Response } from "express";
import { SAML } from "@node-saml/node-saml";
import { getDb } from "./db";
import { organizations, samlConfigs, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

const BASE_URL = process.env.RAILWAY_ENVIRONMENT
  ? "https://livelock.io"
  : "http://localhost:3000";

const SP_ENTITY_ID = `${BASE_URL}/auth/sso/metadata`;
const ACS_URL = `${BASE_URL}/auth/sso/callback`;

/** Build a SAML instance for a given config */
function buildSaml(config: { entryPoint: string; issuer: string; cert: string; nameIdFormat: string }) {
  return new SAML({
    entryPoint: config.entryPoint,
    issuer: SP_ENTITY_ID,
    callbackUrl: ACS_URL,
    cert: config.cert,
    identifierFormat: config.nameIdFormat,
    wantAssertionsSigned: false,
    wantAuthnResponseSigned: true,
    disableRequestedAuthnContext: true,
    validateInResponseTo: "never", // simplest for SP-initiated without InResponseTo tracking
  });
}

/** Look up org + SAML config by email domain */
async function getOrgByEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  const db = await getDb();
  if (!db) return null;

  const orgRows = await db.select().from(organizations).where(eq(organizations.domain, domain)).limit(1);
  const org = orgRows[0];
  if (!org || !org.ssoEnabled) return null;

  const cfgRows = await db.select().from(samlConfigs).where(eq(samlConfigs.orgId, org.id)).limit(1);
  const cfg = cfgRows[0];
  if (!cfg) return null;

  return { org, cfg };
}

/** GET /auth/sso/metadata?domain=acme.com — SP metadata XML */
export async function ssoMetadata(req: Request, res: Response) {
  const saml = new SAML({
    entryPoint: "https://placeholder.idp.example.com/sso",
    issuer: SP_ENTITY_ID,
    callbackUrl: ACS_URL,
    cert: "placeholder",
    disableRequestedAuthnContext: true,
  });

  const metadata = saml.generateServiceProviderMetadata(null, null);
  res.type("application/xml").send(metadata);
}

/** GET /auth/sso/initiate?email=joe@acme.com — redirect to IdP */
export async function ssoInitiate(req: Request, res: Response) {
  const email = req.query.email as string;
  if (!email) {
    res.redirect(`/login?sso_error=missing_email`);
    return;
  }

  const result = await getOrgByEmail(email);
  if (!result) {
    res.redirect(`/login?sso_error=no_sso_config&email=${encodeURIComponent(email)}`);
    return;
  }

  const saml = buildSaml(result.cfg);
  const url = await saml.getAuthorizeUrlAsync("", req.headers.host ?? BASE_URL, {});
  res.redirect(url);
}

/** POST /auth/sso/callback — ACS endpoint, receives SAML assertion from IdP */
export async function ssoCallback(req: Request, res: Response) {
  try {
    // SAMLResponse is in req.body.SAMLResponse (URL-encoded form post)
    const samlResponse = req.body?.SAMLResponse as string | undefined;
    if (!samlResponse) {
      res.redirect("/login?sso_error=missing_response");
      return;
    }

    // Decode to extract issuer and find matching org
    const decoded = Buffer.from(samlResponse, "base64").toString("utf8");
    const issuerMatch = decoded.match(/<(?:saml:|saml2:)?Issuer[^>]*>([^<]+)<\/(?:saml:|saml2:)?Issuer>/);
    const idpIssuer = issuerMatch?.[1]?.trim();

    if (!idpIssuer) {
      res.redirect("/login?sso_error=no_issuer");
      return;
    }

    // Find config by issuer
    const db = await getDb();
    if (!db) { res.redirect("/login?sso_error=db_unavailable"); return; }

    const cfgRows = await db.select().from(samlConfigs).where(eq(samlConfigs.issuer, idpIssuer)).limit(1);
    const cfg = cfgRows[0];
    if (!cfg) {
      // Try finding by orgId via all configs
      res.redirect("/login?sso_error=unknown_idp");
      return;
    }

    const orgRows = await db.select().from(organizations).where(eq(organizations.id, cfg.orgId)).limit(1);
    const org = orgRows[0];
    if (!org) { res.redirect("/login?sso_error=org_not_found"); return; }

    const saml = buildSaml(cfg);
    const { profile } = await saml.validatePostResponseAsync(req.body);

    // Extract email from profile
    const email = (profile?.nameID ?? profile?.email ?? (profile as any)?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"]) as string | undefined;
    const displayName = ((profile as any)?.displayName ?? (profile as any)?.["http://schemas.microsoft.com/identity/claims/displayname"] ?? (profile as any)?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"]) as string | undefined;

    if (!email) {
      res.redirect("/login?sso_error=no_email_in_assertion");
      return;
    }

    // Upsert user
    const openId = `sso:${org.slug}:${email.toLowerCase()}`;
    const existingRows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    let userId: number;

    if (existingRows.length > 0) {
      userId = existingRows[0].id;
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
    } else {
      await db.insert(users).values({
        openId,
        email: email.toLowerCase(),
        displayName: displayName ?? email.split("@")[0],
        loginMethod: "sso",
        orgId: org.id,
        hasPasskey: false,
        lastSignedIn: new Date(),
      });
      const newRows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      userId = newRows[0].id;
    }

    // Issue JWT session
    const token = await sdk.signSession({ openId, appId: openId, name: displayName ?? email });
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.redirect("/app/dashboard");
  } catch (err) {
    console.error("[SSO] Callback error:", err);
    res.redirect(`/login?sso_error=assertion_failed`);
  }
}
