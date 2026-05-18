/**
 * LiveLock — Verify Page (/app/verify)
 *
 * The core product screen. Two states:
 *   1. No active session → select a teammate and initiate
 *   2. Active session → the live verification room (initiator or responder view)
 *
 * Real-time updates via Socket.io; session state also polled via tRPC as fallback.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { ShieldCheck, Shield, UserCheck, X, CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

type SessionStatus = "pending" | "active" | "verified" | "rejected" | "expired" | "cancelled";

interface LiveSession {
  id: string;
  status: SessionStatus;
  actionContext?: string | null;
  initiatorId: number;
  responderId: number;
  initiatorConfirmed: boolean;
  responderConfirmed: boolean;
  expiresAt: Date;
  wordA?: string; // only for initiator
  options?: string[]; // only for responder (shuffled)
}

// ── Socket singleton ──────────────────────────────────────────────────────────

let socketInstance: Socket | null = null;

function getSocket(token: string): Socket {
  if (!socketInstance || !socketInstance.connected) {
    socketInstance = io({ path: "/api/socket.io", auth: { token }, transports: ["websocket"] });
  }
  return socketInstance;
}

// ── Countdown Timer ───────────────────────────────────────────────────────────

function CountdownTimer({ expiresAt }: { expiresAt: Date }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(diff);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const pct = Math.min(100, (remaining / 90) * 100);
  const color = remaining > 30 ? "#00C9B1" : remaining > 10 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle
            cx="24" cy="24" r="20" fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color, fontFamily: "Space Grotesk, sans-serif" }}>{remaining}</span>
        </div>
      </div>
      <p className="text-[9px] text-white/30">seconds</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Verify() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: teamData } = trpc.teams.getMyTeam.useQuery();
  const { data: activeSessionData, refetch: refetchActive } = trpc.sessions.getActive.useQuery();
  const initiateMutation = trpc.sessions.initiate.useMutation();
  const utils = trpc.useUtils();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [actionContext, setActionContext] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [socketToken, setSocketToken] = useState<string | null>(null);
  const [initiatorReady, setInitiatorReady] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Get the session JWT token for socket auth
  const { data: meData } = trpc.auth.me.useQuery();

  // Sync active session from tRPC into local state
  useEffect(() => {
    if (activeSessionData && !session) {
      setSession(activeSessionData as LiveSession);
      setSessionStatus(activeSessionData.status as SessionStatus);
    }
  }, [activeSessionData, session]);

  // Connect to socket when we have a session
  useEffect(() => {
    if (!session || !meData) return;

    // We use the cookie-based auth — pass a placeholder token
    // In production this would be a short-lived socket token
    const sock = io({ path: "/api/socket.io", auth: { token: "cookie" }, transports: ["websocket"], withCredentials: true });
    socketRef.current = sock;

    sock.on("connect", () => {
      sock.emit("session:join", { sessionId: session.id });
    });

    sock.on("session:state", ({ session: s }: { session: LiveSession }) => {
      setSession(prev => ({ ...prev!, ...s }));
      setSessionStatus(s.status);
    });

    sock.on("session:active", () => {
      setSessionStatus("active");
      setSession(prev => prev ? { ...prev, status: "active" } : prev);
    });

    sock.on("session:initiator-ready", () => {
      setInitiatorReady(true);
    });

    sock.on("session:verified", ({ verifiedAt: va }: { verifiedAt: string }) => {
      setSessionStatus("verified");
      setVerifiedAt(va);
      utils.sessions.history.invalidate();
    });

    sock.on("session:rejected", ({ reason }: { reason: string }) => {
      setSessionStatus("rejected");
      setRejectionReason(reason);
    });

    sock.on("session:expired", () => {
      setSessionStatus("expired");
    });

    sock.on("session:cancelled", () => {
      setSessionStatus("cancelled");
    });

    sock.on("session:error", ({ message }: { message: string }) => {
      console.error("[Socket] Session error:", message);
    });

    return () => {
      sock.disconnect();
      socketRef.current = null;
    };
  }, [session?.id, meData]);

  const handleInitiate = async () => {
    if (!selectedMemberId) return;
    try {
      const result = await initiateMutation.mutateAsync({
        responderId: selectedMemberId,
        actionContext: actionContext || undefined,
      });
      setSession({
        id: result.sessionId,
        status: "pending",
        actionContext: actionContext || null,
        initiatorId: user!.id,
        responderId: selectedMemberId,
        initiatorConfirmed: false,
        responderConfirmed: false,
        expiresAt: result.expiresAt,
        wordA: result.wordA,
      });
      setSessionStatus("pending");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start session";
      alert(msg);
    }
  };

  const handleInitiatorConfirm = () => {
    if (!socketRef.current || !session) return;
    socketRef.current.emit("session:initiator-confirmed", { sessionId: session.id });
    setInitiatorReady(true);
  };

  const handleResponderConfirm = (word: string) => {
    if (!socketRef.current || !session) return;
    socketRef.current.emit("session:responder-confirmed", { sessionId: session.id, selectedWord: word });
  };

  const handleReject = () => {
    if (!socketRef.current || !session) return;
    socketRef.current.emit("session:reject", { sessionId: session.id, reason: "Manually rejected" });
  };

  const handleCancel = () => {
    if (!socketRef.current || !session) return;
    socketRef.current.emit("session:cancel", { sessionId: session.id });
    setSession(null);
    setSessionStatus(null);
  };

  const handleReset = () => {
    setSession(null);
    setSessionStatus(null);
    setInitiatorReady(false);
    setVerifiedAt(null);
    setRejectionReason(null);
    setActionContext("");
    setSelectedMemberId(null);
    refetchActive();
  };

  const isInitiator = session ? session.initiatorId === user?.id : false;
  // Aggregate members from all teams, deduped by userId, excluding self
  const teamMembers = [...new Map(
    (teamData ?? []).flatMap(t => t.members).map(m => [m.userId, m])
  ).values()].filter(m => m.userId !== user?.id);

  // ── Terminal states ────────────────────────────────────────────────────────

  if (sessionStatus === "verified") {
    return (
      <TerminalState
        icon={<CheckCircle2 size={40} className="text-[#00C9B1]" />}
        title="Identity Verified"
        subtitle={session?.actionContext ? `Action authorized: ${session.actionContext}` : "Identity confirmed — you may proceed."}
        color="border-[#00C9B1]/30 bg-[#00C9B1]/5"
        onReset={handleReset}
        resetLabel="New Verification"
      />
    );
  }

  if (sessionStatus === "rejected") {
    return (
      <TerminalState
        icon={<XCircle size={40} className="text-red-400" />}
        title="Verification Failed"
        subtitle={rejectionReason ?? "The verification was rejected."}
        color="border-red-400/30 bg-red-400/5"
        onReset={handleReset}
        resetLabel="Try Again"
        warning
      />
    );
  }

  if (sessionStatus === "expired") {
    return (
      <TerminalState
        icon={<Clock size={40} className="text-amber-400" />}
        title="Session Expired"
        subtitle="The 90-second window passed without both parties confirming."
        color="border-amber-400/30 bg-amber-400/5"
        onReset={handleReset}
        resetLabel="Try Again"
      />
    );
  }

  if (sessionStatus === "cancelled") {
    return (
      <TerminalState
        icon={<X size={40} className="text-white/30" />}
        title="Session Cancelled"
        subtitle="The verification was cancelled before it started."
        color="border-white/[0.08] bg-white/[0.02]"
        onReset={handleReset}
        resetLabel="Start New"
      />
    );
  }

  // ── Active session — Initiator view ───────────────────────────────────────

  if (session && isInitiator) {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60">Live Session</p>
          <CountdownTimer expiresAt={session.expiresAt} />
        </div>

        <div className="p-6 rounded-2xl border border-[#00C9B1]/20 bg-[#00C9B1]/5 text-center mb-4">
          <p className="text-xs text-white/40 mb-3">Say this word aloud to your teammate:</p>
          <p
            className="text-5xl font-bold text-[#00C9B1] tracking-wide mb-4"
            style={{ fontFamily: "Space Grotesk, sans-serif", textShadow: "0 0 40px rgba(0,201,177,0.3)" }}
          >
            {session.wordA}
          </p>
          {session.actionContext && (
            <p className="text-xs text-white/30 mb-3">Context: {session.actionContext}</p>
          )}

          {sessionStatus === "pending" && (
            <div className="flex items-center justify-center gap-2 text-xs text-white/30">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Waiting for {teamMembers.find(m => m.userId === session.responderId)?.displayName ?? "teammate"} to join…
            </div>
          )}

          {sessionStatus === "active" && !initiatorReady && (
            <Button
              onClick={handleInitiatorConfirm}
              className="mt-2 bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold"
            >
              <ShieldCheck size={15} className="mr-2" />
              I Said the Word
            </Button>
          )}

          {initiatorReady && (
            <div className="flex items-center justify-center gap-2 text-xs text-[#00C9B1]/70">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00C9B1] animate-pulse" />
              Waiting for teammate to confirm…
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full border-red-400/20 text-red-400 hover:bg-red-400/10"
          onClick={handleCancel}
        >
          <X size={14} className="mr-2" />
          Cancel Session
        </Button>
      </div>
    );
  }

  // ── Active session — Responder view ───────────────────────────────────────

  if (session && !isInitiator) {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60">Incoming Verification</p>
          <CountdownTimer expiresAt={session.expiresAt} />
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center">
              <UserCheck size={16} className="text-[#00C9B1]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                {teamMembers.find(m => m.userId === session.initiatorId)?.displayName ?? "A teammate"} wants to verify
              </p>
              {session.actionContext && (
                <p className="text-xs text-white/40">Context: {session.actionContext}</p>
              )}
            </div>
          </div>

          {!initiatorReady ? (
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-2 text-xs text-white/30">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Waiting for them to say the word…
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-white/50 mb-3 text-center">Which word did you hear?</p>
              <div className="space-y-2">
                {(session.options ?? []).map(word => (
                  <button
                    key={word}
                    onClick={() => handleResponderConfirm(word)}
                    className="w-full py-3 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-[#00C9B1]/40 hover:bg-[#00C9B1]/10 transition-all text-sm font-bold text-white text-left"
                    style={{ fontFamily: "Space Grotesk, sans-serif" }}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full border-red-400/20 text-red-400 hover:bg-red-400/10"
          onClick={handleReject}
        >
          <AlertTriangle size={14} className="mr-2" />
          Reject — Something Seems Wrong
        </Button>
      </div>
    );
  }

  // ── No active session — Initiate form ─────────────────────────────────────

  return (
    <div className="p-6 max-w-sm mx-auto">
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-1">Verify</p>
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          Start Verification
        </h1>
        <p className="text-xs text-white/40 mt-1">
          Confirm a teammate's identity before executing a high-risk action.
        </p>
      </div>

      {teamMembers.length === 0 ? (
        <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center">
          <Shield size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm font-bold text-white/40 mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>No teammates yet</p>
          <p className="text-xs text-white/25">Invite teammates from the Team page to start verifying.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Select teammate */}
          <div>
            <p className="text-xs font-semibold text-white/50 mb-2">Who do you want to verify?</p>
            <div className="space-y-2">
              {teamMembers.map(member => (
                <button
                  key={member.userId}
                  onClick={() => setSelectedMemberId(member.userId)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    selectedMemberId === member.userId
                      ? "border-[#00C9B1]/40 bg-[#00C9B1]/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white/50">
                      {(member.displayName || member.name || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                      {member.displayName || member.name || member.email}
                    </p>
                    <p className="text-[10px] text-white/30 truncate">{member.email}</p>
                  </div>
                  {selectedMemberId === member.userId && (
                    <CheckCircle2 size={16} className="text-[#00C9B1] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Action context */}
          <div>
            <p className="text-xs font-semibold text-white/50 mb-2">What action are you authorizing? <span className="text-white/20">(optional)</span></p>
            <input
              type="text"
              value={actionContext}
              onChange={e => setActionContext(e.target.value)}
              placeholder="e.g. Wire transfer $50,000 to vendor"
              maxLength={500}
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00C9B1]/40 focus:bg-[#00C9B1]/5 transition-all"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            />
          </div>

          <Button
            onClick={handleInitiate}
            disabled={!selectedMemberId || initiateMutation.isPending}
            className="w-full bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold py-3"
          >
            {initiateMutation.isPending ? (
              <RefreshCw size={15} className="mr-2 animate-spin" />
            ) : (
              <ShieldCheck size={15} className="mr-2" />
            )}
            Start Verification
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Terminal State Component ───────────────────────────────────────────────────

function TerminalState({
  icon, title, subtitle, color, onReset, resetLabel, warning,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  onReset: () => void;
  resetLabel: string;
  warning?: boolean;
}) {
  return (
    <div className="p-6 max-w-sm mx-auto flex flex-col items-center justify-center min-h-[60vh]">
      <div className={`w-full p-8 rounded-2xl border ${color} text-center mb-6`}>
        <div className="flex justify-center mb-4">{icon}</div>
        <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{title}</h2>
        <p className="text-sm text-white/50 leading-relaxed">{subtitle}</p>
        {warning && (
          <div className="mt-4 p-3 rounded-xl bg-red-400/10 border border-red-400/20">
            <p className="text-xs text-red-300 leading-relaxed">
              If you did not initiate this rejection, treat this as a potential impersonation attempt and do not proceed with the action.
            </p>
          </div>
        )}
      </div>
      <Button onClick={onReset} variant="outline" className="border-white/[0.12] text-white/60 hover:text-white">
        <RefreshCw size={14} className="mr-2" />
        {resetLabel}
      </Button>
    </div>
  );
}
