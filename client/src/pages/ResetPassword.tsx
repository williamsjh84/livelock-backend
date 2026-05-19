/**
 * LiveLock — Reset Password Page (/reset-password?token=...)
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import NavBar from "@/components/NavBar";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const resetMutation = trpc.password.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => setLocation("/login"), 2500);
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const font = { fontFamily: "Space Grotesk, sans-serif" };
  const inputClass = "w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.10] text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#00C9B1]/50 focus:bg-white/[0.07] transition-all";

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-white font-bold" style={font}>Invalid reset link</p>
          <p className="text-white/40 text-sm mt-1">Please request a new password reset from the login page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <NavBar />
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/[0.08] p-8" style={{ background: "rgba(255,255,255,0.03)" }}>

            {success ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-[#00C9B1]" />
                </div>
                <h1 className="text-lg font-bold text-white mb-2" style={font}>Password updated</h1>
                <p className="text-sm text-white/40">Taking you to the sign-in page…</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center flex-shrink-0">
                    <Lock size={18} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white" style={font}>Set a new password</h1>
                    <p className="text-xs text-white/40">Choose something strong</p>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setErrorMsg("");
                    if (password !== confirmPassword) {
                      setErrorMsg("Passwords do not match.");
                      return;
                    }
                    if (password.length < 8) {
                      setErrorMsg("Password must be at least 8 characters.");
                      return;
                    }
                    resetMutation.mutate({ token, newPassword: password });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5" style={font}>
                      New password <span className="text-white/30 font-normal">(min 8 characters)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        required
                        autoFocus
                        className={inputClass + " pr-11"}
                        style={font}
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5" style={font}>Confirm password</label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"
                        required
                        className={inputClass + " pr-11"}
                        style={font}
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300">{errorMsg}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={resetMutation.isPending || !password || !confirmPassword}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#00C9B1] text-[#0A1628] font-semibold text-sm transition-all hover:bg-[#00b8a0] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={font}
                  >
                    {resetMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "Update password"}
                  </button>
                </form>
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
