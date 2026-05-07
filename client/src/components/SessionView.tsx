/**
 * HVL — "Clinical Trust" Design System
 * SessionView: Renders the active verification session for one side (initiator or approver).
 *
 * TWO-ROUND MUTUAL VERIFICATION PROTOCOL:
 *
 * Round 1 — Initiator (Sarah) SPEAKS, Approver (Marcus) LISTENS:
 *   Sarah's phone:  "Say this word: FALCON"   → button: "They heard it"
 *   Marcus's phone: "You will hear: FALCON"   → button: "I heard it"
 *
 * Round 2 — Approver (Marcus) SPEAKS, Initiator (Sarah) LISTENS:
 *   Marcus's phone: "Say this word: COBALT"   → button: "They heard it"
 *   Sarah's phone:  "You will hear: COBALT"   → button: "I heard it"
 *
 * After both rounds → Action Approval stage.
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Mic, Ear, ThumbsUp, ThumbsDown, RefreshCw, ChevronDown } from 'lucide-react';
import { useLiveLock, VerificationSession, UserRole, TEAM_MEMBERS } from '@/contexts/LiveLockContext';

const REJECT_REASONS = [
  'Wrong challenge word',
  'Unrecognized voice',
  'Suspected impersonation',
  'Did not initiate this request',
  'Suspicious behavior',
];

interface SessionViewProps {
  role: UserRole;
  session: VerificationSession;
}

function ChallengeWord({ word, delay = 0 }: { word: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay, word]);

  return (
    <span
      className={`hvl-code text-2xl font-bold text-white tracking-[0.2em] transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{ fontFamily: 'Space Mono, monospace' }}
    >
      {word}
    </span>
  );
}

export default function SessionView({ role, session }: SessionViewProps) {
  const { confirmChallenge, approveSession, rejectSession, resetSession } = useLiveLock();

  const isInitiator = role === 'initiator';
  const initiator = TEAM_MEMBERS.find(m => m.id === session.initiatorId);
  const approver = TEAM_MEMBERS.find(m => m.id === session.approverId);
  const otherUser = isInitiator ? approver : initiator;

  // ── Approved state ──────────────────────────────────────────────────────────
  if (session.status === 'approved') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center animate-fade-in-up">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-full bg-green-400/10 border-2 border-green-400/30 flex items-center justify-center hvl-pulse-ring">
            <CheckCircle2 size={28} className="text-green-400" />
          </div>
        </div>
        <p className="text-base font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Identity Verified
        </p>
        <p className="text-xs text-white/40 mb-3">
          {session.purpose}{session.amount ? ` · ${session.amount}` : ''}
        </p>
        <div className="flex gap-2 mb-4">
          {[session.round1Word, session.round2Word].map((w, i) => (
            <span key={i} className="text-[10px] font-mono px-2 py-1 rounded bg-green-400/10 text-green-400 border border-green-400/20">
              {w}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-white/25 font-mono">
          {new Date().toLocaleTimeString()}
        </p>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-green-400">
          <CheckCircle2 size={10} />
          <span>Logged to audit trail</span>
        </div>
      </div>
    );
  }

  // ── Rejected state ──────────────────────────────────────────────────────────
  if (session.status === 'rejected') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center animate-fade-in-up">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
            <XCircle size={28} className="text-red-400" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <AlertTriangle size={10} className="text-white" />
          </div>
        </div>
        <p className="text-base font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Session Rejected
        </p>
        <p className="text-xs text-white/40 mb-1">This session has been flagged and logged.</p>
        <div className="mb-4 flex items-center gap-1.5 text-[10px] text-red-400">
          <AlertTriangle size={10} />
          <span>Rejection recorded in audit log</span>
        </div>
        <div className="w-full p-3 rounded-xl bg-red-500/[0.06] border border-red-500/20 text-left mb-4">
          <p className="text-[9px] uppercase tracking-widest text-red-400/60 mb-1.5 font-medium">Security Alert</p>
          <p className="text-[10px] text-white/50 leading-relaxed">
            Do not proceed with the requested action. If you believe this was a real impersonation attempt, contact your security team immediately.
          </p>
        </div>
        <button
          onClick={() => resetSession()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-white/50 text-xs hover:text-white/80 hover:border-white/20 transition-all"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          <RefreshCw size={12} />
          Start New Session
        </button>
      </div>
    );
  }

  // ── Action Approval stage ───────────────────────────────────────────────────
  if (session.status === 'both_confirmed') {
    const hasApproved = isInitiator ? session.initiatorApproved : session.approverApproved;
    return (
      <div className="flex flex-col h-full px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full bg-[#00C9B1]/20 border border-[#00C9B1]/30 flex items-center justify-center">
            <CheckCircle2 size={10} className="text-[#00C9B1]" />
          </div>
          <p className="text-xs font-semibold text-[#00C9B1]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Both Identities Verified
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Action to Approve</p>
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] w-full mb-4">
            <p className="text-base font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {session.purpose}
            </p>
            {session.amount && (
              <p className="text-2xl font-bold text-[#00C9B1] mb-1" style={{ fontFamily: 'Space Mono, monospace' }}>
                {session.amount}
              </p>
            )}
            <div className="flex items-center justify-center gap-1 text-[10px] text-white/30 mt-2">
              <span>{initiator?.name}</span>
              <span>→</span>
              <span>{approver?.name}</span>
            </div>
          </div>

          {hasApproved ? (
            <div className="flex items-center gap-1.5 text-xs text-[#00C9B1]">
              <CheckCircle2 size={12} />
              <span>You approved · Waiting for {otherUser?.name?.split(' ')[0]}</span>
            </div>
          ) : (
            <p className="text-xs text-white/40 mb-4">
              {isInitiator ? 'Confirm this action is legitimate' : 'Approve or reject this request'}
            </p>
          )}
        </div>

        {!hasApproved && (
          <div className="flex gap-2">
            <button
              onClick={() => rejectSession(role)}
              className="flex-1 py-3 rounded-xl border border-red-400/30 text-red-400 text-sm font-semibold hover:bg-red-400/10 transition-all flex items-center justify-center gap-1.5 active:scale-[0.97]"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <ThumbsDown size={14} />
              Reject
            </button>
            <button
              onClick={() => approveSession(role)}
              className="flex-2 flex-grow py-3 rounded-xl bg-[#00C9B1] text-[#0A1628] text-sm font-bold hover:bg-[#00B8A2] transition-all flex items-center justify-center gap-1.5 active:scale-[0.97] hvl-teal-glow"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <ThumbsUp size={14} />
              Approve
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Reject reason selector state (local to challenge rounds) ────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [showRejectMenu, setShowRejectMenu] = useState(false);

  // ── Challenge Rounds ────────────────────────────────────────────────────────
  const isRound1 = session.status === 'challenge_sent';
  const isRound2 = session.status === 'round1_complete';

  // Determine this side's role in the current round
  // Round 1: Initiator SPEAKS, Approver LISTENS
  // Round 2: Approver SPEAKS, Initiator LISTENS
  const isSpeaker = isRound1 ? isInitiator : !isInitiator;
  const word = isRound1 ? session.round1Word : session.round2Word;

  // Has THIS side already confirmed for the current round?
  const hasConfirmedThisRound = isRound1
    ? (isInitiator ? session.round1InitiatorConfirmed : session.round1ApproverConfirmed)
    : (isInitiator ? session.round2InitiatorConfirmed : session.round2ApproverConfirmed);

  // Has the OTHER side confirmed for the current round?
  const otherConfirmedThisRound = isRound1
    ? (isInitiator ? session.round1ApproverConfirmed : session.round1InitiatorConfirmed)
    : (isInitiator ? session.round2ApproverConfirmed : session.round2InitiatorConfirmed);

  const roundLabel = isRound1 ? 'Round 1 of 2' : 'Round 2 of 2';
  const roundDescription = isRound1
    ? (isInitiator ? `You speak · ${otherUser?.name?.split(' ')[0]} listens` : `${otherUser?.name?.split(' ')[0]} speaks · You listen`)
    : (isInitiator ? `${otherUser?.name?.split(' ')[0]} speaks · You listen` : `You speak · ${otherUser?.name?.split(' ')[0]} listens`);

  const buttonLabel = isSpeaker ? 'They heard it' : 'I heard it';
  const instruction = isSpeaker
    ? `Say this word aloud to ${otherUser?.name?.split(' ')[0]}`
    : `Listen for this word from ${otherUser?.name?.split(' ')[0]}`;

  return (
    <div className="flex flex-col h-full px-3 py-2">
      {/* Session header with round indicator */}
      <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-[#00C9B1]/5 border border-[#00C9B1]/10">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00C9B1] animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-[#00C9B1] truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {roundLabel} · {roundDescription}
          </p>
          <p className="text-[9px] text-white/30 truncate">{session.purpose}{session.amount ? ` · ${session.amount}` : ''}</p>
        </div>
      </div>

      {/* Security rationale banner — Round 1 only */}
      {isRound1 && !hasConfirmedThisRound && (
        <div className="mb-2 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-start gap-1.5">
          <span className="text-[10px] mt-0.5 flex-shrink-0">🔐</span>
          <p className="text-[9px] text-white/35 leading-relaxed">
            {isInitiator
              ? 'You speak first — the approver verifies your identity before seeing the action.'
              : 'Requester speaks first so you can verify their identity before approving anything.'}
          </p>
        </div>
      )}
      {isRound2 && !hasConfirmedThisRound && (
        <div className="mb-2 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-start gap-1.5">
          <span className="text-[10px] mt-0.5 flex-shrink-0">🔄</span>
          <p className="text-[9px] text-white/35 leading-relaxed">
            {isInitiator
              ? 'Now the approver proves their identity to you — neither party trusts the other until both rounds pass.'
              : 'Now you prove your identity back — mutual verification in both directions.'}
          </p>
        </div>
      )}

      {/* Challenge word display */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Speaker/Listener icon */}
        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-3 mx-auto transition-all duration-500 ${
          hasConfirmedThisRound
            ? 'border-[#00C9B1] bg-[#00C9B1]/10'
            : isSpeaker
              ? 'border-amber-400/50 bg-amber-400/5 hvl-pulse-ring'
              : 'border-[#00C9B1]/40 bg-[#00C9B1]/5 hvl-pulse-ring'
        }`}>
          {hasConfirmedThisRound ? (
            <CheckCircle2 size={18} className="text-[#00C9B1]" />
          ) : isSpeaker ? (
            <Mic size={16} className="text-amber-400" />
          ) : (
            <Ear size={16} className="text-[#00C9B1]/70" />
          )}
        </div>

        {/* Role label */}
        {!hasConfirmedThisRound && (
          <p className={`text-[9px] uppercase tracking-widest mb-3 font-semibold ${
            isSpeaker ? 'text-amber-400/70' : 'text-[#00C9B1]/60'
          }`}>
            {isSpeaker ? '🎙 You speak' : '👂 You listen'}
          </p>
        )}

        {/* The word */}
        {!hasConfirmedThisRound && (
          <div className="mb-2">
            <p className="text-[9px] uppercase tracking-widest text-white/25 mb-2">
              {isSpeaker ? 'Say this word:' : 'You will hear:'}
            </p>
            <ChallengeWord word={word} delay={200} />
          </div>
        )}

        {/* Instruction */}
        {!hasConfirmedThisRound && (
          <p className="text-[9px] text-white/30 px-3 leading-relaxed mt-2">
            {instruction}
          </p>
        )}

        {/* Confirmed — waiting state */}
        {hasConfirmedThisRound && !otherConfirmedThisRound && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] text-[#00C9B1] font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Confirmed ✓
            </p>
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <div className="w-3 h-3 border border-white/20 rounded-full border-t-[#00C9B1] animate-spin" />
              Waiting for {otherUser?.name?.split(' ')[0]}...
            </div>
          </div>
        )}

        {/* Both confirmed this round — transitioning */}
        {hasConfirmedThisRound && otherConfirmedThisRound && isRound1 && (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 size={20} className="text-[#00C9B1]" />
            <p className="text-[10px] text-[#00C9B1] font-semibold">Round 1 complete</p>
            <p className="text-[9px] text-white/30">Starting Round 2...</p>
          </div>
        )}
      </div>

      {/* Confirm button + Reject option */}
      {!hasConfirmedThisRound && (() => {
        const speakerLocked = isSpeaker && !otherConfirmedThisRound;
        return (
          <div className="flex-shrink-0 space-y-1.5">
            {/* Confirm button */}
            <button
              onClick={() => !speakerLocked && confirmChallenge(role)}
              disabled={speakerLocked}
              className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                speakerLocked
                  ? 'bg-white/[0.06] text-white/20 cursor-not-allowed border border-white/[0.08]'
                  : isSpeaker
                    ? 'bg-amber-400 text-[#0A1628] hover:bg-amber-300'
                    : 'bg-[#00C9B1] text-[#0A1628] hover:bg-[#00B8A2] hvl-teal-glow'
              }`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {isSpeaker ? <Mic size={14} /> : <Ear size={14} />}
              {buttonLabel}
            </button>
            {speakerLocked && (
              <p className="text-[9px] text-white/25 text-center">
                Waiting for {otherUser?.name?.split(' ')[0]} to confirm first...
              </p>
            )}
            {/* Reject dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRejectMenu(v => !v)}
                className="w-full py-2 rounded-xl border border-red-400/20 text-red-400/60 text-[10px] font-medium hover:border-red-400/40 hover:text-red-400/80 transition-all flex items-center justify-center gap-1.5"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <XCircle size={11} />
                Something wrong? Reject session
                <ChevronDown size={10} className={`transition-transform ${showRejectMenu ? 'rotate-180' : ''}`} />
              </button>
              {showRejectMenu && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-[#0F1E35] border border-red-400/20 rounded-xl overflow-hidden shadow-xl z-10">
                  <p className="text-[9px] uppercase tracking-widest text-red-400/50 px-3 pt-2.5 pb-1 font-medium">Select reason</p>
                  {REJECT_REASONS.map(reason => (
                    <button
                      key={reason}
                      onClick={() => { setShowRejectMenu(false); rejectSession(role); }}
                      className="w-full text-left px-3 py-2 text-[10px] text-white/60 hover:bg-red-400/10 hover:text-red-400 transition-colors"
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
