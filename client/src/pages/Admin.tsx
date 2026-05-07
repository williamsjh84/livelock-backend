/**
 * LiveLock — Admin Panel
 * Owner-only view at /admin.
 * Shows Early Access signup stats, a searchable/sortable table, and CSV export.
 */
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import {
  Shield,
  Users,
  TrendingUp,
  Calendar,
  Search,
  Download,
  ArrowLeft,
  Loader2,
  Lock,
  ChevronUp,
  ChevronDown,
  Mail,
  Building2,
} from "lucide-react";

type SortField = "createdAt" | "firstName" | "company" | "teamSize";
type SortDir = "asc" | "desc";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div
      className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] flex items-center gap-4"
      style={{ background: "rgba(10,22,40,0.7)" }}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0`}
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          {value}
        </p>
        <p className="text-xs text-white/40">{label}</p>
      </div>
    </div>
  );
}

function exportToCSV(signups: NonNullable<ReturnType<typeof useSignups>["data"]>["signups"]) {
  const headers = ["ID", "First Name", "Last Name", "Email", "Company", "Team Size", "Use Case", "Message", "Signed Up"];
  const rows = signups.map((s) => [
    s.id,
    s.firstName,
    s.lastName,
    s.email,
    s.company,
    s.teamSize,
    s.useCase,
    s.message ?? "",
    new Date(s.createdAt).toISOString(),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `livelock-signups-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function useSignups() {
  return trpc.earlyAccess.listSignups.useQuery();
}

export default function Admin() {
  const { user, loading } = useAuth();
  const { data, isLoading, error } = useSignups();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [, setLocation] = useLocation();

  // Redirect non-authenticated users to home after load
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/");
    }
  }, [loading, user, setLocation]);

  // Auth guard
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <Loader2 className="text-[#00C9B1] animate-spin" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center mb-2">
          <Lock size={24} className="text-[#00C9B1]" />
        </div>
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          Authentication Required
        </h1>
        <p className="text-sm text-white/50 max-w-xs">You must be signed in as the LiveLock owner to access this panel.</p>
        <a
          href={getLoginUrl()}
          className="mt-2 px-5 py-2.5 rounded-xl bg-[#00C9B1] text-[#0A1628] text-sm font-semibold hover:bg-[#00b8a2] transition-colors"
        >
          Sign In
        </a>
      </div>
    );
  }

  if (error) {
    const isForbidden = error.message?.includes("10002");
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2">
          <Lock size={24} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
          {isForbidden ? "Access Denied" : "Error"}
        </h1>
        <p className="text-sm text-white/50 max-w-xs">
          {isForbidden
            ? "This panel is restricted to the LiveLock owner account."
            : "Failed to load admin data. Please try again."}
        </p>
        <Link href="/">
          <span className="mt-2 px-5 py-2.5 rounded-xl bg-white/[0.06] text-white text-sm font-semibold hover:bg-white/[0.1] transition-colors cursor-pointer inline-block">
            Back to Home
          </span>
        </Link>
      </div>
    );
  }

  const signups = data?.signups ?? [];
  const stats = data?.stats ?? { total: 0, today: 0, thisWeek: 0 };

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return signups;
    return signups.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.company.toLowerCase().includes(q) ||
        s.useCase.toLowerCase().includes(q)
    );
  }, [signups, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number | Date = a[sortField] as string | Date;
      let bVal: string | number | Date = b[sortField] as string | Date;
      if (sortField === "createdAt") {
        aVal = new Date(aVal as Date).getTime();
        bVal = new Date(bVal as Date).getTime();
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp size={12} className="text-white/20" />;
    return sortDir === "asc" ? (
      <ChevronUp size={12} className="text-[#00C9B1]" />
    ) : (
      <ChevronDown size={12} className="text-[#00C9B1]" />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-white/[0.06] px-6 py-4"
        style={{ background: "rgba(10,22,40,0.97)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <span className="flex items-center gap-1.5 text-xs text-white/40 hover:text-[#00C9B1] transition-colors cursor-pointer">
                <ArrowLeft size={13} />
                livelock.io
              </span>
            </Link>
            <span className="text-white/20">/</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center">
                <Shield size={13} className="text-white" />
              </div>
              <span className="text-sm font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                Admin Panel
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30">
              Signed in as <span className="text-white/60">{user.name ?? user.email}</span>
            </span>
            <button
              onClick={() => exportToCSV(signups)}
              disabled={signups.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00C9B1]/10 border border-[#00C9B1]/20 text-[#00C9B1] text-xs font-medium hover:bg-[#00C9B1]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={12} />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            Early Access Signups
          </h1>
          <p className="text-sm text-white/40">All users who have requested early access to LiveLock.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Total Signups" value={stats.total} icon={Users} color="#00C9B1" />
          <StatCard label="Today" value={stats.today} icon={Calendar} color="#60a5fa" />
          <StatCard label="This Week" value={stats.thisWeek} icon={TrendingUp} color="#a78bfa" />
        </div>

        {/* Search + table */}
        <div
          className="rounded-2xl border border-white/[0.08] overflow-hidden"
          style={{ background: "rgba(10,22,40,0.7)" }}
        >
          {/* Search bar */}
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
            <Search size={15} className="text-white/30 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by name, email, company, or use case…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
            />
            {search && (
              <span className="text-xs text-white/30">
                {sorted.length} of {signups.length}
              </span>
            )}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="text-[#00C9B1] animate-spin" size={20} />
              <span className="text-sm text-white/40">Loading signups…</span>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users size={32} className="text-white/15" />
              <p className="text-sm text-white/30">
                {search ? "No signups match your search." : "No signups yet. Share livelock.io to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {[
                      { label: "Name", field: "firstName" as SortField },
                      { label: "Company", field: "company" as SortField },
                      { label: "Team Size", field: "teamSize" as SortField },
                      { label: "Use Case", field: null },
                      { label: "Signed Up", field: "createdAt" as SortField },
                    ].map(({ label, field }) => (
                      <th
                        key={label}
                        className={`px-5 py-3 text-left text-[10px] uppercase tracking-widest text-white/30 font-semibold ${field ? "cursor-pointer hover:text-white/60 select-none" : ""}`}
                        onClick={() => field && toggleSort(field)}
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          {field && <SortIcon field={field} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((signup, i) => (
                    <tr
                      key={signup.id}
                      className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}
                    >
                      {/* Name + email */}
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-white text-sm">
                          {signup.firstName} {signup.lastName}
                        </p>
                        <a
                          href={`mailto:${signup.email}`}
                          className="flex items-center gap-1 text-xs text-[#00C9B1]/70 hover:text-[#00C9B1] transition-colors mt-0.5"
                        >
                          <Mail size={10} />
                          {signup.email}
                        </a>
                      </td>
                      {/* Company */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={12} className="text-white/30 flex-shrink-0" />
                          <span className="text-white/70">{signup.company}</span>
                        </div>
                      </td>
                      {/* Team size */}
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#00C9B1]/10 text-[#00C9B1] border border-[#00C9B1]/20">
                          {signup.teamSize}
                        </span>
                      </td>
                      {/* Use case */}
                      <td className="px-5 py-3.5 max-w-[220px]">
                        <p className="text-white/50 text-xs leading-relaxed truncate" title={signup.useCase}>
                          {signup.useCase}
                        </p>
                        {signup.message && (
                          <p className="text-white/30 text-xs italic mt-0.5 truncate" title={signup.message}>
                            "{signup.message}"
                          </p>
                        )}
                      </td>
                      {/* Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="text-white/50 text-xs">
                          {new Date(signup.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-white/25 text-[10px]">
                          {new Date(signup.createdAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-[10px] text-white/20 mt-6">
          LiveLock Admin · Owner access only · {new Date().getFullYear()}
        </p>
      </main>
    </div>
  );
}
