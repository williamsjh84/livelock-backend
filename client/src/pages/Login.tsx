/**
 * LiveLock — Login Page
 * Signs in with a device-bound passkey (WebAuthn).
 * No password entry — biometric only.
 */
import { startAuthentication } from "@simplewebauthn/browser";
import { Shield, Fingerprint, Loader2, CheckCircle2, AlertCircle, ArrowRight, Lock } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";

type Step = "form" | "passkey" | "success" | "error";

export default function Login() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getAuthOptions = trpc.webauthn.authenticationOptions.useMutation();
  const verifyAuth = trpc.webauthn.verifyAuthentication.useMutation();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      // Step 1: Get authentication options from server
      const { options, userId } = await getAuthOptions.mutateAsync({ email });

      setStep("passkey");

      // Step 2: Trigger the browser's WebAuthn API
      // NO email is sent — the browser shows a biometric/PIN prompt directly.
      let authResponse;
      try {
        authResponse = await startAuthentication({ optionsJSON: options });
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          throw new Error(
            "The passkey prompt was dismissed or timed out. Please try again and follow the prompt your device shows."
          );
        }
        if (err.name === "NotSupportedError") {
          throw new Error(
            "Your browser or device does not support passkeys. Try Chrome, Safari, or Edge on a modern device."
          );
        }
        if (err.name === "SecurityError") {
          throw new Error(
            "Security error: passkeys require HTTPS. If testing locally, use http://localhost."
          );
        }
        throw new Error(`Sign in failed: ${err.message || err.name}`);
      }

      // Step 3: Verify with server and get session cookie
      await verifyAuth.mutateAsync({ userId, response: authResponse });

      setStep("success");
      setTimeout(() => setLocation("/app/dashboard"), 1500);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Sign in failed. Please try again.");
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <NavBar />

      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12">
        <div className="w-full max-w-md">

          {/* Card */}
          <div
            className="rounded-2xl border border-white/[0.08] p-8"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center flex-shrink-0">
                <Lock size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                  Sign in to LiveLock
                </h1>
                <p className="text-xs text-white/40">No password — your device is your key</p>
              </div>
            </div>

            {/* Step: Form */}
            {(step === "form" || step === "error") && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                    Work email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="joe@company.com"
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.10] text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#00C9B1]/50 focus:bg-white/[0.07] transition-all"
                    style={{ fontFamily: "Space Grotesk, sans-serif" }}
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
                  style={{ fontFamily: "Space Grotesk, sans-serif" }}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Fingerprint size={16} />
                      Sign in with passkey
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                <div className="p-3 rounded-xl bg-[#00C9B1]/5 border border-[#00C9B1]/10">
                  <p className="text-[11px] text-white/40 leading-relaxed">
                    <span className="text-[#00C9B1] font-medium">How it works:</span> Enter your email, then your device will prompt you for Face ID, Touch ID, or your PIN to confirm it's really you.
                  </p>
                </div>
              </form>
            )}

            {/* Step: Passkey prompt in progress */}
            {step === "passkey" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
                  <Fingerprint size={28} className="text-[#00C9B1] animate-pulse" />
                </div>
                <h2 className="text-base font-bold text-white mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                  Verify your identity
                </h2>
                <p className="text-sm text-white/40 leading-relaxed max-w-xs mx-auto">
                  Follow the prompt on your device — use Face ID, Touch ID, or your device PIN.
                </p>
              </div>
            )}

            {/* Step: Success */}
            {step === "success" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-[#00C9B1]" />
                </div>
                <h2 className="text-base font-bold text-white mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                  Identity verified
                </h2>
                <p className="text-sm text-white/40">
                  Signing you in…
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
              <p className="text-xs text-white/30">
                Don't have an account?{" "}
                <Link href="/register">
                  <span className="text-[#00C9B1] hover:underline cursor-pointer">Create one with a passkey</span>
                </Link>
              </p>
            </div>
          </div>

          {/* Security note */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Shield size={12} className="text-white/20" />
            <p className="text-[11px] text-white/20">Device-bound · No passwords · Phishing-resistant</p>
          </div>
        </div>
      </div>
    </div>
  );
}
