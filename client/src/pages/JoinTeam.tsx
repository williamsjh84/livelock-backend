/**
 * LiveLock — Join Team Page (/join?token=...)
 * Handles invite link acceptance.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Users, CheckCircle2, XCircle, Loader2, LogIn } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function JoinTeam() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "success" | "already-member" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: user, isLoading: userLoading } = trpc.auth.me.useQuery();

  const acceptMutation = trpc.teams.acceptInvite.useMutation({
    onSuccess: () => setStatus("success"),
    onError: (err) => {
      if (err.message === "You are already a member of this team") {
        setStatus("already-member");
      } else {
        setStatus("error");
        setErrorMsg(err.message);
      }
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
      setStatus("ready");
    } else {
      setStatus("error");
      setErrorMsg("Invalid invite link — no token found.");
    }
  }, []);

  const handleAccept = async () => {
    if (!token) return;
    if (!user) {
      // Redirect to login, then come back here after signing in
      window.location.href = `/login?return=${encodeURIComponent(`/join?token=${token}`)}`;
      return;
    }
    await acceptMutation.mutateAsync({ token });
  };

  const font = { fontFamily: "Space Grotesk, sans-serif" };

  if (status === "loading" || userLoading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <Loader2 size={24} className="text-[#00C9B1] animate-spin" />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-[#00C9B1]" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2" style={font}>You're in!</h1>
          <p className="text-sm text-white/50 mb-6">You've joined the team. You can now verify and be verified by your teammates.</p>
          <Button onClick={() => navigate("/app/team")} className="bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold">
            Go to My Teams
          </Button>
        </div>
      </div>
    );
  }

  if (status === "already-member") {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-[#00C9B1]" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2" style={font}>You're already on this team</h1>
          <p className="text-sm text-white/50 mb-6">No action needed — you already have access.</p>
          <Button onClick={() => navigate("/app/team")} className="bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold">
            Go to My Teams
          </Button>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2" style={font}>Invite Error</h1>
          <p className="text-sm text-white/50 mb-6">{errorMsg}</p>
          <Button variant="outline" onClick={() => navigate("/")} className="border-white/[0.12] text-white/50">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // ── Ready to accept ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-[#00C9B1]" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2" style={font}>You've been invited!</h1>
          <p className="text-sm text-white/50">
            {user
              ? `Signed in as ${user.email || user.displayName || "you"}. Click below to join the team.`
              : "You've been invited to join a LiveLock team."}
          </p>
        </div>

        <div className="space-y-3">
          {user ? (
            /* Already logged in — just accept */
            <Button
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
              className="w-full bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold py-3"
            >
              {acceptMutation.isPending
                ? <Loader2 size={15} className="mr-2 animate-spin" />
                : <CheckCircle2 size={15} className="mr-2" />
              }
              Accept Invite
            </Button>
          ) : (
            <>
              {/* New user — primary action */}
              <Button
                onClick={() => navigate(`/register?return=${encodeURIComponent(`/join?token=${token}`)}`)}
                className="w-full bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold py-3"
              >
                <CheckCircle2 size={15} className="mr-2" />
                Create Account & Accept
              </Button>

              {/* Already have an account — secondary action */}
              <Button
                variant="outline"
                onClick={handleAccept}
                className="w-full border-white/[0.12] text-white/60 hover:text-white"
              >
                <LogIn size={15} className="mr-2" />
                I already have an account
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
