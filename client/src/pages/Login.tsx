/**
 * LiveLock — Login Page
 * Supports two methods: passkey (WebAuthn biometric) and email + password.
 */
import { startAuthentication } from "@simplewebauthn/browser";
import { Shield, Fingerprint, Loader2, CheckCircle2, AlertCircle, ArrowRight, Lock, KeyRound, Eye, EyeOff, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";

type Step = "form" | "passkey" | "success" | "error";
type Method = "passkey" | "password" | "sso";

function getReturnUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const ret = params.get("return");
  if (ret && ret.startsWith("/")) return ret;
  return "/app/dashboard";
}

export default function Login() {
  const [, setLocation] = useLocation();
  const [method, setMethod] = useState<Method>("passkey");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [ssoOrg, setSsoOrg] = useState<string | null>(null);

  // Handle SSO error redirect from callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoError = params.get("sso_error");
    const ssoEmail = params.get("email");
    if (ssoError) {
      const messages: Record<string, string> = {
        no_sso_config: "No SSO is configured for this domain. Try passkey or password instead.",
        assertion_failed: "SSO sign-in failed — the identity provider returned an invalid response.",
        no_email_in_assertion: "SSO configuration error: your identity provider did not return an email address.",
        missing_email: "Please enter your work email before signing in with SSO.",
      };
      setErrorMsg(messages[ssoError] ?? "SSO sign-in failed. Please try again.");
      setStep("error");
      setMethod("sso");
      if (ssoEmail) setEmail(ssoEmail);
    }
  }, []);

  const getAuthOptions = trpc.webauthn.authenticationOptions.useMutation();
  const verifyAuth = trpc.webauthn.verifyAuthentication.useMutation();
  const passwordLogin = trpc.password.login.useMutation();
  const checkDomain = trpc.org.checkDomain.useQuery(
    { email },
    { enabled: email.includes("@") && email.includes("."), refetchOnWindowFocus: false }
  );

  // Auto-detect SSO domain as user types email
  useEffect(() => {
    if (checkDomain.data?.hasSso) {
      setSsoOrg(checkDomain.data.orgName);
      if (method !== "sso") setMethod("sso");
    } else if (method === "sso" && !checkDomain.data?.hasSso) {
      setSsoOrg(null);
      setMethod("passkey");
    }
  }, [checkDomain.data]);

  function switchMethod(m: Method) {
    setMethod(m);
    setStep("form");
    setErrorMsg("");
    setPassword("");
  }

  async function handlePasskeyLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const { options, userId } = await getAuthOptions.mutateAsync({ email });
      setStep("passkey");

      let authResponse;
      try {
        authResponse = await startAuthentication({ optionsJSON: options });
      } catch (err: any) {
        if (err.name === "NotAllowedError") throw new Error("The passkey prompt was dismissed or timed out. Please try again.");
        if (err.name === "NotSupportedError") throw new Error("Your browser does not support passkeys. Try Chrome, Safari, or Edge.");
        if (err.name === "SecurityError") throw new Error("Passkeys require HTTPS. If testing locally, use http://localhost.");
        throw new Error(`Sign in failed: ${err.message || err.name}`);
      }

      await verifyAuth.mutateAsync({ userId, response: authResponse });
      setStep("success");
      setTimeout(() => { window.location.href = getReturnUrl(); }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Sign in failed. Please try again.");
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      await passwordLogin.mutateAsync({ email, password });
      setStep("success");
      setTimeout(() => { window.location.href = getReturnUrl(); }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Invalid email or password.");
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.10] text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#00C9B1]/50 focus:bg-white/[0.07] transition-all";
  const font = { fontFamily: "Space Grotesk, sans-serif" };

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <NavBar />

      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12">
        <div className="w-full max-w-md">

          {/* Card */}
          <div className="rounded-2xl border border-white/[0.08] p-8" style={{ background: "rgba(255,255,255,0.03)" }}>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center flex-shrink-0">
                <Lock size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white" style={font}>Sign in to LiveLock</h1>
                <p className="text-xs text-white/40">Choose your sign-in method below</p>
              </div>
            </div>

            {/* Method toggle — only show when on the form */}
            {(step === "form" || step === "error") && (
              <div className="flex gap-2 mb-6 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => switchMethod("passkey")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                    method === "passkey" ? "bg-[#00C9B1] text-[#0A1628]" : "text-white/50 hover:text-white/80"
                  }`}
                  style={font}
                >
                  <Fingerprint size={14} />
                  Passkey
                </button>
                <button
                  type="button"
                  onClick={() => switchMethod("password")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                    method === "password" ? "bg-[#00C9B1] text-[#0A1628]" : "text-white/50 hover:text-white/80"
                  }`}
                  style={font}
                >
                  <KeyRound size={14} />
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => switchMethod("sso")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                    method === "sso" ? "bg-[#00C9B1] text-[#0A1628]" : "text-white/50 hover:text-white/80"
                  }`}
                  style={font}
                >
                  <Building2 size={14} />
                  SSO
                </button>
              </div>
            )}

            {/* ── PASSKEY FLOW ── */}
            {method === "passkey" && (
              <>
                {(step === "form" || step === "error") && (
                  <form onSubmit={handlePasskeyLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5" style={font}>Work email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="joe@company.com"
                        required
                        autoFocus
                        className={inputClass}
                        style={font}
                      />
                    </div>

                    {step === "error" && errorMsg && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300 leading-relaxed">{errorMsg}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading || !email}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00C9B1] text-[#0A1628] font-semibold text-sm transition-all hover:bg-[#00b8a0] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={font}
                    >
                      {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><Fingerprint size={16} />Sign in with passkey<ArrowRight size={14} /></>}
                    </button>

                    <div className="p-3 rounded-xl bg-[#00C9B1]/5 border border-[#00C9B1]/10">
                      <p className="text-[11px] text-white/40 leading-relaxed">
                        <span className="text-[#00C9B1] font-medium">How it works:</span> Enter your email, then your device prompts you for Face ID, Touch ID, or your PIN.
                      </p>
                    </div>
                  </form>
                )}

                {step === "passkey" && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
                      <Fingerprint size={28} className="text-[#00C9B1] animate-pulse" />
                    </div>
                    <h2 className="text-base font-bold text-white mb-2" style={font}>Verify your identity</h2>
                    <p className="text-sm text-white/40 leading-relaxed max-w-xs mx-auto">
                      Follow the prompt on your device — use Face ID, Touch ID, or your device PIN.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ── PASSWORD FLOW ── */}
            {method === "password" && (step === "form" || step === "error") && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5" style={font}>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="joe@company.com"
                    required
                    autoFocus
                    className={inputClass}
                    style={font}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-white/60" style={font}>Password</label>
                    <Link href="/forgot-password">
                      <span className="text-[11px] text-[#00C9B1]/70 hover:text-[#00C9B1] cursor-pointer transition-colors">Forgot password?</span>
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className={inputClass + " pr-11"}
                      style={font}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {step === "error" && errorMsg && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">{errorMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00C9B1] text-[#0A1628] font-semibold text-sm transition-all hover:bg-[#00b8a0] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={font}
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><KeyRound size={16} />Sign in<ArrowRight size={14} /></>}
                </button>
              </form>
            )}

            {/* ── SSO FLOW ── */}
            {method === "sso" && (step === "form" || step === "error") && (
              <form onSubmit={e => { e.preventDefault(); window.location.href = `/auth/sso/initiate?email=${encodeURIComponent(email)}`; }} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5" style={font}>Work email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="joe@company.com"
                    required
                    autoFocus
                    className={inputClass}
                    style={font}
                  />
                  {ssoOrg && (
                    <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-[#00C9B1]/5 border border-[#00C9B1]/20">
                      <Building2 size={13} className="text-[#00C9B1] flex-shrink-0" />
                      <p className="text-[11px] text-[#00C9B1]/80">SSO detected for <span className="font-semibold text-[#00C9B1]">{ssoOrg}</span></p>
                    </div>
                  )}
                </div>

                {step === "error" && errorMsg && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">{errorMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!email}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00C9B1] text-[#0A1628] font-semibold text-sm transition-all hover:bg-[#00b8a0] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={font}
                >
                  <Building2 size={16} />Continue with SSO<ArrowRight size={14} />
                </button>

                <div className="p-3 rounded-xl bg-[#00C9B1]/5 border border-[#00C9B1]/10">
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    <span className="text-[#00C9B1] font-medium">How SSO works:</span> Enter your work email and you'll be redirected to your company's identity provider (Okta, Azure AD, etc.).
                  </p>
                </div>
              </form>
            )}

            {/* ── SUCCESS (both methods) ── */}
            {step === "success" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-[#00C9B1]" />
                </div>
                <h2 className="text-base font-bold text-white mb-2" style={font}>Signed in</h2>
                <p className="text-sm text-white/40">Taking you to your dashboard…</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
              <p className="text-xs text-white/30">
                Don't have an account?{" "}
                <Link href="/register">
                  <span className="text-[#00C9B1] hover:underline cursor-pointer">Create one</span>
                </Link>
              </p>
            </div>
          </div>

          {/* Security note */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Shield size={12} className="text-white/20" />
            <p className="text-[11px] text-white/20">End-to-end encrypted · Phishing-resistant</p>
          </div>
        </div>
      </div>
    </div>
  );
}
