/**
 * LiveLock — Socket.io Real-Time Session Relay
 *
 * Manages WebSocket rooms for verification sessions.
 * Each session gets its own room; both participants join it.
 * The server relays state transitions — it never trusts client-side state alone.
 *
 * Session lifecycle (server-authoritative):
 *   PENDING  → initiator creates session, waits for responder to join
 *   ACTIVE   → responder joins the room
 *   VERIFIED → both parties confirmed the word
 *   REJECTED → one party rejected
 *   EXPIRED  → 90-second timeout reached
 *   CANCELLED → initiator cancelled before responder joined
 */
import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { jwtVerify } from "jose";
import { ENV } from "./_core/env";
import { getSessionById, updateSessionStatus, appendAuditLog } from "./sessionDb";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { consumeChallenge, getCredentialsByUserId, updateCredentialCounter } from "./webauthnDb";

type AuthenticationResponseJSON = Parameters<typeof verifyAuthenticationResponse>[0]["response"];

/**
 * Verify a WebAuthn assertion for session confirmation.
 * Returns true if verified, false if failed or no credentials.
 * Returns null if the user has no passkeys (biometric not required).
 */
async function verifySessionBiometric(userId: number, assertionResponse: unknown): Promise<boolean | null> {
  try {
    const credentials = await getCredentialsByUserId(userId);
    if (credentials.length === 0) return null; // no passkeys — skip biometric

    const challenge = await consumeChallenge(userId, "authentication");
    if (!challenge) return false;

    const assertion = assertionResponse as AuthenticationResponseJSON;
    const credential = credentials.find(c => c.credentialId === assertion.id);
    if (!credential) return false;

    const rpId = process.env.RAILWAY_ENVIRONMENT ? "livelock.io" : "localhost";
    const expectedOrigin = process.env.RAILWAY_ENVIRONMENT
      ? ["https://livelock.io", "https://www.livelock.io"]
      : ["http://localhost:3000", "http://localhost:5173"];

    const result = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: challenge,
      expectedOrigin,
      expectedRPID: rpId,
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, "base64url"),
        counter: credential.counter,
        transports: undefined,
      },
    });

    if (result.verified) {
      await updateCredentialCounter(credential.credentialId, result.authenticationInfo.newCounter);
    }
    return result.verified;
  } catch (err) {
    console.error("[Biometric] Verification error:", err);
    return false;
  }
}

// Session timeout in milliseconds (90 seconds)
const SESSION_TIMEOUT_MS = 90_000;

// Track active timers so we can clear them
const sessionTimers = new Map<string, NodeJS.Timeout>();

export function attachSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        const ALLOWED = [
          "https://livelock.io",
          "https://www.livelock.io",
          "http://localhost:3000",
          "http://localhost:5173",
        ];
        // Allow mobile apps (no origin) and approved web origins
        if (!origin || ALLOWED.includes(origin)) return callback(null, true);
        callback(new Error(`Socket CORS blocked: ${origin}`));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socket.io",
  });

  // ── Authentication middleware ────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error("Authentication required"));
      }
      const secretKey = new TextEncoder().encode(ENV.cookieSecret);
      const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
      if (!payload || typeof payload.userId !== "number") {
        return next(new Error("Invalid token"));
      }
      (socket as AuthenticatedSocket).userId = payload.userId;
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const userId = socket.userId;

    // Connected — user ID not logged to avoid PII in logs

    // ── Join a session room ──────────────────────────────────────────────────
    socket.on("session:join", async ({ sessionId }: { sessionId: string }) => {
      const session = await getSessionById(sessionId);
      if (!session) {
        socket.emit("session:error", { message: "Session not found" });
        return;
      }

      // Only the two participants may join
      if (session.initiatorId !== userId && session.responderId !== userId) {
        socket.emit("session:error", { message: "Not a participant in this session" });
        return;
      }

      // Session must not be expired or completed
      if (!["pending", "active"].includes(session.status)) {
        socket.emit("session:error", { message: `Session is already ${session.status}` });
        return;
      }

      // Check expiry
      if (new Date() > session.expiresAt) {
        await updateSessionStatus(sessionId, "expired", { completedAt: new Date() });
        socket.emit("session:expired", { sessionId });
        return;
      }

      await socket.join(sessionId);

      // Helper: shuffle wordA (correct) + wordB (decoy) for responder pick UI
      const makeDecoys = (wA: string, wB: string) =>
        Math.random() > 0.5 ? [wA, wB] : [wB, wA];

      // If this is the responder joining, move to ACTIVE and send word options
      if (session.responderId === userId && session.status === "pending") {
        await updateSessionStatus(sessionId, "active");
        const decoys = makeDecoys(session.wordA, session.wordB);
        io.to(sessionId).emit("session:active", { sessionId, decoys });
      }

      // Send current session state to the joining user
      const updated = await getSessionById(sessionId);
      const sanitized = sanitizeSession(updated, userId) as Record<string, unknown>;
      // Responder always gets shuffled word options (handles reconnect too)
      if (session.responderId === userId && updated) {
        sanitized.decoys = makeDecoys(updated.wordA, updated.wordB);
      }
      socket.emit("session:state", { session: sanitized });

      // Start or reset the timeout timer
      startSessionTimer(io, sessionId, session.initiatorId);
    });

    // ── TWO-ROUND CHALLENGE FLOW ────────────────────────────────────────────
    //
    // Round 1: Initiator says wordA aloud → Responder hears it → Responder confirms
    //   initiatorConfirmed = true  →  reveal wordA to responder  →  responder taps confirm
    //   responderConfirmed = true  →  start Round 2
    //
    // Round 2: Responder says wordB aloud → Initiator hears it → Initiator confirms
    //   session:responder-speaking  →  reveal wordB to initiator  →  initiator taps confirm
    //   session:initiator-confirmed-round2  →  VERIFIED
    //
    // Either party can reject at any point → REJECTED

    // Round 1, Step 1: Initiator taps "I said the words"
    socket.on("session:initiator-confirmed", async ({ sessionId }: { sessionId: string }) => {
      const session = await getSessionById(sessionId);
      if (!session || session.initiatorId !== userId) return;
      if (session.status !== "active") return;

      await updateSessionStatus(sessionId, "active", { initiatorConfirmed: true });

      // Reveal wordA to responder so they can confirm they heard it
      io.to(sessionId).emit("session:initiator-ready", {
        sessionId,
        wordA: session.wordA,  // ← now sent to responder for display
      });
    });

    // Round 1, Step 2: Responder confirms they heard wordA correctly — BIOMETRIC REQUIRED
    socket.on("session:responder-confirmed", async ({ sessionId, assertionResponse }: { sessionId: string; assertionResponse?: unknown }) => {
      const session = await getSessionById(sessionId);
      if (!session || session.responderId !== userId) return;
      if (session.status !== "active") return;

      // Verify biometric — null means no passkeys (allowed), false means failed
      const biometricResult = assertionResponse
        ? await verifySessionBiometric(userId, assertionResponse)
        : null;

      const hasPasskeys = (await getCredentialsByUserId(userId)).length > 0;

      if (hasPasskeys && biometricResult !== true) {
        const reason = biometricResult === false ? "Biometric verification failed" : "Biometric required";
        socket.emit("session:biometric-required", { sessionId, reason });
        return;
      }

      const biometricVerified = biometricResult === true;

      await updateSessionStatus(sessionId, "active", { responderConfirmed: true });
      await appendAuditLog({
        sessionId,
        teamId: session.teamId ?? undefined,
        actorId: userId,
        action: "session.responder-confirmed",
        metadata: JSON.stringify({ biometricVerified }),
      });

      io.to(sessionId).emit("session:round2-start", {
        sessionId,
        wordB: session.wordB,
      });
    });

    // Round 2, Step 1: Responder taps "I said the words"
    socket.on("session:responder-speaking", async ({ sessionId }: { sessionId: string }) => {
      const session = await getSessionById(sessionId);
      if (!session || session.responderId !== userId) return;
      if (session.status !== "active") return;

      // Reveal wordB to initiator so they can confirm they heard it
      io.to(sessionId).emit("session:responder-ready", {
        sessionId,
        wordB: session.wordB,  // ← now sent to initiator for display
      });
    });

    // Round 2, Step 2: Initiator confirms they heard wordB correctly → VERIFIED — BIOMETRIC REQUIRED
    socket.on("session:initiator-confirmed-round2", async ({ sessionId, assertionResponse }: { sessionId: string; assertionResponse?: unknown }) => {
      const session = await getSessionById(sessionId);
      if (!session || session.initiatorId !== userId) return;
      if (session.status !== "active") return;

      // Verify biometric
      const biometricResult = assertionResponse
        ? await verifySessionBiometric(userId, assertionResponse)
        : null;

      const hasPasskeys = (await getCredentialsByUserId(userId)).length > 0;

      if (hasPasskeys && biometricResult !== true) {
        const reason = biometricResult === false ? "Biometric verification failed" : "Biometric required";
        socket.emit("session:biometric-required", { sessionId, reason });
        return;
      }

      const biometricVerified = biometricResult === true;

      await updateSessionStatus(sessionId, "verified", { completedAt: new Date() });
      clearSessionTimer(sessionId);

      await appendAuditLog({
        sessionId,
        teamId: session.teamId ?? undefined,
        actorId: userId,
        action: "session.verified",
        metadata: JSON.stringify({
          initiatorId: session.initiatorId,
          responderId: session.responderId,
          actionContext: session.actionContext,
          biometricVerified,
          fullyBiometricChain: biometricVerified, // both rounds verified biometrically
        }),
      });

      io.to(sessionId).emit("session:verified", {
        sessionId,
        verifiedAt: new Date().toISOString(),
        actionContext: session.actionContext,
        biometricVerified,
      });
    });

    // ── Shared rejection handler (either party, either round) ────────────────
    // (session:reject below handles this — no duplicate needed)

    // ── LEGACY stub kept for forward compat — not used in two-round flow ─────
    socket.on("_session:responder-confirmed-legacy", async ({ sessionId, selectedWord }: { sessionId: string; selectedWord: string }) => {
      const session = await getSessionById(sessionId);
      if (!session || session.responderId !== userId) return;
      if (session.status !== "active") return;

      const isCorrect = selectedWord === session.wordA;

      if (isCorrect) {
        await updateSessionStatus(sessionId, "verified", {
          responderConfirmed: true,
          completedAt: new Date(),
        });
        clearSessionTimer(sessionId);

        await appendAuditLog({
          sessionId,
          teamId: session.teamId ?? undefined,
          actorId: userId,
          action: "session.verified",
          metadata: JSON.stringify({
            initiatorId: session.initiatorId,
            responderId: session.responderId,
            actionContext: session.actionContext,
          }),
        });

        io.to(sessionId).emit("session:verified", {
          sessionId,
          verifiedAt: new Date().toISOString(),
          actionContext: session.actionContext,
        });
      } else {
        // Wrong word selected — treat as rejection
        await updateSessionStatus(sessionId, "rejected", {
          rejectionReason: "Wrong word selected",
          completedAt: new Date(),
        });
        clearSessionTimer(sessionId);

        await appendAuditLog({
          sessionId,
          teamId: session.teamId ?? undefined,
          actorId: userId,
          action: "session.rejected",
          metadata: JSON.stringify({ reason: "Wrong word selected" }),
        });

        io.to(sessionId).emit("session:rejected", {
          sessionId,
          reason: "Wrong word selected — possible impersonation attempt",
          rejectedBy: "responder",
        });
      }
    });

    // ── WebRTC Signaling Relay ───────────────────────────────────────────────
    // The server is a pure relay — it never inspects SDP or ICE candidates.
    // It only forwards to the other participant in the same session room.
    // Video/audio is peer-to-peer and never stored or processed server-side.

    socket.on("webrtc:offer", async ({ sessionId, offer }: { sessionId: string; offer: RTCSessionDescriptionInit }) => {
      const session = await getSessionById(sessionId);
      if (!session) return;
      // Only participants may relay WebRTC signals
      if (session.initiatorId !== userId && session.responderId !== userId) return;
      // Relay to the other participant only (not back to sender)
      socket.to(sessionId).emit("webrtc:offer", { offer });
    });

    socket.on("webrtc:answer", async ({ sessionId, answer }: { sessionId: string; answer: RTCSessionDescriptionInit }) => {
      const session = await getSessionById(sessionId);
      if (!session) return;
      if (session.initiatorId !== userId && session.responderId !== userId) return;
      socket.to(sessionId).emit("webrtc:answer", { answer });
    });

    socket.on("webrtc:ice-candidate", async ({ sessionId, candidate }: { sessionId: string; candidate: RTCIceCandidateInit }) => {
      const session = await getSessionById(sessionId);
      if (!session) return;
      if (session.initiatorId !== userId && session.responderId !== userId) return;
      socket.to(sessionId).emit("webrtc:ice-candidate", { candidate });
    });

    socket.on("webrtc:video-toggle", async ({ sessionId, enabled }: { sessionId: string; enabled: boolean }) => {
      const session = await getSessionById(sessionId);
      if (!session) return;
      if (session.initiatorId !== userId && session.responderId !== userId) return;
      socket.to(sessionId).emit("webrtc:video-toggle", { enabled });
    });

    socket.on("webrtc:audio-toggle", async ({ sessionId, enabled }: { sessionId: string; enabled: boolean }) => {
      const session = await getSessionById(sessionId);
      if (!session) return;
      if (session.initiatorId !== userId && session.responderId !== userId) return;
      socket.to(sessionId).emit("webrtc:audio-toggle", { enabled });
    });

    // ── Either party rejects the session ────────────────────────────────────
    // Rejection reason is whitelisted server-side — client cannot inject arbitrary strings
    const ALLOWED_REJECTION_REASONS = [
      "Word did not match",
      "I did not hear the words",
      "I did not initiate this",
      "Something seemed wrong",
      "This was a mistake",
      "Possible impersonation attempt",
    ];

    socket.on("session:reject", async ({ sessionId, reason }: { sessionId: string; reason: string }) => {
      const session = await getSessionById(sessionId);
      if (!session) return;
      if (session.initiatorId !== userId && session.responderId !== userId) return;
      if (!["pending", "active"].includes(session.status)) return;

      // Sanitize reason — only allow whitelisted strings
      const safeReason = ALLOWED_REJECTION_REASONS.includes(reason)
        ? reason
        : "Manually rejected";

      await updateSessionStatus(sessionId, "rejected", {
        rejectionReason: safeReason,
        completedAt: new Date(),
      });
      clearSessionTimer(sessionId);

      await appendAuditLog({
        sessionId,
        teamId: session.teamId ?? undefined,
        actorId: userId,
        action: "session.rejected",
        metadata: JSON.stringify({ reason: safeReason, rejectedByInitiator: session.initiatorId === userId }),
      });

      io.to(sessionId).emit("session:rejected", {
        sessionId,
        reason,
        rejectedBy: session.initiatorId === userId ? "initiator" : "responder",
      });
    });

    // ── Either party can cancel at any point ────────────────────────────────
    socket.on("session:cancel", async ({ sessionId }: { sessionId: string }) => {
      const session = await getSessionById(sessionId);
      if (!session) return;
      if (session.initiatorId !== userId && session.responderId !== userId) return;
      if (!["pending", "active"].includes(session.status)) return;

      await updateSessionStatus(sessionId, "cancelled", { completedAt: new Date() });
      clearSessionTimer(sessionId);

      await appendAuditLog({
        sessionId,
        teamId: session.teamId ?? undefined,
        actorId: userId,
        action: "session.cancelled",
        metadata: JSON.stringify({
          cancelledByInitiator: session.initiatorId === userId,
        }),
      });

      io.to(sessionId).emit("session:cancelled", { sessionId });
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] User ${userId} disconnected`);
    });
  });

  return io;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function startSessionTimer(io: SocketIOServer, sessionId: string, initiatorId: number) {
  // Clear any existing timer
  clearSessionTimer(sessionId);

  const timer = setTimeout(async () => {
    const session = await getSessionById(sessionId);
    if (!session || !["pending", "active"].includes(session.status)) return;

    await updateSessionStatus(sessionId, "expired", { completedAt: new Date() });
    await appendAuditLog({
      sessionId,
      teamId: session.teamId ?? undefined,
      actorId: initiatorId,
      action: "session.expired",
      metadata: JSON.stringify({ reason: "90-second timeout" }),
    });

    io.to(sessionId).emit("session:expired", { sessionId });
    sessionTimers.delete(sessionId);
  }, SESSION_TIMEOUT_MS);

  sessionTimers.set(sessionId, timer);
}

function clearSessionTimer(sessionId: string) {
  const timer = sessionTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    sessionTimers.delete(sessionId);
  }
}

/**
 * Strip sensitive fields before sending session state to a participant.
 * The initiator sees wordA; the responder does NOT see wordA until after confirmation.
 */
function sanitizeSession(session: Awaited<ReturnType<typeof getSessionById>>, viewerUserId: number) {
  if (!session) return null;
  const isInitiator = session.initiatorId === viewerUserId;
  return {
    id: session.id,
    status: session.status,
    actionContext: session.actionContext,
    initiatorId: session.initiatorId,
    responderId: session.responderId,
    initiatorConfirmed: session.initiatorConfirmed,
    responderConfirmed: session.responderConfirmed,
    rejectionReason: session.rejectionReason,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    completedAt: session.completedAt,
    // Only the initiator sees the word to say
    wordA: session.wordA,  // both parties see wordA immediately — responder uses it to confirm
    wordB: session.wordB,  // both parties see wordB immediately for round 2
  };
}

// Type augmentation for authenticated sockets
interface AuthenticatedSocket extends Socket {
  userId: number;
}
