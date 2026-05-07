/**
 * LiveLock — Settings Page (/app/settings)
 * Manage passkeys, display name, and account info.
 */
import { useState } from "react";
import { Shield, Plus, Trash2, Smartphone, Monitor, Key, User, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { startRegistration } from "@simplewebauthn/browser";

export default function Settings() {
  const { data: user, refetch: refetchUser } = trpc.auth.me.useQuery();
  const { data: credentials, refetch: refetchCreds } = trpc.webauthn.listCredentials.useQuery();
  const deleteCredMutation = trpc.webauthn.deleteCredential.useMutation({ onSuccess: () => refetchCreds() });
  const regOptionsMutation = trpc.webauthn.registrationOptions.useMutation();
  const verifyRegMutation = trpc.webauthn.verifyRegistration.useMutation({ onSuccess: () => { refetchCreds(); refetchUser(); } });
  // Display name update: handled inline (no dedicated procedure yet)

  const [addingKey, setAddingKey] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? user?.name ?? "");
  const [nameError, setNameError] = useState("");

  const handleAddPasskey = async () => {
    if (!user?.email) return;
    setAddingKey(true);
    try {
      const result = await regOptionsMutation.mutateAsync({ email: user.email, displayName: user.displayName ?? user.name ?? user.email });
      const response = await startRegistration({ optionsJSON: result.options });
      await verifyRegMutation.mutateAsync({
        userId: result.userId,
        response,
        deviceName: deviceName || undefined,
      });
      setDeviceName("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add passkey";
      if (!msg.includes("cancelled") && !msg.includes("abort")) {
        alert(msg);
      }
    } finally {
      setAddingKey(false);
    }
  };

  const handleDeleteCred = async (credentialId: string) => {
    if ((credentials?.length ?? 0) <= 1) {
      alert("You cannot remove your only passkey. Add another device first.");
      return;
    }
    if (!confirm("Remove this passkey? You will no longer be able to sign in from this device.")) return;
    await deleteCredMutation.mutateAsync({ credentialId });
  };

  const getDeviceIcon = (attachment?: string | null) => {
    if (attachment === "platform") return <Smartphone size={14} className="text-[#00C9B1]" />;
    if (attachment === "cross-platform") return <Key size={14} className="text-violet-400" />;
    return <Monitor size={14} className="text-white/40" />;
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-1">Settings</p>
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Account & Security</h1>
        <p className="text-xs text-white/40 mt-1">Manage your passkeys and profile.</p>
      </div>

      {/* Profile section */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] mb-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={14} className="text-white/40" />
          <p className="text-sm font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Profile</p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-white/30 mb-1">Email</p>
            <p className="text-sm text-white/60">{user?.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-white/30 mb-1">Display Name</p>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={e => { setDisplayName(e.target.value); setNameError(""); }}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white focus:outline-none focus:border-[#00C9B1]/40 transition-all"
                  style={{ fontFamily: "Space Grotesk, sans-serif" }}
                  maxLength={100}
                />
                <Button
                  size="sm"
                  className="bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold"
                  onClick={async () => {
                    if (!displayName.trim()) { setNameError("Name cannot be empty"); return; }
                    // Display name update would go here via a dedicated procedure
                    setEditingName(false);
                  }}
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" className="border-white/[0.08] text-white/40" onClick={() => setEditingName(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-white/70">{user?.displayName ?? user?.name ?? "—"}</p>
                <button
                  onClick={() => { setDisplayName(user?.displayName ?? user?.name ?? ""); setEditingName(true); }}
                  className="text-[10px] text-[#00C9B1]/60 hover:text-[#00C9B1] transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
            {nameError && <p className="text-[10px] text-red-400 mt-1">{nameError}</p>}
          </div>
        </div>
      </div>

      {/* Passkeys section */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-[#00C9B1]" />
            <p className="text-sm font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Passkeys</p>
          </div>
          <span className="text-[10px] text-white/30">{credentials?.length ?? 0} device{(credentials?.length ?? 0) !== 1 ? "s" : ""}</span>
        </div>

        {/* Existing passkeys */}
        {credentials && credentials.length > 0 ? (
          <div className="space-y-2 mb-4">
            {credentials.map(cred => (
              <div key={cred.credentialId} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  {getDeviceIcon(cred.authenticatorAttachment)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                    {cred.deviceName}
                  </p>
                  <p className="text-[10px] text-white/25">
                    Added {new Date(cred.createdAt).toLocaleDateString()} · Last used {new Date(cred.lastUsedAt).toLocaleDateString()}
                  </p>
                </div>
                {cred.userVerified && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex-shrink-0">
                    <CheckCircle2 size={9} className="text-[#00C9B1]" />
                    <span className="text-[9px] text-[#00C9B1]">Biometric</span>
                  </div>
                )}
                <button
                  onClick={() => handleDeleteCred(cred.credentialId)}
                  disabled={deleteCredMutation.isPending}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
                  title="Remove passkey"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.02] text-center mb-4">
            <p className="text-xs text-white/30">No passkeys registered yet.</p>
          </div>
        )}

        {/* Add new passkey */}
        <div className="space-y-2">
          <input
            type="text"
            value={deviceName}
            onChange={e => setDeviceName(e.target.value)}
            placeholder="Device name (e.g. iPhone 16 Pro)"
            maxLength={100}
            className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00C9B1]/40 transition-all"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          />
          <Button
            onClick={handleAddPasskey}
            disabled={addingKey || regOptionsMutation.isPending || verifyRegMutation.isPending}
            className="w-full bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white/70 hover:text-white"
            variant="outline"
          >
            <Plus size={14} className="mr-2" />
            {addingKey ? "Waiting for biometric…" : "Add New Passkey"}
          </Button>
        </div>

        <p className="text-[10px] text-white/20 mt-3 leading-relaxed">
          Passkeys use your device's biometric sensor (Face ID, Touch ID, Windows Hello) to sign in. The private key never leaves your device.
        </p>
      </div>
    </div>
  );
}
