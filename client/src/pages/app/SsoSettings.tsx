/**
 * LiveLock — SSO / SAML Settings (/app/sso)
 * Enterprise admins configure their SAML identity provider here.
 */
import { useState } from "react";
import { Building2, Shield, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function SsoSettings() {
  const { data: orgData, refetch } = trpc.org.getMyOrg.useQuery();
  const createOrgMutation = trpc.org.create.useMutation({ onSuccess: () => refetch() });
  const updateSamlMutation = trpc.org.updateSamlConfig.useMutation({ onSuccess: () => { refetch(); setSamlSaved(true); setTimeout(() => setSamlSaved(false), 3000); } });
  const toggleSsoMutation = trpc.org.toggleSso.useMutation({ onSuccess: () => refetch() });

  const [orgName, setOrgName] = useState("");
  const [orgDomain, setOrgDomain] = useState("");
  const [orgError, setOrgError] = useState("");

  const [entryPoint, setEntryPoint] = useState(orgData?.saml?.entryPoint ?? "");
  const [issuer, setIssuer] = useState(orgData?.saml?.issuer ?? "");
  const [cert, setCert] = useState("");
  const [samlError, setSamlError] = useState("");
  const [samlSaved, setSamlSaved] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const font = { fontFamily: "Space Grotesk, sans-serif" };

  const copy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyBtn = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => copy(text, field)}
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-white/40 hover:text-white text-[10px] transition-colors flex-shrink-0"
    >
      {copiedField === field ? <Check size={11} className="text-[#00C9B1]" /> : <Copy size={11} />}
      {copiedField === field ? "Copied" : "Copy"}
    </button>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-1">Enterprise</p>
        <h1 className="text-xl font-bold text-white" style={font}>SSO / SAML</h1>
        <p className="text-xs text-white/40 mt-1">Let your team sign in with Okta, Azure AD, Google Workspace, or any SAML 2.0 identity provider.</p>
      </div>

      {/* ── Step 1: Create org ─────────────────────────────────────────────── */}
      {!orgData?.org && (
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] mb-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-[#00C9B1]/20 border border-[#00C9B1]/30 flex items-center justify-center">
              <span className="text-xs font-bold text-[#00C9B1]">1</span>
            </div>
            <p className="text-sm font-bold text-white" style={font}>Create Your Organization</p>
          </div>
          <p className="text-xs text-white/40 mb-4">Claim your company's email domain. Members with this domain will be redirected to your SSO provider at login.</p>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00C9B1]/40 transition-all"
                style={font}
              />
            </div>
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">Company Email Domain</label>
              <input
                type="text"
                value={orgDomain}
                onChange={e => { setOrgDomain(e.target.value.toLowerCase()); setOrgError(""); }}
                placeholder="acme.com"
                className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00C9B1]/40 transition-all"
                style={font}
              />
              <p className="text-[10px] text-white/20 mt-1">Users with @{orgDomain || "yourdomain.com"} will auto-route to SSO</p>
            </div>
            {orgError && <p className="text-[10px] text-red-400">{orgError}</p>}
            <Button
              onClick={async () => {
                if (!orgName.trim() || !orgDomain.trim()) { setOrgError("Both fields are required"); return; }
                try {
                  await createOrgMutation.mutateAsync({ name: orgName.trim(), domain: orgDomain.trim() });
                } catch (err: unknown) {
                  setOrgError(err instanceof Error ? err.message : "Failed to create org");
                }
              }}
              disabled={createOrgMutation.isPending}
              className="bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold"
            >
              {createOrgMutation.isPending ? "Creating…" : "Create Organization"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Org exists ────────────────────────────────────────────────────── */}
      {orgData?.org && (
        <>
          {/* Org info */}
          <div className="p-4 rounded-2xl border border-[#00C9B1]/15 bg-[#00C9B1]/5 mb-5 flex items-center gap-3">
            <Building2 size={18} className="text-[#00C9B1] flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-white" style={font}>{orgData.org.name}</p>
              <p className="text-[11px] text-[#00C9B1]/70">@{orgData.org.domain} · {orgData.org.ssoEnabled ? "SSO Active" : "SSO Disabled"}</p>
            </div>
            <div className={`px-2 py-1 rounded-full text-[10px] font-bold border ${orgData.org.ssoEnabled ? "text-[#00C9B1] bg-[#00C9B1]/10 border-[#00C9B1]/30" : "text-white/30 bg-white/[0.04] border-white/[0.08]"}`}>
              {orgData.org.ssoEnabled ? "● Active" : "○ Inactive"}
            </div>
          </div>

          {/* ── Step 2: SP Details for IT ─────────────────────────────────── */}
          <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] mb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#00C9B1]/20 border border-[#00C9B1]/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#00C9B1]">2</span>
                </div>
                <p className="text-sm font-bold text-white" style={font}>Configure Your Identity Provider</p>
              </div>
              <button
                onClick={() => setShowGuide(v => !v)}
                className="flex items-center gap-1 text-[11px] text-[#00C9B1]/60 hover:text-[#00C9B1] transition-colors"
              >
                {showGuide ? <><ChevronUp size={12} /> Hide guide</> : <><ChevronDown size={12} /> Show setup guide</>}
              </button>
            </div>

            <p className="text-xs text-white/40 mb-4">Give these values to your IT admin to create a new SAML app in Okta, Azure AD, or Google Workspace.</p>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">SP Entity ID / Audience URI</p>
                  <CopyBtn text={orgData.spEntityId} field="entityId" />
                </div>
                <p className="text-xs text-white/70 font-mono break-all">{orgData.spEntityId}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">ACS URL / Reply URL / Callback URL</p>
                  <CopyBtn text={orgData.acsUrl} field="acsUrl" />
                </div>
                <p className="text-xs text-white/70 font-mono break-all">{orgData.acsUrl}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1">Name ID Format</p>
                <p className="text-xs text-white/70 font-mono">EmailAddress</p>
              </div>
            </div>

            {/* Setup guide */}
            {showGuide && (
              <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                <p className="text-xs font-semibold text-white/60">Setup guide by provider:</p>
                {[
                  { name: "Okta", steps: ["Admin Console → Applications → Create App Integration → SAML 2.0", "Paste the ACS URL into 'Single sign-on URL'", "Paste the Entity ID into 'Audience URI (SP Entity ID)'", "Name ID format: EmailAddress → Finish", "Copy the IdP metadata URL or certificate for Step 3"] },
                  { name: "Azure AD", steps: ["Azure Portal → Enterprise Applications → New Application → Non-gallery app", "Single sign-on → SAML → Edit Basic SAML Configuration", "Paste Entity ID into 'Identifier (Entity ID)'", "Paste ACS URL into 'Reply URL (Assertion Consumer Service URL)'", "Download Certificate (Base64) for Step 3, copy Login URL as Entry Point"] },
                  { name: "Google Workspace", steps: ["Admin console → Apps → Web and mobile apps → Add SAML app", "Paste ACS URL and Entity ID in Service provider details", "Name ID: Basic Information → Primary Email", "Download the IdP metadata or certificate for Step 3"] },
                ].map(p => (
                  <div key={p.name}>
                    <p className="text-[11px] font-bold text-[#00C9B1] mb-1">{p.name}</p>
                    <ol className="space-y-0.5">
                      {p.steps.map((s, i) => (
                        <li key={i} className="text-[10px] text-white/40 flex gap-2">
                          <span className="text-white/20 flex-shrink-0">{i + 1}.</span>{s}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Step 3: Paste IdP config ───────────────────────────────────── */}
          <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] mb-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#00C9B1]/20 border border-[#00C9B1]/30 flex items-center justify-center">
                <span className="text-xs font-bold text-[#00C9B1]">3</span>
              </div>
              <p className="text-sm font-bold text-white" style={font}>Paste Your IdP Configuration</p>
            </div>
            {orgData.saml?.certSet && (
              <div className="mb-4 flex items-center gap-2 p-2.5 rounded-xl bg-[#00C9B1]/5 border border-[#00C9B1]/20">
                <CheckCircle2 size={13} className="text-[#00C9B1]" />
                <p className="text-[11px] text-[#00C9B1]/80">SAML configuration saved. Last updated {new Date(orgData.saml.updatedAt).toLocaleDateString()}.</p>
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-white/30 mb-1 block">IdP Entry Point (SSO URL)</label>
                <input
                  type="url"
                  value={entryPoint}
                  onChange={e => setEntryPoint(e.target.value)}
                  placeholder="https://your-org.okta.com/app/xxx/sso/saml"
                  className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00C9B1]/40 transition-all font-mono"
                  style={font}
                />
              </div>
              <div>
                <label className="text-[10px] text-white/30 mb-1 block">IdP Issuer / Entity ID</label>
                <input
                  type="text"
                  value={issuer}
                  onChange={e => setIssuer(e.target.value)}
                  placeholder="http://www.okta.com/exkxxxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#00C9B1]/40 transition-all font-mono"
                  style={font}
                />
              </div>
              <div>
                <label className="text-[10px] text-white/30 mb-1 block">
                  X.509 Certificate {orgData.saml?.certSet && <span className="text-[#00C9B1]/60">(leave blank to keep existing)</span>}
                </label>
                <textarea
                  value={cert}
                  onChange={e => setCert(e.target.value)}
                  placeholder={"-----BEGIN CERTIFICATE-----\nMIIC...base64...\n-----END CERTIFICATE-----"}
                  rows={5}
                  className="w-full px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-white/70 placeholder:text-white/15 focus:outline-none focus:border-[#00C9B1]/40 transition-all font-mono resize-none"
                />
                <p className="text-[10px] text-white/20 mt-1">Paste the certificate from your IdP. PEM format with or without headers.</p>
              </div>
              {samlError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-400/10 border border-red-400/20">
                  <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{samlError}</p>
                </div>
              )}
              <Button
                onClick={async () => {
                  setSamlError("");
                  if (!entryPoint || !issuer) { setSamlError("Entry point and issuer are required"); return; }
                  if (!cert && !orgData.saml?.certSet) { setSamlError("Certificate is required"); return; }
                  try {
                    await updateSamlMutation.mutateAsync({
                      entryPoint,
                      issuer,
                      cert: cert || "KEEP_EXISTING",
                    });
                  } catch (err: unknown) {
                    setSamlError(err instanceof Error ? err.message : "Failed to save");
                  }
                }}
                disabled={updateSamlMutation.isPending}
                className="bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold"
              >
                {samlSaved ? <><CheckCircle2 size={14} className="mr-2" />Saved</> : updateSamlMutation.isPending ? "Saving…" : "Save SAML Configuration"}
              </Button>
            </div>
          </div>

          {/* ── Step 4: Enable SSO ─────────────────────────────────────────── */}
          <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#00C9B1]/20 border border-[#00C9B1]/30 flex items-center justify-center">
                <span className="text-xs font-bold text-[#00C9B1]">4</span>
              </div>
              <p className="text-sm font-bold text-white" style={font}>Enable SSO</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Enforce SSO for @{orgData.org.domain}</p>
                <p className="text-[10px] text-white/30 mt-0.5">
                  {orgData.org.ssoEnabled
                    ? "Users with this domain will be auto-redirected to your IdP"
                    : "Requires SAML configuration to be saved first"}
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await toggleSsoMutation.mutateAsync({ enabled: !orgData.org.ssoEnabled });
                  } catch (err: unknown) {
                    alert(err instanceof Error ? err.message : "Failed to toggle SSO");
                  }
                }}
                disabled={toggleSsoMutation.isPending || (!orgData.saml?.certSet && !orgData.org.ssoEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 ${orgData.org.ssoEnabled ? "bg-[#00C9B1]" : "bg-white/[0.10]"} disabled:opacity-40`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${orgData.org.ssoEnabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            {orgData.org.ssoEnabled && (
              <div className="mt-3 p-3 rounded-xl bg-[#00C9B1]/5 border border-[#00C9B1]/15">
                <p className="text-[11px] text-[#00C9B1]/80 leading-relaxed">
                  ✓ SSO is live. Users signing in with @{orgData.org.domain} will be redirected to your identity provider.
                  Test it by opening a private window and trying to sign in.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
