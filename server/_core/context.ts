import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { ENV } from "./env";
import { getDb } from "../db";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Authenticate via Bearer token (mobile app).
 * Supports both { openId } and { userId } JWT payloads for backward compatibility.
 */
async function getUserFromBearerToken(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    const secretKey = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });

    const userId = payload.userId as number | undefined;
    const openId = payload.openId as string | undefined;

    const db = await getDb();
    if (!db) return null;

    if (userId) {
      const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      return rows[0] ?? null;
    }
    if (openId) {
      const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      return rows[0] ?? null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Authenticate via session cookie (web app).
 * Directly verifies the JWT signature and looks up the user — does NOT require
 * the appId/name fields so it works for password, passkey, and OAuth users alike.
 */
async function getUserFromCookie(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const cookies = parseCookieHeader(cookieHeader);
    const sessionCookie = cookies[COOKIE_NAME];
    if (!sessionCookie) return null;

    const secretKey = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(sessionCookie, secretKey, { algorithms: ["HS256"] });

    const openId = payload.openId as string | undefined;
    const userId = payload.userId as number | undefined;

    const db = await getDb();
    if (!db) return null;

    if (openId) {
      const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      return rows[0] ?? null;
    }
    if (userId) {
      const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      return rows[0] ?? null;
    }

    return null;
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // First try Bearer token (mobile app auth)
  user = await getUserFromBearerToken(opts.req);

  // Fall back to cookie-based auth (web app)
  if (!user) {
    user = await getUserFromCookie(opts.req);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
