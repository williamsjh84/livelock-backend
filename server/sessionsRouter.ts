/**
 * LiveLock — Sessions & Teams tRPC Router
 *
 * Procedures:
 *   sessions.initiate      — create a new verification session
 *   sessions.getActive     — get the current user's active session
 *   sessions.getById       — get a specific session by ID
 *   sessions.history       — paginated history of past sessions
 *   teams.create           — create a new team (owner)
 *   teams.getMyTeam        — get current user's team + members
 *   teams.inviteMember     — send an invite email to a new member
 *   teams.acceptInvite     — accept an invite token and join the team
 *   teams.removeMember     — owner removes a member
 *   audit.getLog           — get the audit log for the user's team
 */
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { generateWordPair, cryptoShuffle } from "./wordPairs";
import {
  createSession,
  getSessionById,
  getActiveSessionForUser,
  getSessionHistory,
  createTeam,
  getTeamByUserId,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateTeamName,
  deleteTeamAndMembers,
  createInvite,
  getInviteByToken,
  markInviteUsed,
  deleteInvite,
  getPendingInvitesForTeam,
  getAuditLog,
  appendAuditLog,
} from "./sessionDb";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendTeamInviteEmail } from "./email";

// ── Sessions Router ───────────────────────────────────────────────────────────

const sessionsRouter = router({
  /**
   * Create a new verification session.
   * The initiator specifies who they want to verify and optionally what action.
   */
  initiate: protectedProcedure
    .input(z.object({
      responderId: z.number().int().positive(),
      actionContext: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const initiatorId = ctx.user.id;

      if (initiatorId === input.responderId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot verify yourself" });
      }

      // Check for an existing active session between these two users
      const existing = await getActiveSessionForUser(initiatorId);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have an active verification session",
        });
      }

      // Generate the word pair
      const { wordA, wordB } = generateWordPair();

      // Session expires in 90 seconds
      const expiresAt = new Date(Date.now() + 90_000);
      const sessionId = randomUUID();

      const session = await createSession({
        id: sessionId,
        initiatorId,
        responderId: input.responderId,
        wordA,
        wordB,
        actionContext: input.actionContext ?? null,
        status: "pending",
        expiresAt,
      });

      if (!session) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create session" });
      }

      // Log the initiation
      await appendAuditLog({
        sessionId,
        actorId: initiatorId,
        action: "session.initiated",
        metadata: JSON.stringify({
          responderId: input.responderId,
          actionContext: input.actionContext,
        }),
      });

      return {
        sessionId: session.id,
        // Only the initiator gets wordA
        wordA: session.wordA,
        expiresAt: session.expiresAt,
      };
    }),

  /**
   * Get the current user's active (pending or active) session.
   */
  getActive: protectedProcedure.query(async ({ ctx }) => {
    const session = await getActiveSessionForUser(ctx.user.id);
    if (!session) return null;

    const isInitiator = session.initiatorId === ctx.user.id;

    return {
      id: session.id,
      status: session.status,
      actionContext: session.actionContext,
      initiatorId: session.initiatorId,
      responderId: session.responderId,
      initiatorConfirmed: session.initiatorConfirmed,
      responderConfirmed: session.responderConfirmed,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      // Only the initiator sees the word to say
      wordA: isInitiator ? session.wordA : undefined,
      // Responder gets shuffled options (wordA + wordB as decoy)
      options: !isInitiator
        ? cryptoShuffle([session.wordA, session.wordB])
        : undefined,
    };
  }),

  /**
   * Get a specific session by ID (for both participants).
   */
  getById: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const session = await getSessionById(input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }
      if (session.initiatorId !== ctx.user.id && session.responderId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant in this session" });
      }
      const isInitiator = session.initiatorId === ctx.user.id;
      return {
        ...session,
        wordA: isInitiator ? session.wordA : undefined,
        wordB: undefined, // never expose decoy to client
      };
    }),

  /**
   * Get paginated history of completed sessions for the current user.
   */
  history: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const sessions = await getSessionHistory(ctx.user.id, input.limit, input.offset);
      // Strip word data from history
      return sessions.map(s => ({
        id: s.id,
        status: s.status,
        actionContext: s.actionContext,
        initiatorId: s.initiatorId,
        responderId: s.responderId,
        rejectionReason: s.rejectionReason,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
        isInitiator: s.initiatorId === ctx.user.id,
      }));
    }),
});

// ── Teams Router ──────────────────────────────────────────────────────────────

const teamsRouter = router({
  /**
   * Create a new team. The creator becomes the owner.
   */
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      // Check if user already has a team
      const existing = await getTeamByUserId(ctx.user.id);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "You are already a member of a team" });
      }

      const team = await createTeam({ name: input.name, ownerId: ctx.user.id });
      if (!team) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create team" });
      }

      // Add owner as a member
      await addTeamMember(team.id, ctx.user.id, "owner");

      await appendAuditLog({
        teamId: team.id,
        actorId: ctx.user.id,
        action: "team.created",
        metadata: JSON.stringify({ teamName: input.name }),
      });

      return team;
    }),

  /**
   * Get the current user's team and its members.
   */
  getMyTeam: protectedProcedure.query(async ({ ctx }) => {
    const team = await getTeamByUserId(ctx.user.id);
    if (!team) return null;

    const members = await getTeamMembers(team.id);
    const pendingInvites = await getPendingInvitesForTeam(team.id);

    return {
      team,
      members,
      pendingInvites: pendingInvites.map(i => ({
        id: i.id,
        email: i.email,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
      isOwner: team.ownerId === ctx.user.id,
    };
  }),

  /**
   * Invite a new member to the team by email.
   */
  inviteMember: protectedProcedure
    .input(z.object({
      email: z.string().email().max(320),
      origin: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const team = await getTeamByUserId(ctx.user.id);
      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "You are not in a team" });
      }
      if (team.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the team owner can invite members" });
      }

      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await createInvite({
        teamId: team.id,
        email: input.email,
        token,
        invitedByUserId: ctx.user.id,
        expiresAt,
      });

      const inviteUrl = `${input.origin}/join?token=${token}`;

      // Send invite email (non-fatal — invite is still created even if email fails)
      const inviterName = ctx.user.displayName || ctx.user.name || ctx.user.email || "A teammate";
      const emailSent = await sendTeamInviteEmail({
        toEmail: input.email,
        inviterName,
        teamName: team.name,
        inviteUrl,
      }).catch(err => { console.warn("[Invite] Email send failed:", err); return false; });

      await appendAuditLog({
        teamId: team.id,
        actorId: ctx.user.id,
        action: "member.invited",
        metadata: JSON.stringify({ email: input.email }),
      });

      return { inviteUrl, token, expiresAt, emailSent };
    }),

  /**
   * Cancel a pending invite (owner only).
   */
  cancelInvite: protectedProcedure
    .input(z.object({ inviteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const team = await getTeamByUserId(ctx.user.id);
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "You are not in a team" });
      if (team.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the team owner can cancel invites" });
      }

      await deleteInvite(input.inviteId, team.id);

      await appendAuditLog({
        teamId: team.id,
        actorId: ctx.user.id,
        action: "member.invite_cancelled",
        metadata: JSON.stringify({ inviteId: input.inviteId }),
      });

      return { success: true };
    }),

  /**
   * Accept an invite token and join the team.
   */
  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await getInviteByToken(input.token);

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found or already used" });
      }
      if (invite.usedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This invite has already been used" });
      }
      if (new Date() > invite.expiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This invite has expired" });
      }

      // Check if user is already in a team
      const existing = await getTeamByUserId(ctx.user.id);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "You are already a member of a team" });
      }

      await addTeamMember(invite.teamId, ctx.user.id, "member");
      await markInviteUsed(input.token);

      await appendAuditLog({
        teamId: invite.teamId,
        actorId: ctx.user.id,
        action: "member.joined",
        metadata: JSON.stringify({ email: invite.email }),
      });

      return { success: true, teamId: invite.teamId };
    }),

  /**
   * Remove a member from the team (owner only).
   */
  removeMember: protectedProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const team = await getTeamByUserId(ctx.user.id);
      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }
      if (team.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the team owner can remove members" });
      }
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove yourself" });
      }

      await removeTeamMember(team.id, input.userId);

      await appendAuditLog({
        teamId: team.id,
        actorId: ctx.user.id,
        action: "member.removed",
        metadata: JSON.stringify({ removedUserId: input.userId }),
      });

      return { success: true };
    }),

  /**
   * Rename the team (owner only).
   */
  updateName: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const team = await getTeamByUserId(ctx.user.id);
      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }
      if (team.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the team owner can rename the team" });
      }

      await updateTeamName(team.id, input.name.trim());

      await appendAuditLog({
        teamId: team.id,
        actorId: ctx.user.id,
        action: "team.renamed",
        metadata: JSON.stringify({ newName: input.name.trim() }),
      });

      return { success: true, name: input.name.trim() };
    }),

  /**
   * Delete the team and remove all members (owner only).
   */
  deleteTeam: protectedProcedure
    .mutation(async ({ ctx }) => {
      const team = await getTeamByUserId(ctx.user.id);
      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }
      if (team.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the team owner can delete the team" });
      }

      // Audit log before deletion so the teamId reference is still valid
      await appendAuditLog({
        teamId: team.id,
        actorId: ctx.user.id,
        action: "team.deleted",
        metadata: JSON.stringify({ teamName: team.name }),
      });

      await deleteTeamAndMembers(team.id);

      return { success: true };
    }),

  /**
   * Leave the team (non-owner members only).
   */
  leaveTeam: protectedProcedure
    .mutation(async ({ ctx }) => {
      const team = await getTeamByUserId(ctx.user.id);
      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "You are not in a team" });
      }
      if (team.ownerId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The owner cannot leave the team. Delete the team instead.",
        });
      }

      await removeTeamMember(team.id, ctx.user.id);

      await appendAuditLog({
        teamId: team.id,
        actorId: ctx.user.id,
        action: "member.left",
        metadata: JSON.stringify({ userId: ctx.user.id }),
      });

      return { success: true };
    }),
});

// ── Audit Router ──────────────────────────────────────────────────────────────

const auditRouter = router({
  getLog: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const team = await getTeamByUserId(ctx.user.id);
      if (!team) return { entries: [], total: 0 };

      const entries = await getAuditLog(team.id, input.limit, input.offset);
      return { entries, teamId: team.id };
    }),
});

// ── Users Router (for looking up team contacts) ───────────────────────────────

const usersRouter = router({
  getById: protectedProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      // Only allow looking up users who are on the same team
      const myTeam = await getTeamByUserId(ctx.user.id);
      if (!myTeam) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You must be in a team to look up users" });
      }
      const members = await getTeamMembers(myTeam.id);
      const member = members.find(m => m.userId === input.userId);
      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found in your team" });
      }
      return {
        id: member.userId,
        name: member.name,
        displayName: member.displayName,
        email: member.email,
        hasPasskey: member.hasPasskey,
        role: member.role,
        joinedAt: member.joinedAt,
      };
    }),
});

export { sessionsRouter, teamsRouter, auditRouter, usersRouter };
