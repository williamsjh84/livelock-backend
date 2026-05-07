/**
 * LiveLock — "Clinical Trust" Design System
 * SplitDemoView: The main split-screen demo layout.
 * Shows two phone frames side by side — Initiator (Sarah) and Approver (Marcus).
 * Manages independent tab state for each phone.
 */
import { useState } from 'react';
import { useLiveLock, TEAM_MEMBERS } from '@/contexts/LiveLockContext';
import PhoneFrame from './PhoneFrame';
import VerifyScreen from './VerifyScreen';
import ApproverIdleScreen from './ApproverIdleScreen';
import NetworkScreen from './NetworkScreen';
import AuditScreen from './AuditScreen';
import SessionView from './SessionView';

export default function SplitDemoView() {
  const { activeSession, resetSession } = useLiveLock();
  const [initiatorTab, setInitiatorTab] = useState('verify');
  const [approverTab, setApproverTab] = useState('verify');

  const initiator = TEAM_MEMBERS[0]; // Sarah Chen
  const approver = TEAM_MEMBERS[1];  // Marcus Webb

  const isLive = !!activeSession;

  function renderInitiatorContent(tab: string) {
    if (tab === 'verify') return <VerifyScreen />;
    if (tab === 'network') return <NetworkScreen viewingUserId={initiator.id} />;
    if (tab === 'log') return <AuditScreen />;
    return null;
  }

  function renderApproverContent(tab: string) {
    if (tab === 'verify') return <ApproverIdleScreen />;
    if (tab === 'network') return <NetworkScreen viewingUserId={approver.id} />;
    if (tab === 'log') return <AuditScreen />;
    return null;
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* Demo label */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#00C9B1]/20 w-16" />
        <span className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
          Live Demo — Split Screen Simulation
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#00C9B1]/20 w-16" />
      </div>

      {/* Split screen */}
      <div className="flex items-start justify-center gap-6 w-full">
        {/* Initiator phone */}
        <PhoneFrame
          label="Initiator"
          userName={initiator.name}
          userInitials={initiator.initials}
          userRole={initiator.role}
          activeTab={initiatorTab}
          onTabChange={setInitiatorTab}
          isLive={isLive}
        >
            {isLive && activeSession && initiatorTab === 'verify'
            ? <SessionView role="initiator" session={activeSession} />
            : renderInitiatorContent(initiatorTab)
          }
        </PhoneFrame>

        {/* Center divider */}
        <div className="flex flex-col items-center self-stretch justify-center gap-3 py-8">
          <div className={`w-px flex-1 transition-all duration-500 ${isLive ? 'bg-gradient-to-b from-transparent via-[#00C9B1]/60 to-transparent' : 'bg-white/[0.06]'}`} />
          <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-500 ${
            isLive
              ? 'border-[#00C9B1]/60 bg-[#00C9B1]/10 animate-pulse'
              : 'border-white/10 bg-white/[0.03]'
          }`}>
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isLive ? 'bg-[#00C9B1]' : 'bg-white/20'}`} />
          </div>
          <div className={`w-px flex-1 transition-all duration-500 ${isLive ? 'bg-gradient-to-b from-transparent via-[#00C9B1]/60 to-transparent' : 'bg-white/[0.06]'}`} />
        </div>

        {/* Approver phone */}
        <PhoneFrame
          label="Approver"
          userName={approver.name}
          userInitials={approver.initials}
          userRole={approver.role}
          activeTab={approverTab}
          onTabChange={setApproverTab}
          isLive={isLive}
        >
          {isLive && activeSession && approverTab === 'verify'
            ? <SessionView role="approver" session={activeSession} />
            : renderApproverContent(approverTab)
          }
        </PhoneFrame>
      </div>

      {/* Reset button when session is done */}
      {activeSession && (activeSession.status === 'approved' || activeSession.status === 'rejected') && (
        <button
          onClick={resetSession}
          className="mt-6 px-6 py-2.5 rounded-xl border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          Start New Session
        </button>
      )}

      {/* How it works hint */}
      {!activeSession && (
        <div className="mt-6 max-w-sm text-center">
          <p className="text-[11px] text-white/25 leading-relaxed">
            Use the <span className="text-[#00C9B1]/60">Verify</span> tab on Sarah's phone to initiate a session. Both phones will update in real time.
          </p>
        </div>
      )}
    </div>
  );
}
