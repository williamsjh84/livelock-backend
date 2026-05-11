/**
 * LiveLock — Password Authentication Router
 * Simple email/password auth as an alternative to WebAuthn passkeys.
 * Uses bcrypt for hashing. Returns same JWT format as WebAuthn.
 */
import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { SignJWT } from "jose";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import * as crypto from "crypto";

// Simple password hashing using Node's built-in crypto (no bcrypt dependency needed)
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function createSalt(): string {
  return crypto.randomBytes(32).toString("hex");
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  return hashPassword(password, salt) === hash;
}

async function createJWT(userId: number): Promise<string> {
  const secretKey = new TextEncoder().encode(ENV.cookieSecret);
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("365d")
    .sign(secretKey);
}

export const passwordRouter = router({
  register: publicProcedure
    .input(z.object({
      email: z.string().email().max(320),
      displayName: z.string().min(1).max(100),
      password: z.string().min(8).max(128),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const email = input.email.toLowerCase().trim();

      // Check if email already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists. Please sign in.",
        });
      }

      // Hash password with salt stored together: salt:hash
      const salt = createSalt();
      const hash = hashPassword(input.password, salt);
      const passwordHash = `${salt}:${hash}`;

      // Create user
      const openId = `password:${email}:${Date.now()}`;
      await db.insert(users).values({
        openId,
        email,
        displayName: input.displayName.trim(),
        loginMethod: "password",
        passwordHash,
        hasPasskey: false,
        lastSignedIn: new Date(),
      });

      const newUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!newUser[0]) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });

      const token = await createJWT(newUser[0].id);

      return {
        token,
        user: {
          id: newUser[0].id,
          email: newUser[0].email,
          displayName: newUser[0].displayName,
          hasPasskey: false,
        },
      };
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email().max(320),
      password: z.string().min(1).max(128),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const email = input.email.toLowerCase().trim();

      const userRows = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      const user = userRows[0];

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      const [salt, hash] = user.passwordHash.split(":");
      if (!salt || !hash || !verifyPassword(input.password, salt, hash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password.",
        });
      }

      // Update last signed in
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

      const token = await createJWT(user.id);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          hasPasskey: user.hasPasskey,
        },
      };
    }),
});
