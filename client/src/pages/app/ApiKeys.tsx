/**
 * LiveLock — API Keys & Webhooks (/app/api)
 * Create and manage API keys, configure webhooks, view docs.
 */
import { useState } from "react";
import { Key, Plus, Trash2, Copy, Check, Webhook, Code2, ChevronDown, ChevronUp, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

const font = { fontFamily: "Space Grotesk, sans-serif" };

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="p-3 rounded-xl bg-black/40 border border-white/[0.06] text-[11px] text-white/70 overflow-x-auto font-mono leading-relaxed">
        {code}
      </pre>
      <button
        onClick={async () => { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.08] text-white/40 hover:text-white text-[10px]"
      >
        {copied ? <Check size={10} className="text-[#00C9B1]" /> : <Copy size={10} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function ApiKeys() {
  const { data: teamsData = [] } = trpc.teams.getMyTeam.useQuery();
  const { data: keys = [], refetch } = trpc.apiKeys.list.useQuery();
  const createMutation = trpc.apiKeys.create.useMutation();
  const updateWebhookMutation = trpc.apiKeys.updateWebhook.useMutation({ onSuccess: () => refetch() });
  const revokeMutation = trpc.apiKeys.revoke.useMutation({ onSuccess: () => refetch() });

  const [newKeyName, setNewKeyName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(teamsData[0]?.team.id ?? null);
  const [createdKey, setCreatedKey] = useState<{ fullKey: string; webhookSecret: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [createError, setCreateError] = useState("");
  const [editingWebhook, setEditingWebhook] = useState<number | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showDocs, setShowDocs] = useState(false);

  const teamId = selectedTeamId ?? teamsData[0]?.team.id;

  const handleCreate = async () => {
    if (!newKeyName.trim()) { setCreateError("Name is required"); return; }
    if (!teamId) { setCreateError("Select a team"); return; }
    setCreateError("");
    try {
      const result = await createMutation.mutateAsync({ name: newKeyName.trim(), teamId });
      setCreatedKey({ fullKey: result.fullKey, webhookSecret: result.webhookSecret });
      setNewKeyName("");
      refetch();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create key");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-1">Developer</p>
        <h1 className="text-xl font-bold text-white" style={font}>API Keys & Webhooks</h1>
        <p className="text-xs text-white/40 mt-1">Embed LiveLock verification into your own applications and workflows.</p>
      </div>

      {/* ── One-time key reveal ──────────────────────────────────────────── */}
      {createdKey && (
        <div className="p-5 rounded-2xl border border-[#00C9B1]/30 bg-[#00C9B1]/5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-amber-400" />
            <p className="text-sm font-bold text-white" style={font}>Save this key — it won't be shown again</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-white/30 mb-1">API Key</p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-black/40 border border-white/[0.08] font-mono text-sm text-[#00C9B1] break-all">
                <span className="flex-1">{createdKey.fullKey}</span>
                <button onClick={async () => { await navigator.clipboard.writeText(createdKey.fullKey); }} className="flex-shrink-0 text-white/40 hover:text-white transition-colors">
                  <Copy size={13} />
                </button>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-white/30 mb-1">Webhook Signing Secret</p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-black/40 border border-white/[0.08] font-mono text-xs text-white/60 break-all">
                <span className="flex-1">{showSecret ? createdKey.webhookSecret : "•".repeat(40)}</span>
                <button onClick={() => setShowSecret(v => !v)} className="flex-shrink-0 text-white/40 hover:text-white transition-colors">
                  {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button onClick={async () => { await navigator.clipboard.writeText(createdKey.webhookSecret); }} className="flex-shrink-0 text-white/40 hover:text-white transition-colors">
                  <Copy size={13} />
                </button>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3 border-white/[0.08] text-white/40" onClick={() => setCreatedKey(null)}>
            I've saved it — dismiss
          </Button>
        </div>
      )}

      {/* ── Create new key ───────────────────────────────────────────────── */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Key size={14} className="text-[#00C9B1]" />
          <p className="text-sm font-bold text-white" style={font}>Create API Key</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={e => { setNewKeyName(e.target.value); setCreateError(""); }}
            placeholder="e.g. Production · Wire Transfer System"
            maxLength={100}
            className="flex-1 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00C9B1]/40 transition-all"
            style={font}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
          />
          {teamsData.length > 1 && (
            <select
              value={selectedTeamId ?? ""}
              onChange={e => setSelectedTeamId(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white focus:outline-none"
              style={font}
            >
              {teamsData.map(({ team }) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          )}
          <Button
            onClick={handleCreate}
            disabled={!newKeyName.trim() || createMutation.isPending}
            className="bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold"
          >
            <Plus size={14} className="mr-1" />
            {createMutation.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
        {createError && <p className="text-[10px] text-red-400 mt-2">{createError}</p>}
      </div>

      {/* ── Existing keys ────────────────────────────────────────────────── */}
      <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Key size={14} className="text-white/40" />
          <p className="text-sm font-bold text-white" style={font}>Active Keys</p>
          <span className="text-[10px] text-white/30 ml-auto">{keys.length} key{keys.length !== 1 ? "s" : ""}</span>
        </div>

        {keys.length === 0 ? (
          <p className="text-xs text-white/30 text-center py-4">No API keys yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {keys.map(k => (
              <div key={k.id} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white" style={font}>{k.name}</p>
                    <p className="text-[10px] text-white/30 font-mono">{k.keyPrefix} · Team #{k.teamId} · Created {new Date(k.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => { if (confirm("Revoke this key? It will stop working immediately.")) revokeMutation.mutate({ keyId: k.id }); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    title="Revoke key"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Webhook config */}
                <div className="flex items-center gap-2">
                  <Webhook size={11} className="text-white/30 flex-shrink-0" />
                  {editingWebhook === k.id ? (
                    <div className="flex gap-2 flex-1">
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={e => setWebhookUrl(e.target.value)}
                        placeholder="https://yourapp.com/webhooks/livelock"
                        className="flex-1 px-2 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#00C9B1]/40"
                      />
                      <button
                        onClick={async () => {
                          await updateWebhookMutation.mutateAsync({ keyId: k.id, webhookUrl: webhookUrl || null });
                          setEditingWebhook(null);
                        }}
                        className="px-2 py-1 rounded-lg bg-[#00C9B1]/20 text-[#00C9B1] text-[10px] font-semibold hover:bg-[#00C9B1]/30"
                      >Save</button>
                      <button onClick={() => setEditingWebhook(null)} className="text-white/30 hover:text-white/60 text-[10px]">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingWebhook(k.id); setWebhookUrl(k.webhookUrl ?? ""); }}
                      className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
                    >
                      {k.webhookUrl ? k.webhookUrl : "Add webhook URL →"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── API Documentation ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <button
          onClick={() => setShowDocs(v => !v)}
          className="w-full p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Code2 size={14} className="text-[#00C9B1]" />
            <p className="text-sm font-bold text-white" style={font}>API Reference</p>
          </div>
          {showDocs ? <ChevronUp size={15} className="text-white/30" /> : <ChevronDown size={15} className="text-white/30" />}
        </button>

        {showDocs && (
          <div className="px-5 pb-5 space-y-6 border-t border-white/[0.06] pt-4">
            <p className="text-xs text-white/50">Base URL: <span className="font-mono text-white/70">https://livelock.io/api/v1</span></p>
            <p className="text-xs text-white/50">Authentication: <span className="font-mono text-white/70">Authorization: Bearer sk_live_xxx</span></p>

            {/* Initiate session */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full bg-[#00C9B1]/20 text-[#00C9B1] text-[10px] font-bold">POST</span>
                <span className="font-mono text-sm text-white/70">/sessions</span>
                <span className="text-[10px] text-white/30">— Initiate a verification session</span>
              </div>
              <CodeBlock code={`curl -X POST https://livelock.io/api/v1/sessions \\
  -H "Authorization: Bearer sk_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "responderEmail": "jane@company.com",
    "actionContext": "Approve wire transfer $50,000 to vendor"
  }'`} />
              <CodeBlock code={`// Response
{
  "success": true,
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "pending",
  "expiresAt": "2026-05-20T12:31:30.000Z",
  "responderEmail": "jane@company.com",
  "actionContext": "Approve wire transfer $50,000 to vendor"
}`} lang="json" />
            </div>

            {/* Get session */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-400 text-[10px] font-bold">GET</span>
                <span className="font-mono text-sm text-white/70">/sessions/:id</span>
                <span className="text-[10px] text-white/30">— Poll session status</span>
              </div>
              <CodeBlock code={`curl https://livelock.io/api/v1/sessions/f47ac10b-58cc \\
  -H "Authorization: Bearer sk_live_your_key"`} />
              <CodeBlock code={`// status: "pending" | "active" | "verified" | "rejected" | "expired"
{
  "success": true,
  "session": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "verified",
    "actionContext": "Approve wire transfer $50,000 to vendor",
    "completedAt": "2026-05-20T12:31:05.000Z"
  }
}`} lang="json" />
            </div>

            {/* List members */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-400 text-[10px] font-bold">GET</span>
                <span className="font-mono text-sm text-white/70">/team/members</span>
                <span className="text-[10px] text-white/30">— List team members</span>
              </div>
              <CodeBlock code={`curl https://livelock.io/api/v1/team/members \\
  -H "Authorization: Bearer sk_live_your_key"`} />
            </div>

            {/* Webhooks */}
            <div>
              <p className="text-sm font-bold text-white mb-2" style={font}>Webhooks</p>
              <p className="text-xs text-white/40 mb-3">LiveLock sends a POST request to your webhook URL when a session completes. Verify the signature to ensure the request is genuine.</p>
              <CodeBlock code={`// X-LiveLock-Signature: sha256=<hmac>
// Verify in Node.js:
const crypto = require('crypto');
const signature = req.headers['x-livelock-signature'];
const expected = 'sha256=' + crypto
  .createHmac('sha256', process.env.LIVELOCK_WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');
if (signature !== expected) throw new Error('Invalid signature');`} lang="javascript" />
              <CodeBlock code={`// Webhook payload
{
  "event": "session.verified",
  "sessionId": "f47ac10b-...",
  "timestamp": "2026-05-20T12:31:05.000Z",
  "data": {
    "initiatorId": 3,
    "responderId": 7,
    "actionContext": "Approve wire transfer $50,000",
    "biometricVerified": true,
    "verifiedAt": "2026-05-20T12:31:05.000Z"
  }
}
// Events: session.verified | session.rejected | session.expired`} lang="json" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
