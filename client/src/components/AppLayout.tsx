/**
 * LiveLock — Authenticated App Shell
 * Sidebar layout for all /app/* routes.
 * Redirects to /login if the user is not authenticated.
 */
import { Shield, LayoutDashboard, ShieldCheck, Users, ClipboardList, Settings, LogOut, Menu, X, ChevronRight } from "lucide-react";
import { Link, useLocation, Redirect } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

const NAV_ITEMS = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/verify", label: "Verify", icon: ShieldCheck },
  { href: "/app/team", label: "Team", icon: Users },
  { href: "/app/audit", label: "Audit Log", icon: ClipboardList },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/login"; },
  });

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center animate-pulse">
            <Shield size={18} className="text-white" />
          </div>
          <p className="text-xs text-white/30" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  const displayName = user.displayName || user.name || user.email || "User";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-[#0A1628] flex">
      {/* ── Sidebar (desktop) ──────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-56 flex-shrink-0 border-r border-white/[0.06] min-h-screen"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        <SidebarContent
          location={location}
          displayName={displayName}
          initials={initials}
          onLogout={() => logoutMutation.mutate()}
        />
      </aside>

      {/* ── Mobile sidebar overlay ─────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 flex flex-col border-r border-white/[0.08]"
            style={{ background: "#0A1628" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center">
                  <Shield size={13} className="text-white" />
                </div>
                <span className="text-sm font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>LiveLock</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08]"
              >
                <X size={16} />
              </button>
            </div>
            <SidebarContent
              location={location}
              displayName={displayName}
              initials={initials}
              onLogout={() => logoutMutation.mutate()}
              hideLogo
            />
          </aside>
        </div>
      )}

      {/* ── Main content area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06]" style={{ background: "rgba(10,22,40,0.97)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center">
              <Shield size={13} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>LiveLock</span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08]"
          >
            <Menu size={18} />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// ── Sidebar content (shared between desktop and mobile) ───────────────────────

interface SidebarContentProps {
  location: string;
  displayName: string;
  initials: string;
  onLogout: () => void;
  hideLogo?: boolean;
}

function SidebarContent({ location, displayName, initials, onLogout, hideLogo }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      {!hideLogo && (
        <div className="px-4 py-5 border-b border-white/[0.06]">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center">
                <Shield size={13} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none" style={{ fontFamily: "Space Grotesk, sans-serif" }}>LiveLock</p>
                <p className="text-[9px] text-white/30 tracking-widest uppercase leading-none mt-0.5" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Human Verification Layer</p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = location === href || location.startsWith(href + "/");
          return (
            <Link key={href} href={href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${
                  isActive
                    ? "bg-[#00C9B1]/10 border border-[#00C9B1]/20 text-[#00C9B1]"
                    : "text-white/40 hover:text-white/80 hover:bg-white/[0.05]"
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="text-sm font-medium" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{label}</span>
                {isActive && <ChevronRight size={12} className="ml-auto opacity-60" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User profile + logout */}
      <div className="px-2 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00C9B1]/30 to-[#0077B6]/30 border border-[#00C9B1]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-[#00C9B1]" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate" style={{ fontFamily: "Space Grotesk, sans-serif" }}>{displayName}</p>
          </div>
          <button
            onClick={onLogout}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
            title="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
