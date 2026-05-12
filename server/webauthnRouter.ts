/**
 * LiveLock — WebAuthn tRPC Router
 *
 * Provides four procedures for the full passkey lifecycle:
 *   1. registrationOptions   — generate a challenge + options for the browser to create a passkey
 *   2. verifyRegistration    — verify the authenticator's response and store the credential
 *   3. authenticationOptions — generate a challenge for login
 *   4. verifyAuthentication  — verify the authenticator's response and issue a session JWT
 *
 * Security notes:
 *   - Challenges are single-use and expire after 5 minutes
 *   - The private key never leaves the user's device; we only store the public key
 *   - Counter is checked on every authentication to detect cloned authenticators
 *   - Session JWTs are signed with HS256 using JWT_SECRET and expire in 30 days
 */
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
// Types are exported directly from @simplewebauthn/server in v13
type AuthenticationResponseJSON = Parameters<typeof verifyAuthenticationResponse>[0]['response'];
type RegistrationResponseJSON = Parameters<typeof verifyRegistrationResponse>[0]['response'];
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  consumeChallenge,
  getCredentialById,
  getCredentialsByUserId,
  getUserByEmail,
  insertCredential,
  storeChallenge,
  updateCredentialCounter,
} from "./webauthnDb";
import { sdk } from "./_core/sdk";

// The Relying Party (RP) details — must match the domain in production
//
// IMPORTANT: This app runs behind a reverse proxy (Manus / Cloudflare).
// Express sees the internal hostname, not the public domain.
// We must read x-forwarded-host to get the real public domain.
// Express must have `trust proxy` enabled (done in index.ts) for this to work.
function getRpId(req: { hostname: string; headers: Record<string, string | string[] | undefined> }): string {
  // Prefer the forwarded host (set by the reverse proxy)
  const forwarded = req.headers["x-forwarded-host"];
  const forwardedHost = Array.isArray(forwarded) ? forwarded[0] : forwarded;

  const hostname = (forwardedHost || req.hostname || "").split(":")[0].trim();

  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") return "localhost";

  // Always use the apex domain as the RP ID so both www. and apex work
  // e.g. "www.livelock.io" → "livelock.io"
  const parts = hostname.split(".");
  if (parts.length >= 2) {
    return parts.slice(-2).join(".");
  }
  return hostname;
}

// Build the list of valid origins for WebAuthn verification.
// Both the apex and www subdomain must be accepted.
function getExpectedOrigins(rpId: string): string[] {
  if (rpId === "localhost") {
    return ["http://localhost:3000", "http://localhost:5173", "http://localhost"];
  }
  return [
    `https://${rpId}`,
    `https://www.${rpId}`,
  ];
}

function getRpName(): string {
  return "LiveLock";
}


async function createMobileJWT(userId: number): Promise<string> {
  const secretKey = new TextEncoder().encode(ENV.cookieSecret);
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("365d")
    .sign(secretKey);
}

export const webauthnRouter = router({
  /**
   * Step 1 of registration: generate options for the browser's WebAuthn API.
   * The user must be identified by email first (we look them up or create them).
   */
  registrationOptions: publicProcedure
    .input(
      z.object({
        email: z.string().email().max(320),
        displayName: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Find or create the user
      let user = await getUserByEmail(input.email);

      if (!user) {
        // Create a new user with a synthetic openId (email-based)
        const syntheticOpenId = `webauthn:${input.email}`;
        await db.insert(users).values({
          openId: syntheticOpenId,
          email: input.email,
          name: input.displayName,
          displayName: input.displayName,
          loginMethod: "webauthn",
          lastSignedIn: new Date(),
          // Assign admin role if this is the owner's email
          role: input.email === "joe.williams1984@gmail.com" ? "admin" : "user",
        });
        user = await getUserByEmail(input.email);
      }

      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });

      // Get existing credentials to exclude (prevents re-registering the same device)
      const existingCredentials = await getCredentialsByUserId(user.id);

      const options = await generateRegistrationOptions({
        rpName: getRpName(),
        rpID: getRpId(ctx.req),
        userName: input.email,
        userDisplayName: input.displayName,
        // Exclude already-registered credentials
        excludeCredentials: existingCredentials.map(c => ({
          id: c.credentialId,
          transports: undefined,
        })),
        // Prefer platform authenticators (Face ID, Touch ID, Windows Hello)
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "preferred",
          userVerification: "preferred",
        },
        timeout: 60000,
      });

      // Store the challenge for verification
      await storeChallenge(user.id, options.challenge, "registration");

      return { options, userId: user.id };
    }),

  /**
   * Step 2 of registration: verify the authenticator's response and store the credential.
   */
  verifyRegistration: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        response: z.any(), // RegistrationResponseJSON — validated by simplewebauthn
        deviceName: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Retrieve and consume the stored challenge
      const expectedChallenge = await consumeChallenge(input.userId, "registration");
      if (!expectedChallenge) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration challenge expired or not found. Please try again.",
        });
      }

      const rpID = getRpId(ctx.req);
      const expectedOrigins = getExpectedOrigins(rpID);

      let verification;
      try {
        verification = await verifyRegistrationResponse({
          response: input.response as RegistrationResponseJSON,
          expectedChallenge,
          expectedOrigin: expectedOrigins,
          expectedRPID: rpID,
          requireUserVerification: false,
        });
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Registration verification failed: ${(err as Error).message}`,
        });
      }

      if (!verification.verified || !verification.registrationInfo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Registration not verified" });
      }

      const { credential } = verification.registrationInfo;

      // Store the credential
      await insertCredential({
        userId: input.userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        deviceName: input.deviceName ?? "My Device",
        userVerified: verification.registrationInfo.userVerified ?? false,
        authenticatorAttachment: null,
      });

      // Mark user as having a passkey
      const db = await getDb();
      if (db) {
        await db.update(users).set({ hasPasskey: true }).where(eq(users.id, input.userId));
      }

      // Issue a session JWT and set the cookie
      const user = await (await getDb())?.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user || user.length === 0) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "User not found" });

      const sessionToken = await sdk.createSessionToken(user[0].openId, {
        name: user[0].displayName ?? user[0].name ?? "",
        expiresInMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      const mobileToken = await createMobileJWT(input.userId);
      return { verified: true, userId: input.userId, token: mobileToken, user: { id: user[0].id, email: user[0].email, displayName: user[0].displayName } };
    }),

  /**
   * Step 1 of authentication: generate options for the browser's WebAuthn API.
   */
  authenticationOptions: publicProcedure
    .input(
      z.object({
        email: z.string().email().max(320),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(input.email);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No account found with that email address.",
        });
      }

      const credentials = await getCredentialsByUserId(user.id);
      if (credentials.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No passkeys registered for this account. Please register first.",
        });
      }

      const options = await generateAuthenticationOptions({
        rpID: getRpId(ctx.req),
        userVerification: "preferred",
        allowCredentials: credentials.map(c => ({
          id: c.credentialId,
          transports: undefined,
        })),
        timeout: 60000,
      });

      await storeChallenge(user.id, options.challenge, "authentication");

      return { options, userId: user.id };
    }),

  /**
   * Step 2 of authentication: verify the authenticator's response and issue a session JWT.
   */
  verifyAuthentication: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        response: z.any(), // AuthenticationResponseJSON
      })
    )
    .mutation(async ({ input, ctx }) => {
      const expectedChallenge = await consumeChallenge(input.userId, "authentication");
      if (!expectedChallenge) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Authentication challenge expired or not found. Please try again.",
        });
      }

      // Find the credential being used
      const authResponse = input.response as AuthenticationResponseJSON;
      const credential = await getCredentialById(authResponse.id);

      if (!credential || credential.userId !== input.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Credential not found or does not belong to this user.",
        });
      }

      const rpID = getRpId(ctx.req);
      const expectedOrigins = getExpectedOrigins(rpID);

      let verification;
      try {
        verification = await verifyAuthenticationResponse({
          response: authResponse,
          expectedChallenge,
          expectedOrigin: expectedOrigins,
          expectedRPID: rpID,
          requireUserVerification: false,
          credential: {
            id: credential.credentialId,
            publicKey: Buffer.from(credential.publicKey, "base64url"),
            counter: credential.counter,
          },
        });
      } catch (err) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Authentication failed: ${(err as Error).message}`,
        });
      }

      if (!verification.verified) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication not verified" });
      }

      // Update the counter (detects cloned authenticators if counter goes backwards)
      await updateCredentialCounter(credential.credentialId, verification.authenticationInfo.newCounter);

      // Fetch the user and issue a session JWT
      const db = await getDb();
      const userRows = await db?.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!userRows || userRows.length === 0) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "User not found" });
      }
      const user = userRows[0];

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.displayName ?? user.name ?? "",
        expiresInMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      const mobileToken = await createMobileJWT(user.id);
      return { verified: true, userId: user.id, displayName: user.displayName ?? user.name ?? "", token: mobileToken, user: { id: user.id, email: user.email, displayName: user.displayName } };
    }),

  /**
   * List passkeys registered for the current user (for a "Manage Devices" screen).
   */
  listCredentials: protectedProcedure.query(async ({ ctx }) => {
    const credentials = await getCredentialsByUserId(ctx.user.id);
    return credentials.map(c => ({
      id: c.id,
      credentialId: c.credentialId,
      deviceName: c.deviceName,
      authenticatorAttachment: c.authenticatorAttachment,
      userVerified: c.userVerified,
      createdAt: c.createdAt,
      lastUsedAt: c.lastUsedAt,
    }));
  }),

  /**
   * Delete a passkey credential (user must have at least one remaining).
   */
  deleteCredential: protectedProcedure
    .input(z.object({ credentialId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const credentials = await getCredentialsByUserId(ctx.user.id);
      if (credentials.length <= 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove your only passkey" });
      }
      const cred = credentials.find(c => c.credentialId === input.credentialId);
      if (!cred) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Credential not found" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { webauthnCredentials } = await import("../drizzle/schema");
      await db.delete(webauthnCredentials).where(eq(webauthnCredentials.credentialId, input.credentialId));
      return { success: true };
    }),
});
