/**
 * HVL — "Clinical Trust" Design System
 * VerifyScreen: The core Live Verification Session screen.
 * Shows the session setup form for the initiator's phone.
 * The split-screen demo is handled by the parent SplitDemoView.
 */
import { useState } from 'react';
import { Shield, ChevronDown, DollarSign, Zap } from 'lucide-react';
import { useLiveLock, TeamMember, SessionPurpose, TEAM_MEMBERS } from '@/contexts/LiveLockContext';

const PURPOSES: SessionPurpose[] = [
  'Wire Transfer',
  'Invoice Approval',
  'Bank Detail Change',
  'Closing Instructions',
  'Payment Authorization',
  'Contract Execution',
];

export default function VerifyScreen() {
  const { initiateSession, currentUser, activeSession } = useLiveLock();
  const [selectedPeer, setSelectedPeer] = useState<TeamMember | null>(null);
  const [selectedPurpose, setSelectedPurpose] = useState<SessionPurpose | null>(null);
  const [amount, setAmount] = useState('');
  const [showPeerPicker, setShowPeerPicker] = useState(false);
  const [showPurposePicker, setShowPurposePicker] = useState(false);

  const peers = TEAM_MEMBERS.filter(m => m.id !== currentUser.id && m.status !== 'offline');

  const canInitiate = selectedPeer && selectedPurpose;

  const handleInitiate = () => {
    if (!selectedPeer || !selectedPurpose) return;
    initiateSession(selectedPeer.id, selectedPurpose, amount ? `$${amount}` : undefined);
  };

  if (activeSession) {
    // Session is active — the split-screen demo takes over
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <h2 className="text-base font-semibold text-white mb-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          New Verification
        </h2>
        <p className="text-xs text-white/40">Verify a teammate before a high-risk action</p>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Step 1: Select teammate */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-medium block mb-2">
            1 · Select Teammate
          </label>
          <button
            onClick={() => { setShowPeerPicker(!showPeerPicker); setShowPurposePicker(false); }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
          >
            {selectedPeer ? (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-xs font-bold text-white/80">
                  {selectedPeer.initials}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{selectedPeer.name}</p>
                  <p className="text-[10px] text-white/40">{selectedPeer.role}</p>
                </div>
              </div>
            ) : (
              <span className="text-sm text-white/30">Choose who to verify with...</span>
            )}
            <ChevronDown size={14} className={`text-white/40 transition-transform ${showPeerPicker ? 'rotate-180' : ''}`} />
          </button>

          {showPeerPicker && (
            <div className="mt-1 rounded-xl bg-[#0D1E35] border border-white/[0.08] overflow-hidden animate-fade-in-up">
              {peers.map(peer => (
                <button
                  key={peer.id}
                  onClick={() => { setSelectedPeer(peer); setShowPeerPicker(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.05] transition-colors border-b border-white/[0.04] last:border-0"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-xs font-bold text-white/80">
                    {peer.initials}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{peer.name}</p>
                    <p className="text-[10px] text-white/40">{peer.role}</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${peer.status === 'online' ? 'bg-green-400' : 'bg-amber-400'}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Select purpose */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-medium block mb-2">
            2 · Action Purpose
          </label>
          <button
            onClick={() => { setShowPurposePicker(!showPurposePicker); setShowPeerPicker(false); }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
          >
            {selectedPurpose ? (
              <span className="text-sm font-medium text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{selectedPurpose}</span>
            ) : (
              <span className="text-sm text-white/30">Select action type...</span>
            )}
            <ChevronDown size={14} className={`text-white/40 transition-transform ${showPurposePicker ? 'rotate-180' : ''}`} />
          </button>

          {showPurposePicker && (
            <div className="mt-1 rounded-xl bg-[#0D1E35] border border-white/[0.08] overflow-hidden animate-fade-in-up">
              {PURPOSES.map(p => (
                <button
                  key={p}
                  onClick={() => { setSelectedPurpose(p); setShowPurposePicker(false); }}
                  className="w-full text-left px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.05] transition-colors border-b border-white/[0.04] last:border-0"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 3: Amount (optional) */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/30 font-medium block mb-2">
            3 · Amount <span className="text-white/20 normal-case tracking-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.05] border border-white/[0.08] focus-within:border-[#00C9B1]/40 transition-colors">
            <DollarSign size={14} className="text-white/30 flex-shrink-0" />
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"
              style={{ fontFamily: 'Space Mono, monospace' }}
            />
          </div>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#00C9B1]/5 border border-[#00C9B1]/10">
          <Zap size={12} className="text-[#00C9B1] mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-white/40 leading-relaxed">
            A one-time challenge phrase will be generated. Both parties must confirm the same phrase to complete verification.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 py-4 border-t border-white/5">
        <button
          onClick={handleInitiate}
          disabled={!canInitiate}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            canInitiate
              ? 'bg-[#00C9B1] text-[#0A1628] hover:bg-[#00B8A2] active:scale-[0.98] hvl-teal-glow'
              : 'bg-white/[0.06] text-white/20 cursor-not-allowed'
          }`}
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          <Shield size={16} />
          Start Verification Session
        </button>
      </div>
    </div>
  );
}
