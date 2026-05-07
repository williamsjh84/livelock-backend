/**
 * LiveLock — Register Page
 * Creates a new account with a device-bound passkey (WebAuthn).
 * No passwords. No email verification. The private key never leaves this device.
 */
import { startRegistration } from "@simplewebauthn/browser";
import { Shield, Fingerprint, Loader2, CheckCircle2, AlertCircle, ArrowRight, Lock, Info } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";

type Step = "form" | "passkey" | "success" | "error";

// Detect browsers known to have issues with WebAuthn
function getBrowserWarning(): string | null {
  const ua = navigator.userAgent;
  // Safari Private Browsing blocks WebAuthn
  // Firefox with strict ETP can block it
  // Brave with aggressive shields can block it
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    // Could be Safari Private — we can't detect it directly, but we can warn
    return null; // Safari works fine in normal mode
  }
  return null;
}

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Mac/.test(ua)) return "Mac";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows PC";
  return "My Device";
}

export default function Register() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getRegistrationOptions = trpc.webauthn.registrationOptions.useMutation();
  const verifyRegistration = trpc.webauthn.verifyRegistration.useMutation();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setErrorDetail("");

    try {
      // Step 1: Get challenge + options from server
      const { options, userId } = await getRegistrationOptions.mutateAsync({
        email,
        displayName,
      });

      setStep("passkey");

      // Step 2: Trigger the browser's built-in WebAuthn dialog
      // This is where Face ID / Touch ID / Windows Hello / PIN prompt appears.
      // NO email is sent — the browser itself handles the passkey creation.
      let registrationResponse;
      try {
        registrationResponse = await startRegistration({ optionsJSON: options });
      } catch (err: any) {
        if (err.name === "InvalidStateError") {
          throw new Error("A passkey for this email already exists on this device. Try signing in instead.");
        }
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
            "Security error: this page must be served over HTTPS for passkeys to work. If you are testing locally, use http://localhost."
          );
        }
        throw new Error(`Passkey creation failed: ${err.message || err.name}`);
      }

      // Step 3: Verify with server and get session cookie
      await verifyRegistration.mutateAsync({
        userId,
        response: registrationResponse,
        deviceName: getDeviceName(),
      });

      setStep("success");
      setTimeout(() => setLocation("/app/dashboard"), 2000);
    } catch (err: any) {
      const msg = err?.message ?? "Registration failed. Please try again.";
      setErrorMsg(msg);
      // If the error came from the server verification step, add a hint
      if (msg.includes("verification failed") || msg.includes("origin") || msg.includes("rpID")) {
        setErrorDetail(
          "This can happen if you are using a browser extension that modifies requests, or if you are in a private/incognito window. Try a normal browser window."
        );
      }
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
                  Create your account
                </h1>
                <p className="text-xs text-white/40">Secured with a device-bound passkey — no password needed</p>
              </div>
            </div>

            {/* How it works — shown before form */}
            {step === "form" && (
              <div className="mb-5 p-3 rounded-xl bg-[#00C9B1]/5 border border-[#00C9B1]/10">
                <div className="flex items-start gap-2">
                  <Info size={13} className="text-[#00C9B1] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-[#00C9B1] font-semibold mb-0.5">How this works</p>
                    <p className="text-[11px] text-white/50 leading-relaxed">
                      Enter your name and email, then your device will show a prompt to create a passkey using{" "}
                      <strong className="text-white/70">Face ID, Touch ID, or your device PIN</strong>.
                      No email is sent — the passkey is created directly on your device.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Form */}
            {(step === "form" || step === "error") && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                    Full name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Joe Williams"
                    required
                    autoComplete="name"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.10] text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#00C9B1]/50 focus:bg-white/[0.07] transition-all"
                    style={{ fontFamily: "Space Grotesk, sans-serif" }}
                  />
                </div>

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
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.10] text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#00C9B1]/50 focus:bg-white/[0.07] transition-all"
                    style={{ fontFamily: "Space Grotesk, sans-serif" }}
                  />
                </div>

                {step === "error" && errorMsg && (
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300 leading-relaxed">{errorMsg}</p>
                    </div>
                    {errorDetail && (
                      <p className="text-[11px] text-white/40 leading-relaxed pl-[22px]">{errorDetail}</p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email || !displayName}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00C9B1] text-[#0A1628] font-semibold text-sm transition-all hover:bg-[#00b8a0] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: "Space Grotesk, sans-serif" }}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Fingerprint size={16} />
                      Create passkey
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                {/* Browser compatibility note */}
                <p className="text-[10px] text-white/25 text-center leading-relaxed">
                  Works in Chrome, Safari, Edge, and Firefox on modern devices.
                  Does not work in private/incognito mode on some browsers.
                </p>
              </form>
            )}

            {/* Step: Passkey prompt in progress */}
            {step === "passkey" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
                  <Fingerprint size={28} className="text-[#00C9B1] animate-pulse" />
                </div>
                <h2 className="text-base font-bold text-white mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                  Check your device
                </h2>
                <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
                  Your device should be showing a prompt right now. Follow it to create your passkey using{" "}
                  <span className="text-white/70">Face ID, Touch ID, or your PIN</span>.
                </p>
                <p className="text-xs text-white/30 mt-3">
                  If no prompt appeared, check that your browser allows passkeys and try again.
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
                  Passkey created
                </h2>
                <p className="text-sm text-white/40">
                  Your account is secured. Taking you to your dashboard…
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
              <p className="text-xs text-white/30">
                Already have an account?{" "}
                <Link href="/login">
                  <span className="text-[#00C9B1] hover:underline cursor-pointer">Sign in with passkey</span>
                </Link>
              </p>
            </div>
          </div>

          {/* Security note */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Shield size={12} className="text-white/20" />
            <p className="text-[11px] text-white/20">Device-bound · No passwords · Biometric protected</p>
          </div>
        </div>
      </div>
    </div>
  );
}
