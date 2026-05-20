/**
 * LiveLock — Public REST API v1
 *
 * Authenticated with API keys: Authorization: Bearer sk_live_xxx
 *
 * Endpoints:
 *   POST   /api/v1/sessions           — initiate a verification session
 *   GET    /api/v1/sessions/:id       — get session status
 *   GET    /api/v1/sessions           — list recent sessions (last 50)
 *   GET    /api/v1/team/members       — list team members (to get IDs)
 *   GET    /api/v1/team               — get team info
 */
import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import crypto from "crypto";
import { getDb } from "./db";
import { apiKeys, users, verificationSessions } from "../drizzle/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { getTeamsByUserId, getTeamMembers, createSession, getSessionById, appendAuditLog } from "./sessionDb";
import { generateWordPair } from "./wordPairs";
import { randomUUID } from "crypto";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/** Authenticate and return the API key record + associated team IDs */
async function authApiKey(req: Request): Promise<{ keyRecord: typeof apiKeys.$inferSelect; teamId: number } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer sk_live_")) return null;

  const rawKey = authHeader.slice(7);
  const hash = hashKey(rawKey);

  const db = await getDb();
  if (!db) return null;

  const rows = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);
  const keyRecord = rows[0];

  if (!keyRecord || keyRecord.revokedAt) return null;

  // Update lastUsedAt (fire-and-forget)
  db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, keyRecord.id)).catch(() => {});

  return { keyRecord, teamId: keyRecord.teamId };
}

function ok(res: Response, data: unknown) {
  res.json({ success: true, ...( typeof data === "object" && data !== null ? data : { data }) });
}

function err(res: Response, status: number, message: string) {
  res.status(status).json({ success: false, error: message });
}

export function createRestApiRouter(): Router {
  const router = createRouter();

  // ── POST /api/v1/sessions — initiate a verification session ────────────────
  router.post("/sessions", async (req, res) => {
    const auth = await authApiKey(req);
    if (!auth) return err(res, 401, "Invalid or missing API key");

    const { responderId, responderEmail, actionContext } = req.body as {
      responderId?: number;
      responderEmail?: string;
      actionContext?: string;
    };

    const db = await getDb();
    if (!db) return err(res, 500, "Database unavailable");

    // Resolve responder — accept either ID or email
    let resolvedResponderId: number | null = null;
    if (responderId) {
      resolvedResponderId = responderId;
    } else if (responderEmail) {
      const rows = await db.select().from(users).where(eq(users.email, responderEmail.toLowerCase())).limit(1);
      if (!rows[0]) return err(res, 404, `No user found with email: ${responderEmail}`);
      resolvedResponderId = rows[0].id;
    } else {
      return err(res, 400, "Either responderId or responderEmail is required");
    }

    // Resolve initiator — use team owner as initiator for API-initiated sessions
    const members = await getTeamMembers(auth.teamId);
    const initiatorMember = members.find(m => m.role === "owner") ?? members[0];
    if (!initiatorMember) return err(res, 400, "Team has no members");

    // Verify responder is in the team
    const responderMember = members.find(m => m.userId === resolvedResponderId);
    if (!responderMember) return err(res, 400, "Responder is not a member of this team");

    if (initiatorMember.userId === resolvedResponderId) {
      return err(res, 400, "Initiator and responder cannot be the same person");
    }

    const { wordA, wordB } = generateWordPair();
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 90_000);

    const session = await createSession({
      id: sessionId,
      initiatorId: initiatorMember.userId,
      responderId: resolvedResponderId,
      wordA,
      wordB,
      actionContext: actionContext ?? null,
      status: "pending",
      expiresAt,
    });

    if (!session) return err(res, 500, "Failed to create session");

    await appendAuditLog({
      sessionId,
      teamId: auth.teamId,
      actorId: initiatorMember.userId,
      action: "session.initiated",
      metadata: JSON.stringify({ source: "api", actionContext }),
    });

    // Send notifications to responder (fire-and-forget)
    try {
      const { sendVerificationNotificationEmail } = await import("./email");
      const { sendPushNotification } = await import("./push");
      const { sendSms } = await import("./sms");
      const { pushSubscriptions } = await import("../drizzle/schema");

      const responderRows = await db.select().from(users).where(eq(users.id, resolvedResponderId)).limit(1);
      const responder = responderRows[0];
      const initiatorName = initiatorMember.displayName ?? initiatorMember.name ?? "LiveLock API";

      if (responder?.email) {
        sendVerificationNotificationEmail(responder.email, initiatorName, actionContext ?? null).catch(() => {});
      }
      if (responder?.smsNotifications && responder?.phone) {
        const { sendSms } = await import("./sms");
        sendSms(responder.phone, `${initiatorName} wants to verify you on LiveLock. Open the app — 90 seconds.`).catch(() => {});
      }
      const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, resolvedResponderId));
      subs.forEach(sub => {
        sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title: `${initiatorName} wants to verify you`, body: actionContext ?? "Open LiveLock to respond", url: "/app/verify" }
        ).catch(() => {});
      });
    } catch { /* non-fatal */ }

    ok(res, {
      sessionId,
      status: "pending",
      expiresAt: expiresAt.toISOString(),
      responderId: resolvedResponderId,
      responderEmail: responderMember.email,
      actionContext: actionContext ?? null,
    });
  });

  // ── GET /api/v1/sessions/:id — get session status ─────────────────────────
  router.get("/sessions/:id", async (req, res) => {
    const auth = await authApiKey(req);
    if (!auth) return err(res, 401, "Invalid or missing API key");

    const session = await getSessionById(req.params.id);
    if (!session) return err(res, 404, "Session not found");

    // Only return sessions for this team
    const members = await getTeamMembers(auth.teamId);
    const memberIds = new Set(members.map(m => m.userId));
    if (!memberIds.has(session.initiatorId) && !memberIds.has(session.responderId)) {
      return err(res, 403, "Session does not belong to your team");
    }

    ok(res, {
      session: {
        id: session.id,
        status: session.status,
        actionContext: session.actionContext,
        initiatorId: session.initiatorId,
        responderId: session.responderId,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
        rejectionReason: session.rejectionReason,
      },
    });
  });

  // ── GET /api/v1/sessions — list recent sessions ───────────────────────────
  router.get("/sessions", async (req, res) => {
    const auth = await authApiKey(req);
    if (!auth) return err(res, 401, "Invalid or missing API key");

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const db = await getDb();
    if (!db) return err(res, 500, "Database unavailable");

    const members = await getTeamMembers(auth.teamId);
    const memberIds = members.map(m => m.userId);

    if (memberIds.length === 0) return ok(res, { sessions: [] });

    // Get sessions where any team member is initiator or responder
    const sessions = await db
      .select()
      .from(verificationSessions)
      .orderBy(desc(verificationSessions.createdAt))
      .limit(limit);

    const filtered = sessions
      .filter(s => memberIds.includes(s.initiatorId) || memberIds.includes(s.responderId))
      .map(s => ({
        id: s.id,
        status: s.status,
        actionContext: s.actionContext,
        initiatorId: s.initiatorId,
        responderId: s.responderId,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
      }));

    ok(res, { sessions: filtered });
  });

  // ── GET /api/v1/team/members — list team members ──────────────────────────
  router.get("/team/members", async (req, res) => {
    const auth = await authApiKey(req);
    if (!auth) return err(res, 401, "Invalid or missing API key");

    const members = await getTeamMembers(auth.teamId);
    ok(res, {
      members: members.map(m => ({
        id: m.userId,
        email: m.email,
        displayName: m.displayName ?? m.name,
        role: m.role,
        hasPasskey: m.hasPasskey,
      })),
    });
  });

  // ── GET /api/v1/team — get team info ──────────────────────────────────────
  router.get("/team", async (req, res) => {
    const auth = await authApiKey(req);
    if (!auth) return err(res, 401, "Invalid or missing API key");

    const db = await getDb();
    if (!db) return err(res, 500, "Database unavailable");

    const { teams } = await import("../drizzle/schema");
    const rows = await db.select().from(teams).where(eq(teams.id, auth.teamId)).limit(1);
    const team = rows[0];
    if (!team) return err(res, 404, "Team not found");

    ok(res, {
      team: {
        id: team.id,
        name: team.name,
        requireBiometric: team.requireBiometric,
        createdAt: team.createdAt,
      },
    });
  });

  return router;
}
