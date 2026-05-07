/**
 * LiveLock — "Clinical Trust" Design System
 * PhoneFrame: Renders a realistic iOS-style phone frame.
 * Used for both the Initiator and Approver panels in the split-screen demo.
 */
import { Shield, Users, ClipboardList, Wifi, Battery } from 'lucide-react';
import { useLiveLock } from '@/contexts/LiveLockContext';

interface PhoneFrameProps {
  label: string;
  userName: string;
  userInitials: string;
  userRole: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
  isLive?: boolean;
}

function getCurrentTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function PhoneFrame({
  label,
  userName,
  userInitials,
  userRole,
  activeTab,
  onTabChange,
  children,
  isLive = false,
}: PhoneFrameProps) {
  const tabs = [
    { id: 'verify', icon: Shield, label: 'Verify' },
    { id: 'network', icon: Users, label: 'Network' },
    { id: 'log', icon: ClipboardList, label: 'Log' },
  ];

  return (
    <div className="flex flex-col items-center">
      {/* Label above phone */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00C9B1]/30 to-[#0077B6]/30 border border-[#00C9B1]/30 flex items-center justify-center text-[9px] font-bold text-[#00C9B1]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {userInitials}
        </div>
        <div>
          <p className="text-xs font-semibold text-white/80 leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{userName}</p>
          <p className="text-[9px] text-white/30 mt-0.5">{userRole} · {label}</p>
        </div>
        {isLive && (
          <span className="flex items-center gap-1 text-[9px] font-semibold text-[#00C9B1] bg-[#00C9B1]/10 border border-[#00C9B1]/20 px-1.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C9B1] animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Phone body */}
      <div className="phone-frame w-[220px] flex flex-col" style={{ height: '580px' }}>
        {/* Status bar */}
        <div className="phone-status-bar flex-shrink-0">
          <span>{getCurrentTime()}</span>
          <div className="flex items-center gap-1">
            <Wifi size={9} className="text-white/60" />
            <Battery size={11} className="text-white/60" />
          </div>
        </div>

        {/* App header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05] flex-shrink-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center">
            <Shield size={10} className="text-white" />
          </div>
          <span className="text-xs font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>LiveLock</span>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>

        {/* Bottom nav */}
        <div className="phone-nav-bar flex-shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
                  isActive ? 'text-[#00C9B1]' : 'text-white/30 hover:text-white/50'
                }`}
              >
                <Icon size={14} />
                <span className="text-[9px] font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
