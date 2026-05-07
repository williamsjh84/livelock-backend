/**
 * HVL — "Clinical Trust" Design System
 * AuditScreen: Verification history log.
 * Shows timestamped records of all verification sessions.
 */
import { CheckCircle2, XCircle, Clock, Shield, ArrowRight } from 'lucide-react';
import { useLiveLock, AuditEntry } from '@/contexts/LiveLockContext';

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ResultBadge({ result }: { result: AuditEntry['result'] }) {
  const config = {
    verified: { label: 'Verified', color: 'text-green-400 bg-green-400/10 border-green-400/20', icon: CheckCircle2 },
    rejected: { label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: XCircle },
    expired: { label: 'Expired', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: Clock },
  };
  const { label, color, icon: Icon } = config[result];
  return (
    <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
      <Icon size={9} />
      {label}
    </span>
  );
}

export default function AuditScreen() {
  const { auditLog } = useLiveLock();

  const verifiedCount = auditLog.filter(e => e.result === 'verified').length;
  const rejectedCount = auditLog.filter(e => e.result === 'rejected').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5">
        <h2 className="text-base font-semibold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Audit Log
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-green-400 flex items-center gap-1">
            <CheckCircle2 size={10} />
            {verifiedCount} verified
          </span>
          <span className="text-white/20">·</span>
          <span className="text-xs text-red-400 flex items-center gap-1">
            <XCircle size={10} />
            {rejectedCount} rejected
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 px-4 py-3 border-b border-white/5">
        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-center">
          <p className="text-lg font-bold text-[#00C9B1]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{auditLog.length}</p>
          <p className="text-[10px] text-white/40 mt-0.5">Total Sessions</p>
        </div>
        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-center">
          <p className="text-lg font-bold text-green-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {auditLog.length > 0 ? Math.round((verifiedCount / auditLog.length) * 100) : 0}%
          </p>
          <p className="text-[10px] text-white/40 mt-0.5">Approval Rate</p>
        </div>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {auditLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Shield size={24} className="text-white/20 mb-2" />
            <p className="text-sm text-white/30">No verifications yet</p>
          </div>
        ) : (
          auditLog.map((entry, i) => (
            <div
              key={entry.id}
              className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] animate-fade-in-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {entry.purpose}
                    {entry.amount && <span className="text-[#00C9B1] ml-1">{entry.amount}</span>}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-white/40">
                    <span>{entry.initiatorName}</span>
                    <ArrowRight size={8} />
                    <span>{entry.approverName}</span>
                  </div>
                </div>
                <ResultBadge result={entry.result} />
              </div>

              {/* Challenge words */}
              <div className="flex items-center gap-1.5 mb-2">
                {entry.challengeWords.map((word, wi) => (
                  <span
                    key={wi}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-white/50 border border-white/[0.08]"
                  >
                    {word}
                  </span>
                ))}
              </div>

              {/* Timestamp */}
              <p className="text-[10px] text-white/25 font-mono">{timeAgo(entry.timestamp)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
