/**
 * LiveLock — Forgot Password Page (/forgot-password)
 */
import { useState } from "react";
import { Link } from "wouter";
import { Shield, Mail, Loader2, CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const forgotMutation = trpc.password.forgotPassword.useMutation({
    onSuccess: () => setSent(true),
    onError: (err) => setErrorMsg(err.message),
  });

  const font = { fontFamily: "Space Grotesk, sans-serif" };
  const inputClass = "w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.10] text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#00C9B1]/50 focus:bg-white/[0.07] transition-all";

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <NavBar />
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/[0.08] p-8" style={{ background: "rgba(255,255,255,0.03)" }}>

            {sent ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-[#00C9B1]" />
                </div>
                <h1 className="text-lg font-bold text-white mb-2" style={font}>Check your email</h1>
                <p className="text-sm text-white/40 mb-6 leading-relaxed">
                  If an account exists for <strong className="text-white/60">{email}</strong>, you'll receive a password reset link shortly. The link expires in 1 hour.
                </p>
                <Link href="/login">
                  <span className="text-sm text-[#00C9B1] hover:underline cursor-pointer">← Back to sign in</span>
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center flex-shrink-0">
                    <Mail size={18} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white" style={font}>Reset your password</h1>
                    <p className="text-xs text-white/40">We'll send you a reset link</p>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setErrorMsg("");
                    forgotMutation.mutate({ email });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5" style={font}>Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="joe@company.com"
                      required
                      autoFocus
                      className={inputClass}
                      style={font}
                    />
                  </div>

                  {errorMsg && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300">{errorMsg}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={forgotMutation.isPending || !email}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00C9B1] text-[#0A1628] font-semibold text-sm transition-all hover:bg-[#00b8a0] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={font}
                  >
                    {forgotMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "Send reset link"}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
                  <Link href="/login">
                    <span className="text-xs text-white/30 hover:text-white/60 cursor-pointer flex items-center justify-center gap-1">
                      <ArrowLeft size={12} /> Back to sign in
                    </span>
                  </Link>
                </div>
              </>
            )}
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
