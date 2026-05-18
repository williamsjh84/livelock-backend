/**
 * LiveLock — Session & Team DB Helpers
 * Query helpers for verification sessions, teams, and audit log.
 * All functions return raw Drizzle rows.
 */
import { createHash } from "crypto";
import { and, desc, eq, gt, isNull, lt, or } from "drizzle-orm";
import { getDb } from "./db";
import {
  auditLog,
  teamInvites,
  teamMembers,
  teams,
  users,
  verificationSessions,
  type AuditLogEntry,
  type InsertAuditLogEntry,
  type InsertTeam,
  type InsertVerificationSession,
  type VerificationSession,
} from "../drizzle/schema";

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(data: InsertVerificationSession): Promise<VerificationSession | null> {
  const db = await getDb();
  if (!db) return null;
  await db.insert(verificationSessions).values(data);
  const [row] = await db
    .select()
    .from(verificationSessions)
    .where(eq(verificationSessions.id, data.id));
  return row ?? null;
}

export async function getSessionById(id: string): Promise<VerificationSession | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(verificationSessions)
    .where(eq(verificationSessions.id, id));
  return row ?? null;
}

export async function getActiveSessionForUser(userId: number): Promise<VerificationSession | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(verificationSessions)
    .where(
      and(
        or(
          eq(verificationSessions.initiatorId, userId),
          eq(verificationSessions.responderId, userId)
        ),
        or(
          eq(verificationSessions.status, "pending"),
          eq(verificationSessions.status, "active")
        ),
        gt(verificationSessions.expiresAt, new Date())
      )
    )
    .orderBy(desc(verificationSessions.createdAt))
    .limit(1);
  return row ?? null;
}

export async function updateSessionStatus(
  id: string,
  status: VerificationSession["status"],
  extra?: Partial<Pick<VerificationSession, "initiatorConfirmed" | "responderConfirmed" | "rejectionReason" | "completedAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(verificationSessions)
    .set({ status, ...extra })
    .where(eq(verificationSessions.id, id));
}

export async function getSessionHistory(
  userId: number,
  limit = 20,
  offset = 0
): Promise<VerificationSession[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(verificationSessions)
    .where(
      and(
        or(
          eq(verificationSessions.initiatorId, userId),
          eq(verificationSessions.responderId, userId)
        ),
        or(
          eq(verificationSessions.status, "verified"),
          eq(verificationSessions.status, "rejected"),
          eq(verificationSessions.status, "expired"),
          eq(verificationSessions.status, "cancelled")
        )
      )
    )
    .orderBy(desc(verificationSessions.createdAt))
    .limit(limit)
    .offset(offset);
}

/** Mark all expired pending/active sessions as expired */
export async function expireOldSessions(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(verificationSessions)
    .set({ status: "expired", completedAt: new Date() })
    .where(
      and(
        lt(verificationSessions.expiresAt, new Date()),
        or(
          eq(verificationSessions.status, "pending"),
          eq(verificationSessions.status, "active")
        )
      )
    );
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export async function createTeam(data: InsertTeam) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(teams).values(data);
  const [row] = await db.select().from(teams).where(eq(teams.ownerId, data.ownerId)).orderBy(desc(teams.createdAt)).limit(1);
  return row ?? null;
}

export async function getTeamByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [membership] = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .limit(1);
  if (!membership) return null;
  const [team] = await db.select().from(teams).where(eq(teams.id, membership.teamId));
  return team ?? null;
}

export async function getTeamsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ team: teams, role: teamMembers.role })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId));
  return rows;
}

export async function getTeamById(teamId: number) {
  const db = await getDb();
  if (!db) return null;
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  return team ?? null;
}

export async function isTeamMember(teamId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [row] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);
  return !!row;
}

export async function getTeamMembers(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
      name: users.name,
      displayName: users.displayName,
      email: users.email,
      hasPasskey: users.hasPasskey,
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));
  return rows;
}

export async function addTeamMember(teamId: number, userId: number, role: "owner" | "member" = "member") {
  const db = await getDb();
  if (!db) return;
  await db.insert(teamMembers).values({ teamId, userId, role });
}

export async function updateTeamName(teamId: number, name: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(teams).set({ name }).where(eq(teams.id, teamId));
}

export async function deleteTeamAndMembers(teamId: number) {
  const db = await getDb();
  if (!db) return;
  // Delete dependent rows first to avoid orphan references, then the team itself
  await db.delete(teamInvites).where(eq(teamInvites.teamId, teamId));
  await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
  await db.delete(teams).where(eq(teams.id, teamId));
}

export async function removeTeamMember(teamId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
}

export async function createInvite(data: {
  teamId: number;
  email: string;
  token: string;
  invitedByUserId: number;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(teamInvites).values(data);
  const [row] = await db.select().from(teamInvites).where(eq(teamInvites.token, data.token));
  return row ?? null;
}

export async function getInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(teamInvites).where(eq(teamInvites.token, token));
  return row ?? null;
}

export async function markInviteUsed(token: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(teamInvites)
    .set({ usedAt: new Date() })
    .where(eq(teamInvites.token, token));
}

export async function deleteInvite(inviteId: number, teamId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(teamInvites)
    .where(and(eq(teamInvites.id, inviteId), eq(teamInvites.teamId, teamId)));
}

export async function getPendingInvitesForTeam(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(teamInvites)
    .where(
      and(
        eq(teamInvites.teamId, teamId),
        isNull(teamInvites.usedAt),
        gt(teamInvites.expiresAt, new Date())
      )
    )
    .orderBy(desc(teamInvites.createdAt));
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

/**
 * Append an entry to the audit log with hash chain integrity.
 * Each row's hash = SHA-256(prevHash + actorId + action + metadata + createdAt)
 */
export async function appendAuditLog(entry: Omit<InsertAuditLogEntry, "hash" | "prevHash" | "createdAt">) {
  const db = await getDb();
  if (!db) return;

  // Get the last hash in the chain
  const [lastEntry] = await db
    .select({ hash: auditLog.hash })
    .from(auditLog)
    .orderBy(desc(auditLog.id))
    .limit(1);

  const prevHash = lastEntry?.hash ?? "GENESIS";
  const now = new Date();
  const content = `${prevHash}|${entry.actorId}|${entry.action}|${entry.metadata ?? ""}|${now.toISOString()}`;
  const hash = createHash("sha256").update(content).digest("hex");

  await db.insert(auditLog).values({
    ...entry,
    prevHash,
    hash,
    createdAt: now,
  });
}

export async function getAuditLog(teamId: number, limit = 50, offset = 0): Promise<AuditLogEntry[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.teamId, teamId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getAuditLogForUser(userId: number, limit = 50): Promise<AuditLogEntry[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.actorId, userId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
