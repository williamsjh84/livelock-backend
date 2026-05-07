/*
 * LiveLock — "Clinical Trust" Design System
 * Demo page (/demo): Full interactive product demonstration.
 * - Split-screen live verification session
 * - Feature overview cards
 * - Use case library
 * - CTA to request early access
 */
import { Shield, Zap, Users, ClipboardList, AlertTriangle, CheckCircle2, ArrowRight, Info, ExternalLink, TrendingUp } from 'lucide-react';
import SplitDemoView from '@/components/SplitDemoView';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { useState } from 'react';
import { Link } from 'wouter';

// Tooltip badge for hero pills
function HeroBadge({ label, tooltip }: { label: string; tooltip: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00C9B1]/10 border border-[#00C9B1]/20 hover:bg-[#00C9B1]/20 transition-colors cursor-pointer"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        aria-label={`${label}: ${tooltip}`}
      >
        <CheckCircle2 size={12} className="text-[#00C9B1] flex-shrink-0" />
        <span className="text-xs text-white/70">{label}</span>
        <Info size={10} className="text-[#00C9B1]/50 flex-shrink-0" />
      </button>
      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-3 py-2 rounded-xl text-[11px] text-white/80 leading-relaxed z-50 pointer-events-none"
          style={{
            background: 'rgba(10,22,40,0.97)',
            border: '1px solid rgba(0,201,177,0.25)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <span className="font-semibold text-[#00C9B1]">{label}:</span> {tooltip}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(0,201,177,0.25)' }} />
        </div>
      )}
    </div>
  );
}

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663365906737/dFrrqs8eKQpkBZzRWadPWF/hvl-hero-bg-SkXeHbsmMrQakrcRuHx8QJ.webp';
const VERIFIED_BADGE = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663365906737/dFrrqs8eKQpkBZzRWadPWF/hvl-verified-badge-dTyF6HkNtE8oq5ZB8UAmtn.webp';
const DEMO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663365906737/dFrrqs8eKQpkBZzRWadPWF/hvl-split-demo-bg-A4GEQQcxFzfYPKFdqDfd3J.webp';

const FEATURES = [
  {
    icon: Shield,
    title: 'Identity Setup',
    description: 'Device-bound accounts with biometric unlock. Your identity is tied to your physical device — not just a password.',
    status: 'planned',
    color: 'text-[#00C9B1]',
    bg: 'bg-[#00C9B1]/10',
    border: 'border-[#00C9B1]/20',
  },
  {
    icon: Users,
    title: 'Trusted Network',
    description: 'Invite teammates via phone or email. Mutual approval required before anyone joins your verification circle.',
    status: 'demo',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
  {
    icon: Zap,
    title: 'Live Verification',
    description: 'Two-round asymmetric challenge. Both parties speak and listen — mutual identity confirmed in under 10 seconds.',
    status: 'live',
    color: 'text-[#00C9B1]',
    bg: 'bg-[#00C9B1]/10',
    border: 'border-[#00C9B1]/20',
  },
  {
    icon: ClipboardList,
    title: 'Audit Log',
    description: 'Every session is timestamped and logged. Who verified whom, when, and for what action — immutable record.',
    status: 'demo',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/20',
  },
];

type ThreatCategory = 'Financial' | 'System Access' | 'HR & Legal';

const USE_CASES: { label: string; threat: string; category: ThreatCategory }[] = [
  // Financial
  { label: '"Send this wire now" — urgent email from the CFO', threat: 'Email Compromise', category: 'Financial' },
  { label: 'Vendor calls to update their banking details', threat: 'Impersonation', category: 'Financial' },
  { label: 'Real estate attorney sends new closing instructions', threat: 'Wire Fraud', category: 'Financial' },
  // System Access
  { label: 'IT manager requests admin credentials over Slack', threat: 'Account Takeover', category: 'System Access' },
  { label: '"Your CEO" approves emergency system access on a video call', threat: 'Deepfake Video', category: 'System Access' },
  { label: 'Colleague asks you to share the client database — via text', threat: 'Data Exfiltration', category: 'System Access' },
  { label: 'Fake IT support requests remote desktop control', threat: 'Voice Clone', category: 'System Access' },
  // HR & Legal
  { label: 'Executive voice memo authorizes a new hire or termination', threat: 'Voice Clone', category: 'HR & Legal' },
  { label: 'Attorney instructs you to sign and return a contract — by email', threat: 'Impersonation', category: 'HR & Legal' },
  { label: 'Manager approves sensitive personnel data release over phone', threat: 'Deepfake Audio', category: 'HR & Legal' },
];

const CATEGORIES: ThreatCategory[] = ['Financial', 'System Access', 'HR & Legal'];

export default function Demo() {
  return (
    <div className="min-h-screen bg-[#0A1628]">
      <NavBar />

      {/* ── HERO ── */}
      <section
        className="relative min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-[#0A1628]/70" />

        <div className="relative z-10 max-w-2xl mx-auto">
          {/* Logo mark */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center shadow-lg shadow-[#00C9B1]/20">
              <Shield size={22} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-xl font-bold text-white leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>LiveLock</p>
              <p className="text-[10px] text-[#00C9B1]/80 tracking-widest uppercase">Human Verification Layer</p>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Before you act,<br />
            <span className="text-[#00C9B1]">verify the human.</span>
          </h1>

          <p className="text-base text-white/60 mb-8 max-w-lg mx-auto leading-relaxed">
            AI can clone a voice, fake a face, and forge an email. LiveLock gives your team a real-time, out-of-band identity check before any action that can't be undone.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <HeroBadge
              label="Zero Trust"
              tooltip="Never assume someone is who they claim to be — every action requires fresh verification, every time."
            />
            <HeroBadge
              label="Out-of-Band"
              tooltip="Verification happens on a separate secure channel, so attackers who control your email or phone can't intercept it."
            />
            <HeroBadge
              label="<10 Second Verify"
              tooltip="The full two-way challenge takes under 10 seconds — fast enough to use before every high-risk action."
            />
            <HeroBadge
              label="One-Time Challenge"
              tooltip="Each session generates a unique word pair that expires immediately — replaying or recording it is useless to an attacker."
            />
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO ── */}
      <section
        className="py-16 px-6 relative overflow-hidden"
        style={{
          backgroundImage: `url(${DEMO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[#0A1628]/85" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-2">Interactive Demo</p>
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>See It In Action</h2>
            <p className="text-sm text-white/40 max-w-md mx-auto">
              This simulation shows both sides of a verification session simultaneously. In production, each user sees only their own device.
            </p>
          </div>
          <SplitDemoView />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-2">Four-Feature MVP</p>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Built for small teams.</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className={`p-5 rounded-2xl border ${f.bg} ${f.border} relative overflow-hidden`}
                >
                  {f.status === 'live' && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00C9B1] animate-pulse" />
                      <span className="text-[9px] text-[#00C9B1] font-semibold tracking-wider uppercase">Live Demo</span>
                    </div>
                  )}
                  {f.status === 'planned' && (
                    <div className="absolute top-3 right-3">
                      <span className="text-[9px] text-white/30 font-semibold tracking-wider uppercase">Planned</span>
                    </div>
                  )}
                  <div className={`w-9 h-9 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center mb-3`}>
                    <Icon size={16} className={f.color} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{f.title}</h3>
                  <p className="text-xs text-white/45 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WHY IT MATTERS — TEASER ── */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-2">Why It Matters</p>
            <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>The attacks are already happening.</h2>
            <p className="text-sm text-white/50 max-w-xl mx-auto leading-relaxed">
              AI-generated voice, video, and email impersonation is making it impossible to trust your normal communication channels. These are not hypothetical — they are documented, sourced incidents.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {/* Stat 1 */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <p className="text-3xl font-bold text-red-400 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>$25.6M</p>
              <p className="text-xs text-white/40 leading-snug">Lost in a single deepfake video call — Arup, 2024</p>
            </div>
            {/* Stat 2 */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <p className="text-3xl font-bold text-amber-400 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>400%</p>
              <p className="text-xs text-white/40 leading-snug">Surge in AI voice clone scams, 2024 → 2025</p>
            </div>
            {/* Stat 3 */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
              <p className="text-3xl font-bold text-violet-400 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>220%</p>
              <p className="text-xs text-white/40 leading-snug">Rise in deepfake job interview infiltrations</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/incidents">
              <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] hover:border-[#00C9B1]/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center">
                    <TrendingUp size={14} className="text-[#00C9B1]" />
                  </div>
                  <p className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>News & Incidents</p>
                  <ArrowRight size={14} className="text-white/30 group-hover:text-[#00C9B1] transition-colors ml-auto" />
                </div>
                <p className="text-xs text-white/45 leading-relaxed">10 real-world documented cases — Arup, Ferrari, WPP, LastPass, Singapore, North Korea, and more. Sourced from CNN, Bloomberg, Guardian.</p>
              </div>
            </Link>
            <Link href="/threats">
              <div className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] hover:border-amber-400/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                    <AlertTriangle size={14} className="text-amber-400" />
                  </div>
                  <p className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Threat Library</p>
                  <ArrowRight size={14} className="text-white/30 group-hover:text-amber-400 transition-colors ml-auto" />
                </div>
                <p className="text-xs text-white/45 leading-relaxed">18 categorized attack scenarios across Financial, System Access, HR & Legal, and Physical & Identity — each with a plain-English explanation.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="py-20 px-6 border-t border-white/[0.04]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center shadow-lg shadow-[#00C9B1]/20 mx-auto mb-6">
            <Shield size={22} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Ready to protect your team?
          </h2>
          <p className="text-sm text-white/50 mb-8 max-w-md mx-auto leading-relaxed">
            LiveLock is in private beta. Join the waitlist and be among the first teams to stop AI impersonation fraud before it happens.
          </p>
          <Link href="/early-access">
            <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#00C9B1] text-[#0A1628] font-bold text-sm hover:bg-[#00B8A2] transition-all active:scale-[0.98] shadow-lg shadow-[#00C9B1]/20">
              Request Early Access
              <ArrowRight size={16} />
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
