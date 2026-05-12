import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./sdk";
import { jwtVerify } from "jose";
import { ENV } from "./env";
import { getDb } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function getUserFromBearerToken(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.slice(7);
    const secretKey = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });

    // Support both userId (new password/webauthn auth) and openId (legacy)
    const userId = payload.userId as number | undefined;
    const openId = payload.openId as string | undefined;

    const db = await getDb();

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

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // First try Bearer token (mobile app auth)
  user = await getUserFromBearerToken(opts.req);

  // Fall back to cookie-based auth (web app)
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
