/**
 * LiveLock — Verify Page (/app/verify)
 *
 * Two-round challenge flow with biometric confirmation at each authorization point.
 *
 * Round 1 — Initiator speaks:
 *   Initiator sees wordA → says it aloud → taps "I said it"
 *   Responder waits → sees wordA revealed → taps "Yes, I heard it" → BIOMETRIC
 *
 * Round 2 — Roles flip, Responder speaks:
 *   Responder sees wordB → says it aloud → taps "I said it"
 *   Initiator waits → sees wordB revealed → taps "Yes, I heard it" → BIOMETRIC
 *
 * Both critical confirmation points require a passkey assertion.
 * Users without passkeys can still confirm (noted in audit log).
 */
import { useState, useEffect, useRef } from "react";
import {
  ShieldCheck, Shield, UserCheck, X, CheckCircle2, XCircle,
  Clock, AlertTriangle, RefreshCw, Fingerprint, Mic, Volume2,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { startAuthentication } from "@simplewebauthn/browser";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

// ── Phase types ───────────────────────────────────────────────────────────────

type Phase =
  | { name: "idle" }
  | { name: "pending"; sessionId: string; wordA: string; expiresAt: Date }
  | { name: "r1_speaker"; sessionId: string; wordA: string; expiresAt: Date }
  | { name: "r1_listener"; sessionId: string; wordA: string; expiresAt: Date; canConfirm: boolean }
  | { name: "r2_speaker"; sessionId: string; wordB: string; expiresAt: Date }
  | { name: "r2_listener"; sessionId: string; wordB: string; expiresAt: Date; canConfirm: boolean }
  | { name: "verified"; actionContext?: string | null }
  | { name: "rejected"; reason: string }
  | { name: "expired" }
  | { name: "cancelled" };

// ── Countdown Timer ───────────────────────────────────────────────────────────

function CountdownTimer({ expiresAt }: { expiresAt: Date }) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);
  const color = remaining > 30 ? "#00C9B1" : remaining > 10 ? "#f59e0b" : "#ef4444";
  const pct = (remaining / 90) * 100;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="3"
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

// ── Round pips ────────────────────────────────────────────────────────────────

function RoundPips({ round }: { round: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full bg-[#00C9B1]" />
      <div className={`w-2.5 h-2.5 rounded-full ${round === 2 ? "bg-[#00C9B1]" : "bg-white/10"}`} />
      <span className="text-[10px] text-white/30 ml-1">Round {round} of 2</span>
    </div>
  );
}

// ── Word display ──────────────────────────────────────────────────────────────

function WordBox({ word }: { word: string }) {
  return (
    <div className="w-full py-8 rounded-2xl border border-[#00C9B1]/20 bg-[#00C9B1]/5 flex items-center justify-center">
      <p
        className="text-5xl font-bold text-[#00C9B1] tracking-widest uppercase"
        style={{ fontFamily: "Space Grotesk, sans-serif", textShadow: "0 0 40px rgba(0,201,177,0.3)" }}
      >
        {word}
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Verify() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: teamData } = trpc.teams.getMyTeam.useQuery();
  const { data: activeSessionData } = trpc.sessions.getActive.useQuery(undefined, { refetchInterval: 5000 });
  const initiateMutation = trpc.sessions.initiate.useMutation();
  const getBiometricChallenge = trpc.sessions.getBiometricChallenge.useMutation();
  const utils = trpc.useUtils();

  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [actionContext, setActionContext] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [partnerName, setPartnerName] = useState("Teammate");
  const [biometricPending, setBiometricPending] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const font = { fontFamily: "Space Grotesk, sans-serif" };

  const teamMembers = [...new Map(
    (teamData ?? []).flatMap(t => t.members).map(m => [m.userId, m])
  ).values()].filter(m => m.userId !== user?.id);

  // ── Socket connection ─────────────────────────────────────────────────────

  const connectSocket = (sessionId: string) => {
    socketRef.current?.disconnect();
    const sock = io({ path: "/api/socket.io", auth: { token: "cookie" }, transports: ["websocket"], withCredentials: true });
    socketRef.current = sock;

    sock.on("connect", () => sock.emit("session:join", { sessionId }));

    sock.on("session:state", ({ session: s }: { session: Record<string, unknown> }) => {
      const sid = s.id as string;
      const amInitiator = s.initiatorId === user?.id;
      const expires = new Date(s.expiresAt as string);
      const status = s.status as string;

      // Resolve partner name
      const partnerId = amInitiator ? s.responderId : s.initiatorId;
      const partner = teamMembers.find(m => m.userId === partnerId);
      if (partner) setPartnerName(partner.displayName ?? partner.name ?? "Teammate");

      if (status === "pending" && amInitiator) {
        setPhase({ name: "pending", sessionId: sid, wordA: s.wordA as string, expiresAt: expires });
      } else if (status === "active") {
        if (s.responderConfirmed) {
          // Round 2
          setPhase(amInitiator
            ? { name: "r2_listener", sessionId: sid, wordB: s.wordB as string, expiresAt: expires, canConfirm: false }
            : { name: "r2_speaker", sessionId: sid, wordB: s.wordB as string, expiresAt: expires });
        } else if (s.initiatorConfirmed) {
          // Round 1, responder can confirm
          setPhase(amInitiator
            ? { name: "r1_speaker", sessionId: sid, wordA: s.wordA as string, expiresAt: expires }
            : { name: "r1_listener", sessionId: sid, wordA: s.wordA as string, expiresAt: expires, canConfirm: true });
        } else {
          setPhase(amInitiator
            ? { name: "r1_speaker", sessionId: sid, wordA: s.wordA as string, expiresAt: expires }
            : { name: "r1_listener", sessionId: sid, wordA: s.wordA as string, expiresAt: expires, canConfirm: false });
        }
      }
    });

    sock.on("session:active", () => {
      setPhase(prev => {
        if (prev.name === "pending") {
          return { name: "r1_speaker", sessionId: prev.sessionId, wordA: prev.wordA, expiresAt: prev.expiresAt };
        }
        return prev;
      });
    });

    sock.on("session:initiator-ready", ({ wordA }: { wordA: string }) => {
      setPhase(prev => {
        if (prev.name === "r1_listener") return { ...prev, wordA, canConfirm: true };
        return prev;
      });
    });

    sock.on("session:round2-start", ({ wordB }: { wordB: string }) => {
      const amInitiator = socketRef.current && user;
      setPhase(prev => {
        if (prev.name === "r1_speaker" || prev.name === "r1_listener") {
          const isInitiator = prev.name === "r1_speaker";
          return isInitiator
            ? { name: "r2_listener", sessionId: prev.sessionId, wordB, expiresAt: prev.expiresAt, canConfirm: false }
            : { name: "r2_speaker", sessionId: prev.sessionId, wordB, expiresAt: prev.expiresAt };
        }
        return prev;
      });
    });

    sock.on("session:responder-ready", ({ wordB }: { wordB: string }) => {
      setPhase(prev => {
        if (prev.name === "r2_listener") return { ...prev, wordB, canConfirm: true };
        return prev;
      });
    });

    sock.on("session:verified", ({ actionContext: ac }: { actionContext?: string }) => {
      utils.sessions.history.invalidate();
      setPhase({ name: "verified", actionContext: ac });
    });

    sock.on("session:rejected", ({ reason }: { reason: string }) => {
      setPhase({ name: "rejected", reason });
    });

    sock.on("session:expired", () => setPhase({ name: "expired" }));
    sock.on("session:cancelled", () => setPhase({ name: "cancelled" }));
    sock.on("session:biometric-required", ({ reason }: { reason: string }) => {
      setBiometricError(reason ?? "Biometric verification required. Please try again.");
    });
  };

  // Pick up active session on load (push notification tap / page refresh)
  useEffect(() => {
    if (activeSessionData && phase.name === "idle") {
      const s = activeSessionData as Record<string, unknown>;
      if (s.status === "pending" || s.status === "active") {
        connectSocket(s.id as string);
      }
    }
  }, [activeSessionData]);

  useEffect(() => () => { socketRef.current?.disconnect(); }, []);

  // ── Biometric helper ──────────────────────────────────────────────────────

  const withBiometric = async (sessionId: string, emitFn: (assertion?: unknown) => void) => {
    setBiometricPending(true);
    setBiometricError(null);
    try {
      const { requiresBiometric, options } = await getBiometricChallenge.mutateAsync({ sessionId });
      if (!requiresBiometric || !options) {
        emitFn();
        return;
      }
      const assertion = await startAuthentication({ optionsJSON: options as any });
      emitFn(assertion);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Biometric failed";
      if (!msg.toLowerCase().includes("cancel") && !msg.toLowerCase().includes("abort") && !msg.toLowerCase().includes("notallowed")) {
        setBiometricError("Biometric check failed. Please try again.");
      }
    } finally {
      setBiometricPending(false);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleInitiate = async () => {
    if (!selectedMemberId || !user) return;
    try {
      const result = await initiateMutation.mutateAsync({
        responderId: selectedMemberId,
        actionContext: actionContext || undefined,
      });
      connectSocket(result.sessionId);
      setPhase({ name: "pending", sessionId: result.sessionId, wordA: result.wordA, expiresAt: result.expiresAt });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to start session");
    }
  };

  const emit = (event: string, data: Record<string, unknown>) => {
    socketRef.current?.emit(event, data);
  };

  const handleR1InitiatorConfirm = (sessionId: string) => {
    emit("session:initiator-confirmed", { sessionId });
  };

  const handleR1ResponderConfirm = async (sessionId: string) => {
    await withBiometric(sessionId, (assertion) => {
      emit("session:responder-confirmed", { sessionId, assertionResponse: assertion });
    });
  };

  const handleR2ResponderSpeak = (sessionId: string) => {
    emit("session:responder-speaking", { sessionId });
  };

  const handleR2InitiatorConfirm = async (sessionId: string) => {
    await withBiometric(sessionId, (assertion) => {
      emit("session:initiator-confirmed-round2", { sessionId, assertionResponse: assertion });
    });
  };

  const handleReject = (sessionId: string, reason = "Word did not match") => {
    if (!confirm("Reject this verification? This will be logged.")) return;
    emit("session:reject", { sessionId, reason });
  };

  const handleCancel = (sessionId: string) => {
    if (!confirm("Cancel this session?")) return;
    emit("session:cancel", { sessionId });
  };

  const handleReset = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setPhase({ name: "idle" });
    setBiometricError(null);
    setActionContext("");
    setSelectedMemberId(null);
  };

  // ── Terminal states ───────────────────────────────────────────────────────

  if (phase.name === "verified") {
    return (
      <TerminalState
        icon={<CheckCircle2 size={40} className="text-[#00C9B1]" />}
        title="Identity Verified"
        subtitle={phase.actionContext ? `Action authorized: ${phase.actionContext}` : "Identity confirmed — you may proceed."}
        color="border-[#00C9B1]/30 bg-[#00C9B1]/5"
        onReset={handleReset} resetLabel="New Verification"
      />
    );
  }
  if (phase.name === "rejected") {
    return (
      <TerminalState
        icon={<XCircle size={40} className="text-red-400" />}
        title="Verification Failed"
        subtitle={phase.reason}
        color="border-red-400/30 bg-red-400/5"
        onReset={handleReset} resetLabel="Try Again" warning
      />
    );
  }
  if (phase.name === "expired") {
    return (
      <TerminalState
        icon={<Clock size={40} className="text-amber-400" />}
        title="Session Expired"
        subtitle="The 90-second window passed without both parties confirming."
        color="border-amber-400/30 bg-amber-400/5"
        onReset={handleReset} resetLabel="Try Again"
      />
    );
  }
  if (phase.name === "cancelled") {
    return (
      <TerminalState
        icon={<X size={40} className="text-white/30" />}
        title="Cancelled"
        subtitle="The session was cancelled."
        color="border-white/[0.08] bg-white/[0.02]"
        onReset={handleReset} resetLabel="Start New"
      />
    );
  }

  // ── PENDING — waiting for responder ──────────────────────────────────────

  if (phase.name === "pending") {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <RoundPips round={1} />
          <CountdownTimer expiresAt={phase.expiresAt} />
        </div>
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] text-center mb-4">
          <div className="flex items-center justify-center gap-2 text-xs text-white/30 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Waiting for {partnerName} to open the app…
          </div>
          <p className="text-xs text-white/30 mb-4">Your word is ready — wait until they join, then say it aloud.</p>
          <WordBox word={phase.wordA} />
        </div>
        <Button variant="outline" className="w-full border-red-400/20 text-red-400 hover:bg-red-400/10" onClick={() => handleCancel(phase.sessionId)}>
          <X size={14} className="mr-2" /> Cancel
        </Button>
      </div>
    );
  }

  // ── ROUND 1: INITIATOR speaks ─────────────────────────────────────────────

  if (phase.name === "r1_speaker") {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <RoundPips round={1} />
          <CountdownTimer expiresAt={phase.expiresAt} />
        </div>
        <div className="p-2 rounded-xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center gap-2 mb-4 px-4">
          <Mic size={13} className="text-[#00C9B1]" />
          <p className="text-xs text-[#00C9B1]/80">Your turn to speak</p>
        </div>
        <p className="text-xs text-white/40 mb-3">Say this word aloud to <span className="text-white/70">{partnerName}</span>:</p>
        <WordBox word={phase.wordA} />
        <Button
          onClick={() => handleR1InitiatorConfirm(phase.sessionId)}
          className="w-full mt-4 bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold"
        >
          <ShieldCheck size={15} className="mr-2" /> I Said the Word
        </Button>
        <Button variant="outline" className="w-full mt-2 border-red-400/20 text-red-400 hover:bg-red-400/10" onClick={() => handleCancel(phase.sessionId)}>
          <X size={14} className="mr-2" /> Cancel
        </Button>
      </div>
    );
  }

  // ── ROUND 1: RESPONDER listens ────────────────────────────────────────────

  if (phase.name === "r1_listener") {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <RoundPips round={1} />
          <CountdownTimer expiresAt={phase.expiresAt} />
        </div>
        <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center gap-2 mb-4 px-4">
          <Volume2 size={13} className="text-white/40" />
          <p className="text-xs text-white/40">Listen for <span className="text-white/70">{partnerName}</span> to say:</p>
        </div>
        <WordBox word={phase.wordA} />
        {!phase.canConfirm ? (
          <div className="flex items-center justify-center gap-2 text-xs text-white/30 mt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Waiting for {partnerName} to say the word…
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-white/50 text-center">Did you hear that word clearly?</p>
            {biometricError && (
              <div className="p-2.5 rounded-xl bg-red-400/10 border border-red-400/20 text-xs text-red-300 text-center">
                {biometricError}
              </div>
            )}
            <Button
              onClick={() => handleR1ResponderConfirm(phase.sessionId)}
              disabled={biometricPending}
              className="w-full bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold"
            >
              {biometricPending
                ? <><RefreshCw size={14} className="mr-2 animate-spin" />Verifying identity…</>
                : <><Fingerprint size={14} className="mr-2" />Yes — Confirm with Biometric</>}
            </Button>
            <p className="text-[10px] text-white/25 text-center">Proves your physical presence at this moment</p>
            <Button variant="outline" className="w-full border-red-400/20 text-red-400 hover:bg-red-400/10" onClick={() => handleReject(phase.sessionId)}>
              <AlertTriangle size={14} className="mr-2" /> No — Reject
            </Button>
          </div>
        )}
        <Button variant="outline" className="w-full mt-2 border-white/[0.08] text-white/30 hover:text-white/60" onClick={() => handleCancel(phase.sessionId)}>
          Cancel
        </Button>
      </div>
    );
  }

  // ── ROUND 2: RESPONDER speaks ─────────────────────────────────────────────

  if (phase.name === "r2_speaker") {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <RoundPips round={2} />
          <CountdownTimer expiresAt={phase.expiresAt} />
        </div>
        <div className="p-2 rounded-xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center gap-2 mb-4 px-4">
          <Mic size={13} className="text-[#00C9B1]" />
          <p className="text-xs text-[#00C9B1]/80">Your turn to speak</p>
        </div>
        <p className="text-xs text-white/40 mb-3">Now say this word aloud to <span className="text-white/70">{partnerName}</span>:</p>
        <WordBox word={phase.wordB} />
        <Button
          onClick={() => handleR2ResponderSpeak(phase.sessionId)}
          className="w-full mt-4 bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold"
        >
          <ShieldCheck size={15} className="mr-2" /> I Said the Word
        </Button>
        <Button variant="outline" className="w-full mt-2 border-red-400/20 text-red-400 hover:bg-red-400/10" onClick={() => handleReject(phase.sessionId)}>
          <AlertTriangle size={14} className="mr-2" /> Something's Wrong
        </Button>
      </div>
    );
  }

  // ── ROUND 2: INITIATOR listens ────────────────────────────────────────────

  if (phase.name === "r2_listener") {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <RoundPips round={2} />
          <CountdownTimer expiresAt={phase.expiresAt} />
        </div>
        <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center gap-2 mb-4 px-4">
          <Volume2 size={13} className="text-white/40" />
          <p className="text-xs text-white/40">Listen for <span className="text-white/70">{partnerName}</span> to say:</p>
        </div>
        <WordBox word={phase.wordB} />
        {!phase.canConfirm ? (
          <div className="flex items-center justify-center gap-2 text-xs text-white/30 mt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Waiting for {partnerName} to say the word…
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-white/50 text-center">Did you hear that word clearly?</p>
            {biometricError && (
              <div className="p-2.5 rounded-xl bg-red-400/10 border border-red-400/20 text-xs text-red-300 text-center">
                {biometricError}
              </div>
            )}
            <Button
              onClick={() => handleR2InitiatorConfirm(phase.sessionId)}
              disabled={biometricPending}
              className="w-full bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold"
            >
              {biometricPending
                ? <><RefreshCw size={14} className="mr-2 animate-spin" />Verifying identity…</>
                : <><Fingerprint size={14} className="mr-2" />Yes — Confirm with Biometric</>}
            </Button>
            <p className="text-[10px] text-white/25 text-center">Final confirmation — cryptographically signed</p>
            <Button variant="outline" className="w-full border-red-400/20 text-red-400 hover:bg-red-400/10" onClick={() => handleReject(phase.sessionId)}>
              <AlertTriangle size={14} className="mr-2" /> No — Reject
            </Button>
          </div>
        )}
        <Button variant="outline" className="w-full mt-2 border-white/[0.08] text-white/30 hover:text-white/60" onClick={() => handleCancel(phase.sessionId)}>
          Cancel
        </Button>
      </div>
    );
  }

  // ── IDLE — select teammate and initiate ───────────────────────────────────

  return (
    <div className="p-6 max-w-sm mx-auto">
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-1">Verify</p>
        <h1 className="text-xl font-bold text-white" style={font}>Start Verification</h1>
        <p className="text-xs text-white/40 mt-1">Confirm a teammate's identity before a high-risk action.</p>
      </div>

      {teamMembers.length === 0 ? (
        <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center">
          <Shield size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm font-bold text-white/40 mb-1" style={font}>No teammates yet</p>
          <p className="text-xs text-white/25">Invite teammates from the Team page.</p>
        </div>
      ) : (
        <div className="space-y-4">
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
                    <p className="text-sm font-medium text-white truncate" style={font}>
                      {member.displayName || member.name || member.email}
                    </p>
                    <p className="text-[10px] text-white/30 truncate">{member.email}</p>
                  </div>
                  {selectedMemberId === member.userId && <CheckCircle2 size={16} className="text-[#00C9B1] flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-white/50 mb-2">What action are you authorizing? <span className="text-white/20">(optional)</span></p>
            <input
              type="text"
              value={actionContext}
              onChange={e => setActionContext(e.target.value)}
              placeholder="e.g. Wire transfer $50,000 to vendor"
              maxLength={500}
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00C9B1]/40 transition-all"
              style={font}
            />
          </div>

          <Button
            onClick={handleInitiate}
            disabled={!selectedMemberId || initiateMutation.isPending}
            className="w-full bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold py-3"
          >
            {initiateMutation.isPending
              ? <><RefreshCw size={15} className="mr-2 animate-spin" />Starting…</>
              : <><ShieldCheck size={15} className="mr-2" />Start Verification</>}
          </Button>

          {/* How it works */}
          <div className="p-4 rounded-2xl border border-white/[0.04] bg-white/[0.01] space-y-2">
            {[
              { icon: <Mic size={11} />, text: "You receive a secret word — say it aloud" },
              { icon: <Volume2 size={11} />, text: "They confirm they heard it with Face ID" },
              { icon: <Mic size={11} />, text: "Roles flip — they say a word, you listen" },
              { icon: <Fingerprint size={11} />, text: "You confirm with Face ID — both verified" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center text-[#00C9B1] flex-shrink-0">{step.icon}</div>
                <p className="text-[11px] text-white/40">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Terminal State ────────────────────────────────────────────────────────────

function TerminalState({ icon, title, subtitle, color, onReset, resetLabel, warning }: {
  icon: React.ReactNode; title: string; subtitle: string; color: string;
  onReset: () => void; resetLabel: string; warning?: boolean;
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
              If you did not initiate this rejection, treat it as a potential impersonation attempt and do not proceed.
            </p>
          </div>
        )}
      </div>
      <Button onClick={onReset} variant="outline" className="border-white/[0.12] text-white/60 hover:text-white">
        <RefreshCw size={14} className="mr-2" />{resetLabel}
      </Button>
    </div>
  );
}
