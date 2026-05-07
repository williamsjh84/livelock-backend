/**
 * LiveLock — "Clinical Trust" Design System
 * Threats page: Full categorized threat scenario library
 * - Financial, System Access, HR & Legal categories
 * - AI Video Generation emerging threat callout
 * - Links back to home and to news/incidents
 */
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

type ThreatCategory = 'Financial' | 'System Access' | 'HR & Legal' | 'Physical & Identity';

interface ThreatItem {
  label: string;
  threat: string;
  category: ThreatCategory;
  detail: string;
}

const THREATS: ThreatItem[] = [
  // Financial
  {
    label: '"Send this wire now" — urgent email from the CFO',
    threat: 'Email Compromise',
    category: 'Financial',
    detail: 'Attackers compromise or spoof executive email accounts and create urgency to bypass normal approval processes.',
  },
  {
    label: 'Vendor calls to update their banking details',
    threat: 'Impersonation',
    category: 'Financial',
    detail: 'A fraudster impersonates a known vendor over phone or email, redirecting future payments to a controlled account.',
  },
  {
    label: 'Real estate attorney sends new closing instructions',
    threat: 'Wire Fraud',
    category: 'Financial',
    detail: 'Email accounts of attorneys or title companies are compromised, and last-minute wiring instructions are changed.',
  },
  {
    label: 'AI-cloned CFO voice authorizes an emergency transfer',
    threat: 'Voice Clone',
    category: 'Financial',
    detail: 'Using just minutes of public audio, AI tools can clone an executive\'s voice to authorize transactions over the phone.',
  },
  {
    label: 'Deepfake CFO on video call approves a $25M wire',
    threat: 'Deepfake Video',
    category: 'Financial',
    detail: 'The Arup/Hong Kong incident: a finance worker was deceived by a full video call featuring deepfake recreations of colleagues.',
  },
  // System Access
  {
    label: 'IT manager requests admin credentials over Slack',
    threat: 'Account Takeover',
    category: 'System Access',
    detail: 'Attackers compromise Slack or Teams accounts and use them to request privileged credentials from IT staff.',
  },
  {
    label: '"Your CEO" approves emergency system access on a video call',
    threat: 'Deepfake Video',
    category: 'System Access',
    detail: 'Real-time deepfake video tools allow attackers to impersonate executives during live video calls to authorize access.',
  },
  {
    label: 'Colleague asks you to share the client database — via text',
    threat: 'Data Exfiltration',
    category: 'System Access',
    detail: 'Compromised phone numbers or messaging accounts are used to request sensitive data exports from trusted colleagues.',
  },
  {
    label: 'Fake IT support requests remote desktop control',
    threat: 'Voice Clone',
    category: 'System Access',
    detail: 'Attackers clone the voice of a known IT contact and call employees to request remote access under the guise of support.',
  },
  {
    label: 'North Korean IT worker hired via deepfake job interview',
    threat: 'Identity Fraud',
    category: 'System Access',
    detail: 'Documented FBI-warned scheme: state-sponsored actors use AI face-swap during video interviews to gain insider access.',
  },
  {
    label: 'Fake employee gains system access for months undetected',
    threat: 'Insider Threat',
    category: 'System Access',
    detail: 'Once inside, fraudulent employees exfiltrate data, install backdoors, or sabotage systems over extended periods.',
  },
  // HR & Legal
  {
    label: 'Executive voice memo authorizes a new hire or termination',
    threat: 'Voice Clone',
    category: 'HR & Legal',
    detail: 'AI-cloned audio of an executive can be used to issue HR directives — hiring, firing, or salary changes — without their knowledge.',
  },
  {
    label: 'Attorney instructs you to sign and return a contract — by email',
    threat: 'Impersonation',
    category: 'HR & Legal',
    detail: 'Compromised legal counsel email is used to send fraudulent contracts or redirect signed documents to attackers.',
  },
  {
    label: 'Manager approves sensitive personnel data release over phone',
    threat: 'Deepfake Audio',
    category: 'HR & Legal',
    detail: 'A cloned manager voice calls HR to authorize release of employee records, salary data, or personal information.',
  },
  {
    label: 'Fake board member approves a policy change via video',
    threat: 'Deepfake Video',
    category: 'HR & Legal',
    detail: 'Governance attacks target board-level decisions — using deepfake video to impersonate directors during remote meetings.',
  },
  // Physical & Identity
  {
    label: 'Deepfake face bypasses facial recognition at building entry',
    threat: 'Biometric Fraud',
    category: 'Physical & Identity',
    detail: 'AI-generated faces or video loops are used to defeat facial recognition systems at physical access points.',
  },
  {
    label: 'Synthetic identity used to open a business bank account',
    threat: 'Identity Synthesis',
    category: 'Physical & Identity',
    detail: 'AI generates fully synthetic identities with realistic documents, photos, and credit histories to open fraudulent accounts.',
  },
  {
    label: 'Cloned voice defeats bank voice authentication',
    threat: 'Voice Clone',
    category: 'Physical & Identity',
    detail: 'Financial institutions using voice biometrics for authentication are increasingly vulnerable to AI voice cloning attacks.',
  },
];

const CATEGORIES: ThreatCategory[] = ['Financial', 'System Access', 'HR & Legal', 'Physical & Identity'];

const CATEGORY_COLORS: Record<ThreatCategory, { text: string; bg: string; border: string; dot: string }> = {
  'Financial': { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', dot: 'bg-amber-400' },
  'System Access': { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', dot: 'bg-blue-400' },
  'HR & Legal': { text: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20', dot: 'bg-violet-400' },
  'Physical & Identity': { text: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20', dot: 'bg-rose-400' },
};

export default function Threats() {
  return (
    <div className="min-h-screen bg-[#0A1628]">

      {/* ── NAV ── */}
      <NavBar />

      {/* ── HEADER ── */}
      <section className="py-16 px-6 border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-3">Threat Library</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            The attacks LiveLock is designed to stop.
          </h1>
          <p className="text-sm text-white/50 max-w-2xl leading-relaxed mb-6">
            AI impersonation fraud is no longer theoretical. Every scenario below has a documented real-world analogue — a company that lost money, data, or access because they trusted a voice, face, or email without a second channel of verification.
          </p>
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map(cat => {
              const c = CATEGORY_COLORS[cat];
              const count = THREATS.filter(t => t.category === cat).length;
              return (
                <div key={cat} className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${c.bg} border ${c.border}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  <span className={`text-xs font-medium ${c.text}`}>{cat}</span>
                  <span className="text-[10px] text-white/30">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── THREAT GRID ── */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          {CATEGORIES.map(category => {
            const c = CATEGORY_COLORS[category];
            const items = THREATS.filter(t => t.category === category);
            return (
              <div key={category}>
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-1.5 h-5 rounded-full ${c.dot}`} />
                  <h2 className={`text-sm font-bold uppercase tracking-widest ${c.text}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{category}</h2>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold text-white/80 leading-snug flex-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {item.label}
                        </p>
                      </div>
                      <p className="text-[11px] text-white/40 leading-relaxed mb-3">{item.detail}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border} font-semibold`}>
                        {item.threat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* ── DEEPFAKE VIDEO CALLOUT ── */}
          <div
            className="p-6 rounded-2xl border relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(220,38,38,0.10) 0%, rgba(10,22,40,0.97) 60%)',
              borderColor: 'rgba(220,38,38,0.30)',
              boxShadow: '0 0 48px rgba(220,38,38,0.06) inset',
            }}
          >
            <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500">
              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-bold text-red-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>AI Video Generation — The Emerging Frontier</p>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 font-semibold">EMERGING THREAT</span>
                </div>
                <p className="text-sm text-white/60 leading-relaxed mb-3">
                  Real-time AI tools can now generate a live video feed of a fake co-worker using only a few photos. A fraudster can appear on a video call as your CFO, CEO, or trusted colleague — giving verbal and visual approval for a wire transfer, policy change, or system access grant — then disappear without a trace.
                </p>
                <p className="text-xs text-white/40 leading-relaxed mb-3">
                  In 2024, a finance worker at engineering firm Arup paid out $25 million after a video call featuring deepfake recreations of his CFO and other colleagues. The scam was only discovered weeks later. In 2025, Singapore saw a $499K deepfake CEO video scam. These are no longer edge cases.
                </p>
                <p className="text-xs text-[#00C9B1]/80 font-medium">
                  → LiveLock's out-of-band challenge cannot be intercepted by a video feed. The one-time word only appears on the real person's registered, device-bound app — not on any screen an attacker can see.
                </p>
              </div>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="text-center py-8">
            <p className="text-sm text-white/40 mb-4">See how LiveLock stops these attacks in real time.</p>
            <Link href="/demo">
              <button
                className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #00C9B1, #0077B6)', fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Try the Live Demo →
              </button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
