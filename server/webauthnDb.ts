/**
 * LiveLock — WebAuthn Database Helpers
 * Query helpers for credential and challenge storage.
 * All operations are isolated to webauthn_credentials and webauthn_challenges tables.
 */
import { and, eq, gt, lt } from "drizzle-orm";
import {
  InsertWebAuthnChallenge,
  InsertWebAuthnCredential,
  webauthnChallenges,
  webauthnCredentials,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";

// ── Credential helpers ──────────────────────────────────────────────────────

export async function insertCredential(data: InsertWebAuthnCredential) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(webauthnCredentials).values(data);
}

export async function getCredentialById(credentialId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(webauthnCredentials)
    .where(eq(webauthnCredentials.credentialId, credentialId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCredentialsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(webauthnCredentials)
    .where(eq(webauthnCredentials.userId, userId));
}

export async function updateCredentialCounter(credentialId: string, newCounter: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(webauthnCredentials)
    .set({ counter: newCounter, lastUsedAt: new Date() })
    .where(eq(webauthnCredentials.credentialId, credentialId));
}

// ── Challenge helpers ───────────────────────────────────────────────────────

/** Store a one-time challenge. Expires in 5 minutes. */
export async function storeChallenge(
  userId: number,
  challenge: string,
  type: "registration" | "authentication"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete any existing challenges for this user+type to prevent accumulation
  await db
    .delete(webauthnChallenges)
    .where(
      and(
        eq(webauthnChallenges.userId, userId),
        eq(webauthnChallenges.type, type)
      )
    );

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  const data: InsertWebAuthnChallenge = { userId, challenge, type, expiresAt };
  await db.insert(webauthnChallenges).values(data);
}

/** Retrieve and immediately delete a challenge (single-use). Returns null if not found or expired. */
export async function consumeChallenge(
  userId: number,
  type: "registration" | "authentication"
): Promise<string | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const rows = await db
    .select()
    .from(webauthnChallenges)
    .where(
      and(
        eq(webauthnChallenges.userId, userId),
        eq(webauthnChallenges.type, type),
        gt(webauthnChallenges.expiresAt, now)
      )
    )
    .limit(1);

  if (rows.length === 0) return null;

  const challenge = rows[0].challenge;

  // Delete immediately — challenges are single-use
  await db
    .delete(webauthnChallenges)
    .where(eq(webauthnChallenges.id, rows[0].id));

  return challenge;
}

/** Clean up expired challenges (run periodically) */
export async function purgeExpiredChallenges() {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(webauthnChallenges)
    .where(lt(webauthnChallenges.expiresAt, new Date()));
}

// ── User lookup by email (for WebAuthn login flow) ──────────────────────────

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
}
