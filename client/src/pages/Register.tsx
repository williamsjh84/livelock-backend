/**
 * LiveLock — Register Page
 * Supports two methods: passkey (WebAuthn biometric) and email + password.
 */
import { startRegistration } from "@simplewebauthn/browser";
import { Shield, Fingerprint, Loader2, CheckCircle2, AlertCircle, ArrowRight, Lock, KeyRound, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";

type Step = "form" | "passkey" | "success" | "error";
type Method = "passkey" | "password";

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Mac/.test(ua)) return "Mac";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows PC";
  return "My Device";
}

function getReturnUrl(): string {
  const params = new URLSearchParams(window.location.search);
  const ret = params.get("return");
  if (ret && ret.startsWith("/")) return ret;
  return "/app/dashboard";
}

export default function Register() {
  // Default to password — most invitees won't have passkeys set up yet
  const [method, setMethod] = useState<Method>("password");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getRegistrationOptions = trpc.webauthn.registrationOptions.useMutation();
  const verifyRegistration = trpc.webauthn.verifyRegistration.useMutation();
  const passwordRegister = trpc.password.register.useMutation();

  function switchMethod(m: Method) {
    setMethod(m);
    setStep("form");
    setErrorMsg("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handlePasskeyRegister(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const { options, userId } = await getRegistrationOptions.mutateAsync({ email, displayName });
      setStep("passkey");

      let registrationResponse;
      try {
        registrationResponse = await startRegistration({ optionsJSON: options });
      } catch (err: any) {
        if (err.name === "InvalidStateError") throw new Error("A passkey for this email already exists on this device. Try signing in instead.");
        if (err.name === "NotAllowedError") throw new Error("The passkey prompt was dismissed. Please try again and follow the prompt.");
        if (err.name === "NotSupportedError") throw new Error("Your browser does not support passkeys. Try Chrome, Safari, or Edge.");
        if (err.name === "SecurityError") throw new Error("Passkeys require HTTPS. If testing locally, use http://localhost.");
        throw new Error(`Passkey creation failed: ${err.message || err.name}`);
      }

      await verifyRegistration.mutateAsync({ userId, response: registrationResponse, deviceName: getDeviceName() });
      setStep("success");
      setTimeout(() => { window.location.href = getReturnUrl(); }, 2000);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Registration failed. Please try again.");
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      setStep("error");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      setStep("error");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");

    try {
      await passwordRegister.mutateAsync({ email, displayName, password });
      setStep("success");
      setTimeout(() => { window.location.href = getReturnUrl(); }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Registration failed. Please try again.");
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
                <h1 className="text-lg font-bold text-white" style={font}>Create your account</h1>
                <p className="text-xs text-white/40">Choose how you want to secure it</p>
              </div>
            </div>

            {/* Method toggle */}
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
              </div>
            )}

            {/* ── PASSKEY FLOW ── */}
            {method === "passkey" && (
              <>
                {(step === "form" || step === "error") && (
                  <form onSubmit={handlePasskeyRegister} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5" style={font}>Full name</label>
                      <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Joe Williams" required autoComplete="name" className={inputClass} style={font} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5" style={font}>Work email</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joe@company.com" required autoComplete="email" className={inputClass} style={font} />
                    </div>

                    {step === "error" && errorMsg && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300 leading-relaxed">{errorMsg}</p>
                      </div>
                    )}

                    <button type="submit" disabled={isLoading || !email || !displayName} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00C9B1] text-[#0A1628] font-semibold text-sm transition-all hover:bg-[#00b8a0] disabled:opacity-50 disabled:cursor-not-allowed" style={font}>
                      {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><Fingerprint size={16} />Create passkey<ArrowRight size={14} /></>}
                    </button>

                    <p className="text-[10px] text-white/25 text-center leading-relaxed">
                      Works in Chrome, Safari, Edge, and Firefox. Does not work in private/incognito mode on some browsers.
                    </p>
                  </form>
                )}

                {step === "passkey" && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
                      <Fingerprint size={28} className="text-[#00C9B1] animate-pulse" />
                    </div>
                    <h2 className="text-base font-bold text-white mb-2" style={font}>Check your device</h2>
                    <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
                      Follow the prompt to create your passkey using <span className="text-white/70">Face ID, Touch ID, or your PIN</span>.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ── PASSWORD FLOW ── */}
            {method === "password" && (step === "form" || step === "error") && (
              <form onSubmit={handlePasswordRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5" style={font}>Full name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Joe Williams" required autoComplete="name" className={inputClass} style={font} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5" style={font}>Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joe@company.com" required autoComplete="email" className={inputClass} style={font} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5" style={font}>Password <span className="text-white/30 font-normal">(min 8 characters)</span></label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" required className={inputClass + " pr-11"} style={font} />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5" style={font}>Confirm password</label>
                  <div className="relative">
                    <input type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your password" required className={inputClass + " pr-11"} style={font} />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {step === "error" && errorMsg && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">{errorMsg}</p>
                  </div>
                )}

                <button type="submit" disabled={isLoading || !email || !displayName || !password || !confirmPassword} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00C9B1] text-[#0A1628] font-semibold text-sm transition-all hover:bg-[#00b8a0] disabled:opacity-50 disabled:cursor-not-allowed" style={font}>
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><KeyRound size={16} />Create account<ArrowRight size={14} /></>}
                </button>
              </form>
            )}

            {/* ── SUCCESS ── */}
            {step === "success" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-[#00C9B1]" />
                </div>
                <h2 className="text-base font-bold text-white mb-2" style={font}>Account created</h2>
                <p className="text-sm text-white/40">Taking you to your dashboard…</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
              <p className="text-xs text-white/30">
                Already have an account?{" "}
                <Link href="/login">
                  <span className="text-[#00C9B1] hover:underline cursor-pointer">Sign in</span>
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <Shield size={12} className="text-white/20" />
            <p className="text-[11px] text-white/20">End-to-end encrypted · Phishing-resistant</p>
          </div>
        </div>
      </div>
    </div>
  );
}
