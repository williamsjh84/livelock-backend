/**
 * LiveLock — Team Management Page (/app/team)
 * Create team, invite members, view roster, remove members.
 */
import { useState } from "react";
import { Users, UserPlus, Crown, Shield, Copy, Check, Trash2, Clock, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function Team() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: teamData, refetch } = trpc.teams.getMyTeam.useQuery();
  const createTeamMutation = trpc.teams.create.useMutation({ onSuccess: () => refetch() });
  const inviteMutation = trpc.teams.inviteMember.useMutation({ onSuccess: () => refetch() });
  const removeMutation = trpc.teams.removeMember.useMutation({ onSuccess: () => refetch() });
  const cancelInviteMutation = trpc.teams.cancelInvite.useMutation({ onSuccess: () => refetch() });

  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    try {
      await createTeamMutation.mutateAsync({ name: teamName.trim() });
      setTeamName("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create team");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const result = await inviteMutation.mutateAsync({
        email: inviteEmail.trim(),
        origin: window.location.origin,
      });
      setInviteUrl(result.inviteUrl);
      setEmailSent(result.emailSent ?? false);
      setInviteEmail("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to send invite");
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelInvite = async (inviteId: number) => {
    if (!confirm("Cancel this invite? The link will stop working immediately.")) return;
    setCancellingId(inviteId);
    try {
      await cancelInviteMutation.mutateAsync({ inviteId });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel invite");
    } finally {
      setCancellingId(null);
    }
  };

  const handleRemove = async (userId: number) => {
    if (!confirm("Remove this member from your team?")) return;
    setRemovingId(userId);
    try {
      await removeMutation.mutateAsync({ userId });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  };

  // ── No team yet ────────────────────────────────────────────────────────────

  if (!teamData) {
    return (
      <div className="p-6 max-w-sm mx-auto">
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-1">Team</p>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Create Your Team</h1>
          <p className="text-xs text-white/40 mt-1">Set up a trusted network of colleagues who can verify each other.</p>
        </div>

        <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mb-4">
            <Users size={18} className="text-[#00C9B1]" />
          </div>
          <p className="text-sm font-bold text-white mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>No team yet</p>
          <p className="text-xs text-white/40 mb-4">Create a team to start inviting colleagues and verifying identities.</p>

          <input
            type="text"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="Team name (e.g. Finance Team)"
            maxLength={200}
            className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00C9B1]/40 mb-3 transition-all"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
            onKeyDown={e => e.key === "Enter" && handleCreateTeam()}
          />
          <Button
            onClick={handleCreateTeam}
            disabled={!teamName.trim() || createTeamMutation.isPending}
            className="w-full bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold"
          >
            Create Team
          </Button>
        </div>
      </div>
    );
  }

  const { team, members, pendingInvites, isOwner } = teamData;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-1">Team</p>
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{team.name}</h1>
        <p className="text-xs text-white/40 mt-1">{members.length} member{members.length !== 1 ? "s" : ""} · Created {new Date(team.createdAt).toLocaleDateString()}</p>
      </div>

      {/* Invite section (owner only) */}
      {isOwner && (
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] mb-5">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus size={15} className="text-[#00C9B1]" />
            <p className="text-sm font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Invite a Teammate</p>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00C9B1]/40 transition-all"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
              onKeyDown={e => e.key === "Enter" && handleInvite()}
            />
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviteMutation.isPending}
              className="bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold px-4"
            >
              Invite
            </Button>
          </div>

          {inviteUrl && (
            <div className="mt-3 p-3 rounded-xl border border-[#00C9B1]/20 bg-[#00C9B1]/5">
              <div className="flex items-center gap-1.5 mb-1.5">
                {emailSent ? (
                  <><Check size={11} className="text-[#00C9B1]" /><p className="text-[10px] text-[#00C9B1]/70">Invite email sent! Share this link as a backup:</p></>
                ) : (
                  <><AlertTriangle size={11} className="text-amber-400" /><p className="text-[10px] text-amber-400/80">Email not sent — share this link manually:</p></>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-white/50 truncate flex-1 font-mono">{inviteUrl}</p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#00C9B1]/10 hover:bg-[#00C9B1]/20 text-[#00C9B1] text-[10px] transition-colors flex-shrink-0"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending invites */}
      {isOwner && pendingInvites.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Pending Invites</p>
          <div className="space-y-2">
            {pendingInvites.map(invite => (
              <div key={invite.id} className="flex items-center gap-3 p-3 rounded-xl border border-amber-400/10 bg-amber-400/5">
                <Clock size={14} className="text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/70">{invite.email}</p>
                  <p className="text-[10px] text-white/30">Expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
                </div>
                <span className="text-[9px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">Pending</span>
                <button
                  onClick={() => handleCancelInvite(invite.id)}
                  disabled={cancellingId === invite.id}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
                  title="Cancel invite"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member roster */}
      <div>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Members</p>
        <div className="space-y-2">
          {members.map(member => {
            const isMe = member.userId === user?.id;
            const memberDisplayName = member.displayName || member.name || member.email || "Unknown";
            const initials = memberDisplayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

            return (
              <div
                key={member.userId}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white/50">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                      {memberDisplayName}
                      {isMe && <span className="text-[10px] text-white/30 ml-1">(you)</span>}
                    </p>
                    {member.role === "owner" && (
                      <Crown size={11} className="text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-white/30 truncate">{member.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {member.hasPasskey ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00C9B1]/10 border border-[#00C9B1]/20">
                      <Shield size={9} className="text-[#00C9B1]" />
                      <span className="text-[9px] text-[#00C9B1]">Passkey</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                      <AlertTriangle size={9} className="text-amber-400" />
                      <span className="text-[9px] text-amber-400">No Passkey</span>
                    </div>
                  )}
                  {isOwner && !isMe && (
                    <button
                      onClick={() => handleRemove(member.userId)}
                      disabled={removingId === member.userId}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
