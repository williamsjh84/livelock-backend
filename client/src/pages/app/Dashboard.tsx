/**
 * LiveLock — Dashboard Page (/app/dashboard)
 * Shows stats, quick-verify CTA, and recent session activity.
 */
import { ShieldCheck, Users, Clock, AlertTriangle, ArrowRight, CheckCircle2, XCircle, Timer } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
      <p className="text-xs text-white/40 mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{label}</p>
      <p className={`text-2xl font-bold ${color}`} style={{ fontFamily: "Space Grotesk, sans-serif" }}>{value}</p>
      {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    verified: { label: "Verified", color: "text-[#00C9B1] bg-[#00C9B1]/10 border-[#00C9B1]/20", icon: <CheckCircle2 size={11} /> },
    rejected: { label: "Rejected", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: <XCircle size={11} /> },
    expired: { label: "Expired", color: "text-white/30 bg-white/[0.04] border-white/[0.08]", icon: <Timer size={11} /> },
    cancelled: { label: "Cancelled", color: "text-white/30 bg-white/[0.04] border-white/[0.08]", icon: <XCircle size={11} /> },
  };
  const s = map[status] ?? { label: status, color: "text-white/40 bg-white/[0.04] border-white/[0.08]", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${s.color}`}>
      {s.icon}{s.label}
    </span>
  );
}

export default function Dashboard() {
  const { data: teamsData = [] } = trpc.teams.getMyTeam.useQuery();
  const { data: historyData } = trpc.sessions.history.useQuery({ limit: 5, offset: 0 });
  const { data: activeSession } = trpc.sessions.getActive.useQuery();

  const recentSessions = historyData ?? [];
  const hasTeam = teamsData.length > 0;
  // Total unique members across all teams (deduped by userId)
  const allMemberIds = new Set(teamsData.flatMap(t => t.members.map(m => m.userId)));
  const memberCount = allMemberIds.size;
  // Label for the Team Status stat
  const teamStatusSub = !hasTeam
    ? "Create or join a team"
    : teamsData.length === 1
      ? teamsData[0].team.name
      : `${teamsData.length} teams`;
  // Quick-verify is available if any team has >1 member
  const canVerify = teamsData.some(t => t.members.length > 1);
  const verifiedCount = recentSessions.filter(s => s.status === "verified").length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-1">Dashboard</p>
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          Welcome back
        </h1>
        <p className="text-xs text-white/40 mt-1">Your verification activity at a glance.</p>
      </div>

      {/* Active session alert */}
      {activeSession && (
        <Link href="/app/verify">
          <div className="mb-5 p-4 rounded-2xl border border-[#00C9B1]/30 bg-[#00C9B1]/5 flex items-center gap-3 cursor-pointer hover:bg-[#00C9B1]/10 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-[#00C9B1]/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={16} className="text-[#00C9B1] animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#00C9B1]" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Active Session</p>
              <p className="text-xs text-white/50">A verification session is in progress — tap to continue</p>
            </div>
            <ArrowRight size={16} className="text-[#00C9B1]/60 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Team Members" value={memberCount} sub="in your trusted network" color="text-white" />
        <StatCard label="Recent Verified" value={verifiedCount} sub="of last 5 sessions" color="text-[#00C9B1]" />
        <StatCard
          label="Team Status"
          value={hasTeam ? "Active" : "No Team"}
          sub={teamStatusSub}
          color={hasTeam ? "text-[#00C9B1]" : "text-amber-400"}
        />
      </div>

      {/* Quick Verify CTA */}
      <div className="mb-6">
        {canVerify ? (
          <Link href="/app/verify">
            <div className="p-5 rounded-2xl border border-[#00C9B1]/20 bg-[#00C9B1]/5 hover:bg-[#00C9B1]/10 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center shadow-lg shadow-[#00C9B1]/20">
                  <ShieldCheck size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Start Verification</p>
                  <p className="text-xs text-white/40">Verify a teammate's identity in under 10 seconds</p>
                </div>
                <ArrowRight size={16} className="text-white/30 group-hover:text-[#00C9B1] transition-colors" />
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/app/team">
            <div className="p-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 hover:bg-amber-400/10 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                    {!hasTeam ? "Create Your Team" : "Invite Teammates"}
                  </p>
                  <p className="text-xs text-white/40">
                    {!hasTeam
                      ? "Set up a team to start verifying identities"
                      : "You need at least one other member to start verifying"}
                  </p>
                </div>
                <ArrowRight size={16} className="text-white/30 group-hover:text-amber-400 transition-colors" />
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Recent sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Recent Sessions</p>
          <Link href="/app/audit">
            <span className="text-[10px] text-[#00C9B1]/60 hover:text-[#00C9B1] cursor-pointer">View all →</span>
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <div className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] text-center">
            <ShieldCheck size={24} className="text-white/10 mx-auto mb-2" />
            <p className="text-xs text-white/30">No sessions yet. Start your first verification above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSessions.map(session => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/70 truncate">
                    {session.isInitiator ? "You verified →" : "← Verified by"} User #{session.isInitiator ? session.responderId : session.initiatorId}
                  </p>
                  {session.actionContext && (
                    <p className="text-[10px] text-white/30 truncate mt-0.5">{session.actionContext}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={session.status} />
                  <span className="text-[10px] text-white/20 hidden sm:block">
                    {session.completedAt ? new Date(session.completedAt).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works reminder */}
      <div className="mt-6 p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <p className="text-[10px] uppercase tracking-widest text-white/20 mb-2">How Verification Works</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { step: "1", label: "You initiate", desc: "Pick a teammate and say the word shown" },
            { step: "2", label: "They confirm", desc: "They pick the word they heard from 3 options" },
            { step: "3", label: "Both verified", desc: "Identity confirmed — proceed with the action" },
          ].map(({ step, label, desc }) => (
            <div key={step}>
              <div className="w-6 h-6 rounded-full bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-1.5">
                <span className="text-[10px] font-bold text-[#00C9B1]">{step}</span>
              </div>
              <p className="text-[10px] font-semibold text-white/60 mb-0.5">{label}</p>
              <p className="text-[9px] text-white/25 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
