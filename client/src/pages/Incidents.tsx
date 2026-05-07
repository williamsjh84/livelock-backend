/**
 * LiveLock — "Clinical Trust" Design System
 * Incidents page: Real-world AI fraud and deepfake news articles (2024–2025)
 * - Sourced from CNN, Guardian, Bloomberg, Forbes, Hacker News, etc.
 * - Categorized by attack type with links to original articles
 */
import { ExternalLink, AlertTriangle, TrendingUp, Globe } from 'lucide-react';
import { Link } from 'wouter';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

interface Incident {
  title: string;
  summary: string;
  amount?: string;
  location: string;
  date: string;
  source: string;
  url: string;
  category: IncidentCategory;
  outcome: 'loss' | 'prevented' | 'ongoing';
  tags: string[];
}

type IncidentCategory = 'Deepfake Video' | 'Voice Clone' | 'Email Compromise' | 'Identity Fraud' | 'Insider Threat';

const INCIDENTS: Incident[] = [
  {
    title: 'Finance worker pays $25M after deepfake CFO video call',
    summary: 'A finance employee at UK engineering firm Arup was tricked into transferring $25.6 million after attending a video conference call in which all other participants — including the CFO — were AI-generated deepfakes. The worker had initial doubts but was reassured by the realistic appearance of colleagues he recognized.',
    amount: '$25.6 million',
    location: 'Hong Kong / UK',
    date: 'February 2024',
    source: 'CNN',
    url: 'https://edition.cnn.com/2024/02/04/asia/deepfake-cfo-scam-hong-kong-intl-hnk',
    category: 'Deepfake Video',
    outcome: 'loss',
    tags: ['CFO Impersonation', 'Video Call', 'Wire Transfer', 'Engineering Firm'],
  },
  {
    title: 'Ferrari executive stops deepfake CEO scam with one question',
    summary: 'A Ferrari executive received a WhatsApp message from someone claiming to be CEO Benedetto Vigna, asking to authorize a confidential acquisition. The executive grew suspicious of the slightly altered voice and asked a personal question only the real CEO would know — the fraudster immediately hung up. Ferrari\'s verification instinct prevented a major loss.',
    location: 'Italy',
    date: 'July 2024',
    source: 'Bloomberg',
    url: 'https://www.bloomberg.com/news/articles/2024-07-26/ferrari-narrowly-dodges-deepfake-scam-simulating-deal-hungry-ceo',
    category: 'Voice Clone',
    outcome: 'prevented',
    tags: ['CEO Impersonation', 'WhatsApp', 'Voice Clone', 'Acquisition Fraud'],
  },
  {
    title: 'WPP CEO Mark Read targeted in deepfake WhatsApp scam',
    summary: 'Fraudsters created a fake WhatsApp account using a publicly available photo of WPP CEO Mark Read, then set up a Microsoft Teams meeting with a voice clone of Read and another senior executive. The scam attempted to persuade a WPP agency head to set up a new business and provide personal financial information. The attempt was unsuccessful.',
    location: 'United Kingdom',
    date: 'May 2024',
    source: 'The Guardian',
    url: 'https://www.theguardian.com/technology/article/2024/may/17/uk-engineering-arup-deepfake-scam-hong-kong-ai-video',
    category: 'Deepfake Video',
    outcome: 'prevented',
    tags: ['CEO Impersonation', 'WhatsApp', 'Teams Meeting', 'Advertising Industry'],
  },
  {
    title: 'LastPass employee targeted with deepfake CEO audio via WhatsApp',
    summary: 'A LastPass employee received a series of calls, texts, and voicemails on WhatsApp from a threat actor impersonating CEO Karim Toubba using AI-generated audio. The employee correctly identified it as a social engineering attempt because the communication was happening outside normal work channels and the urgency was suspicious. LastPass publicly disclosed the attempt to warn others.',
    location: 'United States',
    date: 'April 2024',
    source: 'LastPass Security Blog',
    url: 'https://blog.lastpass.com/posts/attempted-audio-deepfake-call-targets-lastpass-employee',
    category: 'Voice Clone',
    outcome: 'prevented',
    tags: ['CEO Impersonation', 'Audio Deepfake', 'WhatsApp', 'Cybersecurity Company'],
  },
  {
    title: 'Singapore company loses $499K in deepfake CEO video scam',
    summary: 'A Singapore-based company lost approximately $499,000 after employees were deceived by a deepfake video call featuring what appeared to be their CEO. The fraudsters used AI-generated video to impersonate the executive during a live call, convincing finance staff to authorize a series of transfers. The incident is one of the first documented cases of real-time deepfake video used in a successful corporate fraud in Southeast Asia.',
    amount: '$499,000',
    location: 'Singapore',
    date: '2025',
    source: 'Tookitaki',
    url: 'https://www.tookitaki.com/blog/deepfake-ceo-scam-singapore-2025',
    category: 'Deepfake Video',
    outcome: 'loss',
    tags: ['CEO Impersonation', 'Video Call', 'Wire Transfer', 'Southeast Asia'],
  },
  {
    title: 'North Korean IT workers infiltrate US companies via deepfake interviews',
    summary: 'The FBI warned that North Korean state-sponsored operatives are using AI face-swap technology and deepfake video during remote job interviews to gain employment at US companies. Once hired, they exfiltrate sensitive data, install backdoors, and funnel salaries to fund weapons programs. Infiltrations surged 220% over 12 months. Companies in tech, defense, and finance were primary targets.',
    location: 'United States (Global)',
    date: '2024–2025',
    source: 'Fortune / CrowdStrike',
    url: 'https://fortune.com/2025/08/04/north-korean-it-worker-infiltrations-exploded/',
    category: 'Identity Fraud',
    outcome: 'ongoing',
    tags: ['State-Sponsored', 'Job Interview', 'Insider Threat', 'Data Exfiltration', 'North Korea'],
  },
  {
    title: 'AI voice cloning scams surge 400% — $200M lost in Q1 2025 alone',
    summary: 'A comprehensive industry report documented a 400% surge in AI voice cloning fraud between 2024 and 2025. Losses from voice clone scams exceeded $200 million in the first quarter of 2025 alone, with total imposter scam losses reaching $3 billion in 2024. Small and medium businesses were disproportionately affected due to lack of enterprise security controls.',
    amount: '$200M+ (Q1 2025)',
    location: 'United States',
    date: 'January 2026',
    source: 'GetOutOfDebt.org / FTC Data',
    url: 'https://getoutofdebt.org/230061/ai-voice-cloning-scams-surge-400-how-to-protect-yourself-and-your-family',
    category: 'Voice Clone',
    outcome: 'ongoing',
    tags: ['Industry Report', 'SMB Risk', 'FTC Data', 'Voice Clone Surge'],
  },
  {
    title: 'Deepfake job applicants can be created in 70 minutes — Palo Alto Networks',
    summary: 'Security researchers at Palo Alto Networks documented that fraudsters can construct a fully convincing deepfake job applicant — complete with AI-generated face, cloned voice, and fabricated credentials — in approximately 70 minutes. The technique is being actively used to place fake employees inside organizations, particularly for remote roles with system access.',
    location: 'Global',
    date: 'April 2025',
    source: 'HR Dive / Palo Alto Networks',
    url: 'https://www.hrdive.com/news/fake-job-applicant-deepfake-70-minutes/745924/',
    category: 'Identity Fraud',
    outcome: 'ongoing',
    tags: ['Hiring Fraud', 'Remote Work', 'Identity Synthesis', 'Research Finding'],
  },
  {
    title: 'UK deepfake attacks nearly double — 94% rise in 2025',
    summary: 'A Sumsub industry report found that deepfake fraud attempts in the United Kingdom nearly doubled in 2025, rising 94% year-over-year. Globally, sophisticated fraud increased 180%. Nearly 3 in 5 European consumers reported being a victim of some form of fraud in 2025, with AI-generated impersonation attacks representing the fastest-growing category.',
    location: 'United Kingdom / Europe',
    date: 'December 2025',
    source: 'Financial IT / Sumsub',
    url: 'https://financialit.net/news/fraud-detection/sophisticated-fraud-180-globally-and-uk-deepfake-attacks-double-warns-sumsub',
    category: 'Deepfake Video',
    outcome: 'ongoing',
    tags: ['Industry Report', 'UK', 'Europe', 'Fraud Statistics'],
  },
  {
    title: 'Deepfake hiring fraud: fake employees gaining access across organizations',
    summary: 'A detailed investigation by The Hacker News documented a systematic pattern of deepfake-driven hiring fraud, where fake employees use AI-generated identities to pass background checks, video interviews, and onboarding. Once inside, they steal data, compromise systems, and evade detection for months. The report identified cases across technology, healthcare, and financial services sectors.',
    location: 'Global',
    date: 'January 2026',
    source: 'The Hacker News',
    url: 'https://thehackernews.com/expert-insights/2026/01/deepfake-job-hires-when-your-next.html',
    category: 'Insider Threat',
    outcome: 'ongoing',
    tags: ['Hiring Fraud', 'Insider Threat', 'Data Breach', 'Multi-Sector'],
  },
];

const CATEGORY_COLORS: Record<IncidentCategory, { text: string; bg: string; border: string; dot: string }> = {
  'Deepfake Video': { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', dot: 'bg-red-400' },
  'Voice Clone': { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', dot: 'bg-amber-400' },
  'Email Compromise': { text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', dot: 'bg-orange-400' },
  'Identity Fraud': { text: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/20', dot: 'bg-violet-400' },
  'Insider Threat': { text: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20', dot: 'bg-rose-400' },
};

const OUTCOME_LABELS: Record<Incident['outcome'], { label: string; color: string; bg: string; border: string }> = {
  loss: { label: 'CONFIRMED LOSS', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/25' },
  prevented: { label: 'ATTACK PREVENTED', color: 'text-[#00C9B1]', bg: 'bg-[#00C9B1]/10', border: 'border-[#00C9B1]/25' },
  ongoing: { label: 'ONGOING TREND', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/25' },
};

const STATS = [
  { value: '$25.6M', label: 'Single largest deepfake video fraud (2024)', color: 'text-red-400' },
  { value: '400%', label: 'Surge in voice clone scams (2024→2025)', color: 'text-amber-400' },
  { value: '220%', label: 'Rise in North Korean IT worker infiltrations', color: 'text-violet-400' },
  { value: '94%', label: 'Increase in UK deepfake attacks (2025)', color: 'text-[#00C9B1]' },
];

export default function Incidents() {
  return (
    <div className="min-h-screen bg-[#0A1628]">

      {/* ── NAV ── */}
      <NavBar />

      {/* ── HEADER ── */}
      <section className="py-16 px-6 border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={12} className="text-[#00C9B1]/60" />
            <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60">Real-World Incidents · 2024–2025</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            News & Incidents
          </h1>
          <p className="text-sm text-white/50 max-w-2xl leading-relaxed mb-10">
            These are not hypothetical scenarios. Every incident below is a documented, sourced event — companies that lost millions, attacks that were narrowly prevented, and systemic trends that are accelerating. All sourced from major news outlets and security researchers.
          </p>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <p className={`text-2xl font-bold mb-1 ${s.color}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{s.value}</p>
                <p className="text-[11px] text-white/40 leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INCIDENTS LIST ── */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto space-y-5">
          {INCIDENTS.map((incident, i) => {
            const cat = CATEGORY_COLORS[incident.category];
            const outcome = OUTCOME_LABELS[incident.outcome];
            return (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/10 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full ${cat.bg} ${cat.text} border ${cat.border} font-semibold`}>
                        {incident.category}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full ${outcome.bg} ${outcome.color} border ${outcome.border} font-semibold`}>
                        {outcome.label}
                      </span>
                      {incident.amount && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20 font-semibold">
                          {incident.amount}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1 leading-snug" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {incident.title}
                    </h3>
                  </div>
                  <a
                    href={incident.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-[#00C9B1]/60 hover:text-[#00C9B1] transition-colors flex-shrink-0 mt-1"
                  >
                    <span className="hidden sm:inline">{incident.source}</span>
                    <ExternalLink size={11} />
                  </a>
                </div>

                <p className="text-xs text-white/50 leading-relaxed mb-3">{incident.summary}</p>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Globe size={10} className="text-white/25" />
                    <span className="text-[10px] text-white/35">{incident.location}</span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <span className="text-[10px] text-white/35">{incident.date}</span>
                  <div className="w-px h-3 bg-white/10" />
                  <div className="flex flex-wrap gap-1">
                    {incident.tags.slice(0, 3).map((tag, j) => (
                      <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/30">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── DISCLAIMER ── */}
      <section className="py-8 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <p className="text-[11px] text-white/30 leading-relaxed">
              <span className="text-white/50 font-semibold">Sources & Accuracy:</span> All incidents are sourced from publicly reported news articles, corporate disclosures, and security research reports. Dollar amounts and statistics reflect figures reported at time of publication. Links open original source articles. This page is maintained as a reference resource for LiveLock product demonstrations.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-12 px-6 text-center border-t border-white/[0.04]">
        <p className="text-sm text-white/40 mb-2">Every incident above could have been prevented with out-of-band verification.</p>
        <p className="text-xs text-white/25 mb-6">LiveLock adds the human checkpoint that AI impersonation cannot bypass.</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/demo">
            <button
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #00C9B1, #0077B6)', fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Try the Live Demo →
            </button>
          </Link>
          <Link href="/threats">
            <button className="px-6 py-3 rounded-xl text-sm font-semibold text-white/60 border border-white/10 hover:border-white/20 hover:text-white/80 transition-all">
              View Threat Library
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
