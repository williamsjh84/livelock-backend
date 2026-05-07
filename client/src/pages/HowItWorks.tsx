/**
 * LiveLock — "Clinical Trust" Design System
 * How It Works page: Full A-to-Z real-world flow for Model A (Standalone App)
 * - Phase 1: Setup (one-time team enrollment)
 * - Phase 2: Trigger (high-risk action detected)
 * - Phase 3: Live Verification (two-round challenge)
 * - Phase 4: Release (action proceeds with audit log)
 * - Coming Soon: Model B (Teams/Slack) and API/Webhook integrations
 */
import { Shield, UserPlus, Bell, Mic, CheckCircle2, FileText, Slack, Code2, Lock, ArrowRight, Clock, Users, Zap } from 'lucide-react';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { Link } from 'wouter';

// ─── Phase data ───────────────────────────────────────────────────────────────

interface Step {
  letter: string;
  who: string;
  what: string;
  detail: string;
}

interface Phase {
  id: number;
  label: string;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  steps: Step[];
}

const PHASES: Phase[] = [
  {
    id: 1,
    label: 'Phase 1 — One Time',
    title: 'Team Setup',
    subtitle: 'Enroll your team once. Takes under 5 minutes per person.',
    color: '#00C9B1',
    bgColor: 'rgba(0,201,177,0.06)',
    borderColor: 'rgba(0,201,177,0.2)',
    icon: <UserPlus size={18} className="text-[#00C9B1]" />,
    steps: [
      {
        letter: 'A',
        who: 'Admin (IT or CFO)',
        what: 'Install LiveLock and invite team members by email address',
        detail: 'Works like Slack or Microsoft Teams onboarding — enter each person\'s work email and they receive an invite link. No IT department required.',
      },
      {
        letter: 'B',
        who: 'Each Team Member',
        what: 'Download the app and register their device',
        detail: 'Each person installs LiveLock on their phone or laptop. Their device is cryptographically registered — this is the "something you have" factor that AI cannot replicate.',
      },
      {
        letter: 'C',
        who: 'Each Team Member',
        what: 'Complete one-time identity binding',
        detail: 'A short video selfie, SMS confirmation, and optional PIN ties their real identity to their registered device. This is the anchor that makes the challenge words meaningful.',
      },
      {
        letter: 'D',
        who: 'Admin',
        what: 'Approve members into the Trusted Network',
        detail: 'Only admin-approved members can send or receive verification requests. The result is a closed, verified team roster — like a corporate contact book where every entry has been identity-verified.',
      },
    ],
  },
  {
    id: 2,
    label: 'Phase 2 — Every High-Risk Action',
    title: 'The Trigger',
    subtitle: 'A push notification — not a phone call — on a separate channel AI cannot reach.',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.06)',
    borderColor: 'rgba(245,158,11,0.2)',
    icon: <Bell size={18} className="text-[#F59E0B]" />,
    steps: [
      {
        letter: 'E',
        who: 'Sarah (Requester)',
        what: 'Is about to take a high-risk action',
        detail: 'Examples: approving a wire transfer, granting system access, signing a contract, authorizing a personnel change. Any action that cannot be undone.',
      },
      {
        letter: 'F',
        who: 'Sarah',
        what: 'Opens LiveLock and starts a verification request',
        detail: 'In Model A, Sarah manually opens LiveLock before the action. She selects who to verify with (e.g. Marcus, CEO) and what the action is (e.g. Wire Transfer — $180,000).',
      },
      {
        letter: 'G',
        who: 'Marcus (Approver)',
        what: 'Receives a silent push notification on his registered device',
        detail: 'The request travels through LiveLock\'s encrypted channel — completely separate from email, phone, or any channel an attacker might control. A deepfake on a video call cannot intercept this.',
      },
    ],
  },
  {
    id: 3,
    label: 'Phase 3 — 10 to 30 Seconds',
    title: 'Live Verification',
    subtitle: 'Two-round asymmetric challenge. Both parties verify each other.',
    color: '#818CF8',
    bgColor: 'rgba(129,140,248,0.06)',
    borderColor: 'rgba(129,140,248,0.2)',
    icon: <Mic size={18} className="text-[#818CF8]" />,
    steps: [
      {
        letter: 'H',
        who: 'Both open LiveLock',
        what: 'A live session begins — both phones show the same session ID',
        detail: 'The session is time-limited and one-time. The challenge words are generated fresh for every session and expire immediately after use.',
      },
      {
        letter: 'I',
        who: 'Sarah (speaks first)',
        what: 'Round 1: Sarah\'s app shows "SAY: FALCON." Marcus\'s app shows "YOU WILL HEAR: FALCON."',
        detail: 'The requester always speaks first. This lets the approver verify the requester\'s identity before they see or approve anything. Marcus confirms he heard the correct word.',
      },
      {
        letter: 'J',
        who: 'Marcus (speaks second)',
        what: 'Round 2: Marcus\'s app shows "SAY: COBALT." Sarah\'s app shows "YOU WILL HEAR: COBALT."',
        detail: 'Now Sarah verifies Marcus — confirming she is not talking to a man-in-the-middle or a deepfake impersonating her CEO. Neither party trusts the other until both rounds are complete.',
      },
      {
        letter: 'K',
        who: 'Both',
        what: 'Both tap Approve in the app',
        detail: 'The session is cryptographically signed with both parties\' device keys and a timestamp. This creates a tamper-evident record that both parties were present and consented.',
      },
    ],
  },
  {
    id: 4,
    label: 'Phase 4 — Immediate',
    title: 'Action Released',
    subtitle: 'The action proceeds. The session is permanently logged.',
    color: '#34D399',
    bgColor: 'rgba(52,211,153,0.06)',
    borderColor: 'rgba(52,211,153,0.2)',
    icon: <CheckCircle2 size={18} className="text-[#34D399]" />,
    steps: [
      {
        letter: 'L',
        who: 'Sarah',
        what: 'Proceeds with the original action',
        detail: 'With both identities confirmed, Sarah can now send the wire, grant the access, or sign the document — with full confidence she spoke to the real Marcus.',
      },
      {
        letter: 'M',
        who: 'LiveLock',
        what: 'Writes an immutable audit log entry',
        detail: 'The log records: who verified, who approved, what action was authorized, what challenge words were used, the exact timestamp, and both device IDs. This is your compliance and forensic record.',
      },
    ],
  },
];

// ─── Integration cards ────────────────────────────────────────────────────────

interface Integration {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  examples: string[];
}

const INTEGRATIONS: Integration[] = [
  {
    icon: <div className="flex items-center gap-1"><Slack size={18} className="text-white/60" /></div>,
    title: 'Model A — Standalone App',
    description: 'Team members connect via email invite inside LiveLock. Sarah manually opens LiveLock before any high-risk action. No integration with other tools required.',
    tag: 'Available Now',
    tagColor: '#00C9B1',
    tagBg: 'rgba(0,201,177,0.12)',
    examples: ['Email invite onboarding', 'Manual trigger by requester', 'Push notification to approver', 'Full audit log'],
  },
  {
    icon: <div className="flex items-center gap-2"><Slack size={16} className="text-[#E01E5A]" /><span className="text-white/40 text-xs">+</span><span className="text-xs text-white/40">Teams</span></div>,
    title: 'Model B — Slack & Teams Plugin',
    description: 'LiveLock lives inside Microsoft Teams or Slack. Verification requests appear as bot messages. Users never leave their existing workflow.',
    tag: 'Coming Soon',
    tagColor: '#F59E0B',
    tagBg: 'rgba(245,158,11,0.12)',
    examples: ['Slack bot integration', 'Microsoft Teams app', 'Inline approval workflow', 'Channel-based audit trail'],
  },
  {
    icon: <Code2 size={18} className="text-[#818CF8]" />,
    title: 'Model C — API & Webhooks',
    description: 'LiveLock exposes a REST API. Any software — QuickBooks, NetSuite, DocuSign, Salesforce — can trigger a verification request programmatically before releasing a high-risk action.',
    tag: 'Coming Soon',
    tagColor: '#818CF8',
    tagBg: 'rgba(129,140,248,0.12)',
    examples: ['REST API trigger', 'Webhook callbacks', 'Signed approval tokens', 'ERP / accounting integrations'],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col">
      <NavBar />

      {/* ── HEADER ── */}
      <section className="py-16 px-6 border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00C9B1]/[0.08] border border-[#00C9B1]/[0.2] mb-6">
            <Zap size={11} className="text-[#00C9B1]" />
            <span className="text-[10px] uppercase tracking-widest text-[#00C9B1]/80 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Real-World Flow
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            How LiveLock Works
          </h1>
          <p className="text-base text-white/50 max-w-xl mx-auto leading-relaxed">
            From team setup to verified action — a complete walkthrough of every step, in plain language.
          </p>

          {/* Quick stats */}
          <div className="flex items-center justify-center gap-8 mt-10">
            {[
              { icon: <Clock size={14} />, label: 'Setup time', value: '< 5 min' },
              { icon: <Zap size={14} />, label: 'Verification time', value: '10–30 sec' },
              { icon: <Users size={14} />, label: 'Parties required', value: '2 people' },
              { icon: <Lock size={14} />, label: 'Channels used', value: 'Out-of-band' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="text-[#00C9B1]/60">{icon}</div>
                <p className="text-lg font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{value}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PHASES ── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          {PHASES.map((phase, phaseIdx) => (
            <div key={phase.id}>
              {/* Phase header */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: phase.bgColor, border: `1px solid ${phase.borderColor}` }}
                >
                  {phase.icon}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-medium mb-0.5" style={{ color: phase.color, fontFamily: 'Space Grotesk, sans-serif' }}>
                    {phase.label}
                  </p>
                  <h2 className="text-xl font-bold text-white leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {phase.title}
                  </h2>
                </div>
              </div>
              <p className="text-sm text-white/40 mb-6 ml-12">{phase.subtitle}</p>

              {/* Steps */}
              <div className="ml-0 space-y-3">
                {phase.steps.map((step, stepIdx) => (
                  <div
                    key={step.letter}
                    className="flex gap-4 p-4 rounded-xl border transition-colors"
                    style={{ background: phase.bgColor, borderColor: phase.borderColor }}
                  >
                    {/* Letter badge */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5"
                      style={{ background: phase.color + '18', color: phase.color, fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {step.letter}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-white leading-snug" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {step.what}
                        </p>
                        <span
                          className="text-[9px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium uppercase tracking-wider"
                          style={{ background: phase.color + '15', color: phase.color, fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                          {step.who}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 leading-relaxed">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Connector arrow between phases */}
              {phaseIdx < PHASES.length - 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-px h-6 bg-white/[0.08]" />
                    <ArrowRight size={14} className="text-white/20 rotate-90" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── INTEGRATION MODELS ── */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-3 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Integration Roadmap
            </p>
            <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Three Ways to Deploy LiveLock
            </h2>
            <p className="text-sm text-white/40 max-w-lg mx-auto">
              Start with the standalone app. As your team grows, LiveLock meets you where you already work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {INTEGRATIONS.map((integration) => (
              <div
                key={integration.title}
                className="p-5 rounded-2xl border flex flex-col gap-4"
                style={{
                  background: integration.tagColor === '#00C9B1' ? 'rgba(0,201,177,0.05)' : 'rgba(255,255,255,0.02)',
                  borderColor: integration.tagColor === '#00C9B1' ? 'rgba(0,201,177,0.2)' : 'rgba(255,255,255,0.06)',
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: integration.tagBg }}
                  >
                    {integration.icon}
                  </div>
                  <span
                    className="text-[9px] px-2 py-1 rounded-full font-bold uppercase tracking-wider flex-shrink-0"
                    style={{ background: integration.tagBg, color: integration.tagColor, fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {integration.tag}
                  </span>
                </div>

                {/* Title + description */}
                <div>
                  <h3 className="text-sm font-bold text-white mb-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {integration.title}
                  </h3>
                  <p className="text-xs text-white/40 leading-relaxed">{integration.description}</p>
                </div>

                {/* Feature list */}
                <ul className="space-y-1.5 mt-auto">
                  {integration.examples.map((ex) => (
                    <li key={ex} className="flex items-center gap-2">
                      <div
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ background: integration.tagColor }}
                      />
                      <span className="text-[11px] text-white/35">{ex}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-14 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            See it in action
          </h2>
          <p className="text-sm text-white/40 mb-6">
            Try the interactive split-screen demo — both sides of a live verification session, right in your browser.
          </p>
          <Link href="/demo">
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-[#0A1628] transition-all hover:opacity-90 active:scale-95" style={{ background: '#00C9B1', fontFamily: 'Space Grotesk, sans-serif' }}>
              Try the Demo
              <ArrowRight size={14} />
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
