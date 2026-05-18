/**
 * LiveLock — Join Team Page (/join?token=...)
 * Handles invite link acceptance, including switching teams.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Users, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

export default function JoinTeam() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "confirm-switch" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: user } = trpc.auth.me.useQuery();

  const acceptMutation = trpc.teams.acceptInvite.useMutation({
    onSuccess: () => setStatus("success"),
    onError: (err) => {
      if (err.message === "You are already a member of a team") {
        setStatus("confirm-switch");
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

  const handleAccept = async (forceSwitch = false) => {
    if (!token) return;
    if (!user) {
      window.location.href = `/login?return=/join?token=${token}`;
      return;
    }
    await acceptMutation.mutateAsync({ token, forceSwitch });
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <Loader2 size={24} className="text-[#00C9B1] animate-spin" />
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-[#00C9B1]" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>You're in!</h1>
          <p className="text-sm text-white/50 mb-6">You've successfully joined the team. You can now verify and be verified by your teammates.</p>
          <Button
            onClick={() => navigate("/app/dashboard")}
            className="bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ── Already in a team — offer to switch ─────────────────────────────────────
  if (status === "confirm-switch") {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
        <div className="max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>You're already on a team</h1>
            <p className="text-sm text-white/50 leading-relaxed">
              Accepting this invite will remove you from your current team and add you to the new one. This cannot be undone.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => handleAccept(true)}
              disabled={acceptMutation.isPending}
              className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-3"
            >
              {acceptMutation.isPending ? (
                <Loader2 size={15} className="mr-2 animate-spin" />
              ) : (
                <CheckCircle2 size={15} className="mr-2" />
              )}
              Yes, switch teams
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/app/team")}
              className="w-full border-white/[0.12] text-white/50"
            >
              Cancel — keep my current team
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Invite Error</h1>
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
          <h1 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Team Invite</h1>
          <p className="text-sm text-white/50">
            {user
              ? "You've been invited to join a LiveLock team. Accept to start verifying identities with your colleagues."
              : "You've been invited to join a LiveLock team. Sign in or register first, then accept the invite."}
          </p>
        </div>

        <Button
          onClick={() => handleAccept(false)}
          disabled={acceptMutation.isPending}
          className="w-full bg-[#00C9B1] hover:bg-[#00C9B1]/80 text-[#0A1628] font-bold py-3"
        >
          {acceptMutation.isPending ? (
            <Loader2 size={15} className="mr-2 animate-spin" />
          ) : (
            <CheckCircle2 size={15} className="mr-2" />
          )}
          {user ? "Accept Invite" : "Sign In & Accept"}
        </Button>
      </div>
    </div>
  );
}
