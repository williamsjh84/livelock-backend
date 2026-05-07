/**
 * LiveLock — "Clinical Trust" Design System
 * ApproverIdleScreen: Shown on Marcus's phone when no session is active.
 * Communicates that he is waiting for a verification request.
 */
import { Bell, Shield, Clock } from 'lucide-react';

export default function ApproverIdleScreen() {
  return (
    <div className="flex flex-col h-full px-4 py-4">
      {/* Header */}
      <div className="px-0 pb-3 border-b border-white/5">
        <h2 className="text-base font-semibold text-white mb-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Awaiting Request
        </h2>
        <p className="text-xs text-white/40">You'll be notified when a teammate needs verification</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
        {/* Idle indicator */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center">
            <Bell size={22} className="text-white/20" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0A1628] border border-white/10 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-amber-400/60" />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-white/50 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            No active session
          </p>
          <p className="text-xs text-white/25 max-w-[160px] leading-relaxed">
            When Sarah initiates a verification, it will appear here instantly.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full mt-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <Shield size={12} className="text-[#00C9B1]/50 flex-shrink-0" />
            <p className="text-[10px] text-white/30">Device verified · Ready</p>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <Clock size={12} className="text-white/20 flex-shrink-0" />
            <p className="text-[10px] text-white/30">Last verified: 2h ago</p>
          </div>
        </div>
      </div>
    </div>
  );
}
