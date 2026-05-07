/**
 * HVL — "Clinical Trust" Design System
 * NetworkScreen: Trusted Team Network view inside the phone frame.
 * Shows connected teammates with status indicators and verification counts.
 */
import { useState } from 'react';
import { UserPlus, Shield, CheckCircle2, Clock, WifiOff } from 'lucide-react';
import { useLiveLock, TeamMember } from '@/contexts/LiveLockContext';
import { toast } from 'sonner';

function StatusDot({ status }: { status: TeamMember['status'] }) {
  const colors = {
    online: 'bg-green-400',
    busy: 'bg-amber-400',
    offline: 'bg-gray-500',
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status]} ring-2 ring-[#0A1628]`} />
  );
}

function StatusLabel({ status }: { status: TeamMember['status'] }) {
  const config = {
    online: { label: 'Online', color: 'text-green-400', icon: CheckCircle2 },
    busy: { label: 'Busy', color: 'text-amber-400', icon: Clock },
    offline: { label: 'Offline', color: 'text-gray-500', icon: WifiOff },
  };
  const { label, color, icon: Icon } = config[status];
  return (
    <span className={`flex items-center gap-1 text-xs ${color}`}>
      <Icon size={10} />
      {label}
    </span>
  );
}

export default function NetworkScreen({ viewingUserId }: { viewingUserId?: string }) {
  const { teamMembers, currentUser } = useLiveLock();
  const [showInvite, setShowInvite] = useState(false);

  const viewingUser = viewingUserId ? (teamMembers.find(m => m.id === viewingUserId) ?? currentUser) : currentUser;
  const peers = teamMembers.filter(m => m.id !== viewingUser.id);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Trusted Network
          </h2>
          <button
            onClick={() => { setShowInvite(true); toast.info('Invite feature coming soon'); }}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[#00C9B1]/10 text-[#00C9B1] hover:bg-[#00C9B1]/20 transition-colors font-medium"
          >
            <UserPlus size={12} />
            Add
          </button>
        </div>
        <p className="text-xs text-white/40">{peers.length} verified teammates</p>
      </div>

      {/* Current user card */}
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2 font-medium">You</p>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {viewingUser.initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 ring-2 ring-[#0A1628]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {viewingUser.name}
            </p>
            <p className="text-xs text-white/40">{viewingUser.role} · This device</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#00C9B1]">
            <Shield size={12} />
            <span className="font-mono">{viewingUser.verificationCount}</span>
          </div>
        </div>
      </div>

      {/* Team list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3 font-medium">Team</p>
        {peers.map((member, i) => (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-all animate-fade-in-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-xs font-bold text-white/80" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {member.initials}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0A1628] ${
                member.status === 'online' ? 'bg-green-400' :
                member.status === 'busy' ? 'bg-amber-400' : 'bg-gray-500'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {member.name}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-white/40">{member.role}</p>
                <span className="text-white/20">·</span>
                <StatusLabel status={member.status} />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-xs text-white/30">
                <Shield size={10} />
                <span className="font-mono text-[10px]">{member.verificationCount}</span>
              </div>
              <span className="text-[9px] text-white/20 font-mono">TRUSTED</span>
            </div>
          </div>
        ))}
      </div>

      {/* Security note */}
      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#00C9B1]/5 border border-[#00C9B1]/10">
          <Shield size={12} className="text-[#00C9B1] mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-white/40 leading-relaxed">
            Each teammate is device-bound. Verification requires physical access to their enrolled device.
          </p>
        </div>
      </div>
    </div>
  );
}
