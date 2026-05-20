/**
 * LiveLock — Audit Log Page (/app/audit)
 * Paginated, filterable, exportable audit log for the team.
 */
import { useState } from "react";
import { ClipboardList, CheckCircle2, XCircle, Timer, UserPlus, UserMinus, Users, Shield, Download, Fingerprint } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

const ACTION_ICONS: Record<string, React.ReactNode> = {
  "session.verified": <CheckCircle2 size={13} className="text-[#00C9B1]" />,
  "session.rejected": <XCircle size={13} className="text-red-400" />,
  "session.expired": <Timer size={13} className="text-amber-400" />,
  "session.initiated": <Shield size={13} className="text-blue-400" />,
  "session.cancelled": <XCircle size={13} className="text-white/30" />,
  "member.invited": <UserPlus size={13} className="text-violet-400" />,
  "member.joined": <UserPlus size={13} className="text-[#00C9B1]" />,
  "member.removed": <UserMinus size={13} className="text-red-400" />,
  "member.left": <UserMinus size={13} className="text-white/40" />,
  "member.invite_cancelled": <XCircle size={13} className="text-amber-400" />,
  "team.created": <Users size={13} className="text-[#00C9B1]" />,
  "team.renamed": <Users size={13} className="text-blue-400" />,
  "team.deleted": <Users size={13} className="text-red-400" />,
};

const ACTION_LABELS: Record<string, string> = {
  "session.verified": "Session Verified",
  "session.rejected": "Session Rejected",
  "session.expired": "Session Expired",
  "session.initiated": "Session Initiated",
  "session.cancelled": "Session Cancelled",
  "member.invited": "Member Invited",
  "member.joined": "Member Joined",
  "member.removed": "Member Removed",
  "member.left": "Member Left",
  "member.invite_cancelled": "Invite Cancelled",
  "team.created": "Team Created",
  "team.renamed": "Team Renamed",
  "team.deleted": "Team Deleted",
};

const ACTION_COLORS: Record<string, string> = {
  "session.verified": "text-[#00C9B1] bg-[#00C9B1]/10 border-[#00C9B1]/20",
  "session.rejected": "text-red-400 bg-red-400/10 border-red-400/20",
  "session.expired": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "session.initiated": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "session.cancelled": "text-white/30 bg-white/[0.04] border-white/[0.08]",
  "member.invited": "text-violet-400 bg-violet-400/10 border-violet-400/20",
  "member.joined": "text-[#00C9B1] bg-[#00C9B1]/10 border-[#00C9B1]/20",
  "member.removed": "text-red-400 bg-red-400/10 border-red-400/20",
  "member.left": "text-white/40 bg-white/[0.04] border-white/[0.08]",
  "member.invite_cancelled": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "team.created": "text-[#00C9B1] bg-[#00C9B1]/10 border-[#00C9B1]/20",
  "team.renamed": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "team.deleted": "text-red-400 bg-red-400/10 border-red-400/20",
};

export default function AuditLog() {
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { data, isLoading } = trpc.audit.getLog.useQuery({ limit, offset });
  const entries = data?.entries ?? [];
  const teamIds = data?.teamIds ?? [];

  const handleExportCsv = () => {
    // Use the server-side export for the first team (includes proper names + biometric status)
    if (teamIds.length > 0) {
      window.open(`/api/audit/export/${teamIds[0]}`, "_blank");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-1">Audit Log</p>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Activity History</h1>
          <p className="text-xs text-white/40 mt-1">Immutable record of all verification sessions and team events.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleExportCsv}
          disabled={entries.length === 0}
          className="border-white/[0.12] text-white/50 hover:text-white flex-shrink-0"
        >
          <Download size={13} className="mr-2" />
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center">
          <ClipboardList size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-sm font-bold text-white/30 mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>No activity yet</p>
          <p className="text-xs text-white/20">Events will appear here once your team starts verifying.</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-2 text-[10px] font-semibold text-white/20 uppercase tracking-wider border-b border-white/[0.04] mb-1">
            <span>Event</span>
            <span>Actor</span>
            <span>Time</span>
          </div>

          <div className="space-y-1">
            {entries.map(entry => {
              const icon = ACTION_ICONS[entry.action] ?? <Shield size={13} className="text-white/30" />;
              const label = ACTION_LABELS[entry.action] ?? entry.action;
              const colorClass = ACTION_COLORS[entry.action] ?? "text-white/40 bg-white/[0.04] border-white/[0.08]";
              let meta: Record<string, unknown> = {};
              try { meta = JSON.parse(entry.metadata ?? "{}"); } catch { /* ignore */ }

              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.04] hover:border-white/[0.08] hover:bg-white/[0.02] transition-all"
                >
                  {/* Icon */}
                  <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${colorClass}`}>
                        {label}
                      </span>
                      {entry.sessionId && (
                        <span className="text-[9px] text-white/20 font-mono">
                          #{entry.sessionId.slice(0, 8)}
                        </span>
                      )}
                      {meta.biometricVerified === true && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-[#00C9B1] bg-[#00C9B1]/10 border border-[#00C9B1]/20">
                          <Fingerprint size={8} /> Biometric
                        </span>
                      )}
                    </div>
                    {/* Metadata summary */}
                    {Object.keys(meta).length > 0 && (
                      <p className="text-[10px] text-white/25 mt-0.5 truncate">
                        {Object.entries(meta)
                          .filter(([k]) => !["initiatorId", "responderId"].includes(k))
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </p>
                    )}
                  </div>

                  {/* Right side */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] text-white/20">Actor #{entry.actorId}</p>
                    <p className="text-[10px] text-white/15">
                      {new Date(entry.createdAt).toLocaleString(undefined, {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.04]">
            <Button
              variant="outline"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="border-white/[0.08] text-white/40 hover:text-white text-xs"
            >
              ← Previous
            </Button>
            <p className="text-xs text-white/20">Showing {offset + 1}–{offset + entries.length}</p>
            <Button
              variant="outline"
              onClick={() => setOffset(offset + limit)}
              disabled={entries.length < limit}
              className="border-white/[0.08] text-white/40 hover:text-white text-xs"
            >
              Next →
            </Button>
          </div>
        </>
      )}

      {/* Hash chain integrity note */}
      <div className="mt-6 p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] flex items-start gap-2">
        <Shield size={12} className="text-white/20 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-white/20 leading-relaxed">
          Each entry is cryptographically chained to the previous one using SHA-256. Any tampering with historical records will break the chain and be detectable.
        </p>
      </div>
    </div>
  );
}
