/**
 * LiveLock — Team Management Page (/app/team)
 * Supports multiple teams per user.
 */
import { useState } from "react";
import { Users, UserPlus, Crown, Shield, Copy, Check, Trash2, Clock, AlertTriangle, Plus, ChevronDown, ChevronUp, X, Mail, Phone, Briefcase, Calendar, Settings, Download, ShieldAlert, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

type MemberProfile = {
  userId: number;
  displayName: string | null;
  name: string | null;
  email: string | null;
  title?: string | null;
  phone?: string | null;
  role: string;
  hasPasskey: boolean;
  joinedAt: Date;
};

export default function Team() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: teamsData = [], refetch } = trpc.teams.getMyTeam.useQuery();
  const createTeamMutation = trpc.teams.create.useMutation({ onSuccess: () => refetch() });
  const inviteMutation = trpc.teams.inviteMember.useMutation();
  const removeMutation = trpc.teams.removeMember.useMutation({ onSuccess: () => refetch() });
  const cancelInviteMutation = trpc.teams.cancelInvite.useMutation({ onSuccess: () => refetch() });
  const deleteTeamMutation = trpc.teams.deleteTeam.useMutation({ onSuccess: () => refetch() });
  const leaveTeamMutation = trpc.teams.leaveTeam.useMutation({ onSuccess: () => refetch() });

  const [newTeamName, setNewTeamName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [inviteState, setInviteState] = useState<Record<number, { email: string; url: string | null; emailSent: boolean | null }>>({});
  const [copiedTeamId, setCopiedTeamId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Set<number>>(new Set());
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [settingsTeamId, setSettingsTeamId] = useState<number | null>(null);

  const updateSettingsMutation = trpc.teams.updateSettings.useMutation({ onSuccess: () => refetch() });
  const updateRoleMutation = trpc.teams.updateMemberRole.useMutation({ onSuccess: () => refetch() });

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      await createTeamMutation.mutateAsync({ name: newTeamName.trim() });
      setNewTeamName("");
      setShowCreate(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create team");
    }
  };

  const handleInvite = async (teamId: number) => {
    const email = inviteState[teamId]?.email?.trim();
    if (!email) return;
    try {
      const result = await inviteMutation.mutateAsync({ teamId, email, origin: window.location.origin });
      setInviteState(s => ({ ...s, [teamId]: { email: "", url: result.inviteUrl, emailSent: result.emailSent ?? false } }));
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to send invite");
    }
  };

  const handleCopyInvite = async (teamId: number) => {
    const url = inviteState[teamId]?.url;
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedTeamId(teamId);
    setTimeout(() => setCopiedTeamId(null), 2000);
  };

  const handleRemove = async (teamId: number, userId: number) => {
    if (!confirm("Remove this member from the team?")) return;
    setRemovingId(userId);
    try {
      await removeMutation.mutateAsync({ teamId, userId });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  };

  const handleCancelInvite = async (teamId: number, inviteId: number) => {
    if (!confirm("Cancel this invite? The link will stop working immediately.")) return;
    setCancellingId(inviteId);
    try {
      await cancelInviteMutation.mutateAsync({ teamId, inviteId });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to cancel invite");
    } finally {
      setCancellingId(null);
    }
  };

  const handleDeleteTeam = async (teamId: number, teamName: string) => {
    if (!confirm(`Delete "${teamName}"? This will remove all members and cannot be undone.`)) return;
    try {
      await deleteTeamMutation.mutateAsync({ teamId });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete team");
    }
  };

  const handleExportAudit = (teamId: number) => {
    window.open(`/api/audit/export/${teamId}`, "_blank");
  };

  const handleToggleBiometric = async (teamId: number, current: boolean) => {
    await updateSettingsMutation.mutateAsync({ teamId, requireBiometric: !current });
  };

  const handleRoleChange = async (teamId: number, userId: number, newRole: "admin" | "member") => {
    await updateRoleMutation.mutateAsync({ teamId, userId, role: newRole });
  };

  const handleLeaveTeam = async (teamId: number, teamName: string) => {
    if (!confirm(`Leave "${teamName}"?`)) return;
    try {
      await leaveTeamMutation.mutateAsync({ teamId });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to leave team");
    }
  };

  const toggleCollapse = (teamId: number) => {
    setCollapsedTeams(s => {
      const next = new Set(s);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      return next;
    });
  };

  const font = { fontFamily: "Space Grotesk, sans-serif" };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-1">Teams</p>
          <h1 className="text-xl font-bold text-white" style={font}>My Teams</h1>
          <p className="text-xs text-white/40 mt-1">{teamsData.length} team{teamsData.length !== 1 ? "s" : ""}</p>
        </div>
        <Button
          onClick={() => setShowCreate(v => !v)}
          className="flex items-center gap-1.5 bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold text-xs px-3 py-2"
        >
          <Plus size={13} /> New Team
        </Button>
      </div>

      {/* Create team form */}
      {showCreate && (
        <div className="p-5 rounded-2xl border border-[#00C9B1]/20 bg-[#00C9B1]/5 mb-5">
          <p className="text-sm font-bold text-white mb-3" style={font}>Create a New Team</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              placeholder="Team name (e.g. Finance Team)"
              maxLength={200}
              className="flex-1 px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00C9B1]/40 transition-all"
              style={font}
              onKeyDown={e => e.key === "Enter" && handleCreateTeam()}
              autoFocus
            />
            <Button
              onClick={handleCreateTeam}
              disabled={!newTeamName.trim() || createTeamMutation.isPending}
              className="bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold px-4"
            >
              Create
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="border-white/[0.12] text-white/40 px-4">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {teamsData.length === 0 && !showCreate && (
        <div className="p-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
            <Users size={20} className="text-[#00C9B1]" />
          </div>
          <p className="text-sm font-bold text-white mb-1" style={font}>No teams yet</p>
          <p className="text-xs text-white/40 mb-4">Create a team to start inviting colleagues and verifying identities.</p>
          <Button onClick={() => setShowCreate(true)} className="bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold">
            Create Your First Team
          </Button>
        </div>
      )}

      {/* Team cards */}
      <div className="space-y-4">
        {teamsData.map(({ team, members, pendingInvites, isOwner }) => {
          const collapsed = collapsedTeams.has(team.id);
          const invite = inviteState[team.id] ?? { email: "", url: null, emailSent: null };

          return (
            <div key={team.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">

              {/* Team header */}
              <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => toggleCollapse(team.id)} >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00C9B1]/20 to-[#0077B6]/20 border border-[#00C9B1]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#00C9B1]">{team.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white truncate" style={font}>{team.name}</p>
                    {isOwner && <Crown size={11} className="text-amber-400 flex-shrink-0" />}
                  </div>
                  <p className="text-[10px] text-white/30">{members.length} member{members.length !== 1 ? "s" : ""}{pendingInvites.length > 0 ? ` · ${pendingInvites.length} pending` : ""}</p>
                </div>
                {collapsed ? <ChevronDown size={15} className="text-white/30 flex-shrink-0" /> : <ChevronUp size={15} className="text-white/30 flex-shrink-0" />}
                {isOwner && (
                  <button
                    onClick={e => { e.stopPropagation(); setSettingsTeamId(settingsTeamId === team.id ? null : team.id); }}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors flex-shrink-0 ${settingsTeamId === team.id ? "bg-[#00C9B1]/20 text-[#00C9B1]" : "text-white/20 hover:text-white/60 hover:bg-white/[0.06]"}`}
                    title="Team settings"
                  >
                    <Settings size={13} />
                  </button>
                )}
              </div>

              {!collapsed && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06] pt-4">

                  {/* Invite section (owner only) */}
                  {isOwner && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <UserPlus size={13} className="text-[#00C9B1]" />
                        <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Invite</p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={invite.email}
                          onChange={e => setInviteState(s => ({ ...s, [team.id]: { ...invite, email: e.target.value } }))}
                          placeholder="colleague@company.com"
                          className="flex-1 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00C9B1]/40 transition-all"
                          style={font}
                          onKeyDown={e => e.key === "Enter" && handleInvite(team.id)}
                        />
                        <Button
                          onClick={() => handleInvite(team.id)}
                          disabled={!invite.email.trim() || inviteMutation.isPending}
                          className="bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold px-4"
                        >
                          Invite
                        </Button>
                      </div>

                      {invite.url && (
                        <div className="mt-2 p-3 rounded-xl border border-[#00C9B1]/20 bg-[#00C9B1]/5">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {invite.emailSent
                              ? <><Check size={11} className="text-[#00C9B1]" /><p className="text-[10px] text-[#00C9B1]/70">Email sent! Backup link:</p></>
                              : <><AlertTriangle size={11} className="text-amber-400" /><p className="text-[10px] text-amber-400/80">Email failed — share this link:</p></>
                            }
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-white/50 truncate flex-1 font-mono">{invite.url}</p>
                            <button
                              onClick={() => handleCopyInvite(team.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#00C9B1]/10 hover:bg-[#00C9B1]/20 text-[#00C9B1] text-[10px] transition-colors flex-shrink-0"
                            >
                              {copiedTeamId === team.id ? <Check size={11} /> : <Copy size={11} />}
                              {copiedTeamId === team.id ? "Copied!" : "Copy"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pending invites */}
                  {isOwner && pendingInvites.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2">Pending Invites</p>
                      <div className="space-y-1.5">
                        {pendingInvites.map(inv => (
                          <div key={inv.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-amber-400/10 bg-amber-400/5">
                            <Clock size={13} className="text-amber-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white/70">{inv.email}</p>
                              <p className="text-[10px] text-white/30">Expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                            </div>
                            <span className="text-[9px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">Pending</span>
                            <button
                              onClick={() => handleCancelInvite(team.id, inv.id)}
                              disabled={cancellingId === inv.id}
                              className="w-6 h-6 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              title="Cancel invite"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Members */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2">Members</p>
                    <div className="space-y-1.5">
                      {members.map(member => {
                        const isMe = member.userId === user?.id;
                        const displayName = member.displayName || member.name || member.email || "Unknown";
                        const initials = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                        return (
                          <div key={member.userId} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors" onClick={() => setSelectedMember(member as MemberProfile)}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-white/50">{initials}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-medium text-white truncate" style={font}>
                                  {displayName}
                                  {isMe && <span className="text-[10px] text-white/30 ml-1">(you)</span>}
                                </p>
                                {member.role === "owner" && <Crown size={10} className="text-amber-400 flex-shrink-0" />}
                              {member.role === "admin" && <Shield size={10} className="text-[#00C9B1] flex-shrink-0" />}
                              </div>
                              <p className="text-[10px] text-white/30 truncate">{member.email}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {member.hasPasskey
                                ? <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#00C9B1]/10 border border-[#00C9B1]/20"><Shield size={8} className="text-[#00C9B1]" /><span className="text-[9px] text-[#00C9B1]">Passkey</span></div>
                                : <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20"><AlertTriangle size={8} className="text-amber-400" /><span className="text-[9px] text-amber-400">No Passkey</span></div>
                              }
                              {isOwner && !isMe && (
                                <button
                                  onClick={e => { e.stopPropagation(); handleRemove(team.id, member.userId); }}
                                  disabled={removingId === member.userId}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                  title="Remove member"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Admin Settings Panel */}
                  {isOwner && settingsTeamId === team.id && (
                    <div className="p-4 rounded-2xl border border-[#00C9B1]/15 bg-[#00C9B1]/5 space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Settings size={12} className="text-[#00C9B1]" />
                        <p className="text-xs font-bold text-white/70" style={font}>Team Settings</p>
                      </div>

                      {/* Require biometric toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <ShieldAlert size={12} className="text-amber-400" />
                            <p className="text-xs font-semibold text-white/80">Require Passkey</p>
                          </div>
                          <p className="text-[10px] text-white/40">Members without a passkey cannot confirm verifications</p>
                        </div>
                        <button
                          onClick={() => handleToggleBiometric(team.id, (team as any).requireBiometric ?? false)}
                          disabled={updateSettingsMutation.isPending}
                          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 ${(team as any).requireBiometric ? "bg-[#00C9B1]" : "bg-white/[0.10]"} disabled:opacity-50`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${(team as any).requireBiometric ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </div>

                      {/* Role management */}
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-2">Member Roles</p>
                        <div className="space-y-1.5">
                          {members.filter(m => m.userId !== user?.id).map(m => {
                            const name = m.displayName || m.name || m.email || "Unknown";
                            return (
                              <div key={m.userId} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <p className="text-xs text-white/70 flex-1 truncate">{name}</p>
                                {m.role === "owner" ? (
                                  <span className="text-[10px] text-amber-400 font-semibold">Owner</span>
                                ) : (
                                  <select
                                    value={m.role}
                                    onChange={e => handleRoleChange(team.id, m.userId, e.target.value as "admin" | "member")}
                                    className="text-[10px] bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1 text-white/70 focus:outline-none focus:border-[#00C9B1]/40"
                                    style={font}
                                  >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-white/25 mt-1.5">Admins can invite members and view the audit log</p>
                      </div>

                      {/* Audit export */}
                      <button
                        onClick={() => handleExportAudit(team.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        <Download size={12} />
                        Export Audit Log (CSV)
                      </button>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="flex gap-2 pt-1 border-t border-white/[0.06]">
                    {isOwner
                      ? <button onClick={() => handleDeleteTeam(team.id, team.name)} className="text-[11px] text-red-400/60 hover:text-red-400 transition-colors">Delete team</button>
                      : <button onClick={() => handleLeaveTeam(team.id, team.name)} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">Leave team</button>
                    }
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Member Profile Modal ───────────────────────────────────────── */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedMember(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-2xl border border-white/[0.10] bg-[#0D1F38] p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-colors"
            >
              <X size={15} />
            </button>

            {/* Avatar + name */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00C9B1]/20 to-[#0077B6]/20 border border-[#00C9B1]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-[#00C9B1]">
                  {(selectedMember.displayName || selectedMember.name || selectedMember.email || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="text-base font-bold text-white" style={font}>
                  {selectedMember.displayName || selectedMember.name || "Unknown"}
                </p>
                {(selectedMember as any).title && (
                  <p className="text-xs text-[#00C9B1]/80 mt-0.5">{(selectedMember as any).title}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${selectedMember.role === "owner" ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : "text-white/40 bg-white/[0.06] border-white/[0.08]"}`}>
                    {selectedMember.role === "owner" ? "Owner" : "Member"}
                  </span>
                  {selectedMember.hasPasskey && (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full text-[#00C9B1] bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center gap-1">
                      <Shield size={8} /> Passkey
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              {selectedMember.email && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Mail size={14} className="text-white/30 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-white/30">Email</p>
                    <p className="text-sm text-white/80">{selectedMember.email}</p>
                  </div>
                </div>
              )}
              {(selectedMember as any).phone && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Phone size={14} className="text-white/30 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-white/30">Mobile</p>
                    <p className="text-sm text-white/80">{(selectedMember as any).phone}</p>
                  </div>
                </div>
              )}
              {(selectedMember as any).title && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Briefcase size={14} className="text-white/30 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-white/30">Title</p>
                    <p className="text-sm text-white/80">{(selectedMember as any).title}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Calendar size={14} className="text-white/30 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/30">Member Since</p>
                  <p className="text-sm text-white/80">{new Date(selectedMember.joinedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
