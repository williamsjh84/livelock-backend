/*
 * LiveLock — "Clinical Trust" Design System
 * Homepage (/): Hard-core single-scroll CTA page.
 * Goal: Convert cold traffic (CFO/Controller/COO) into Early Access signups.
 *
 * Sections:
 *   1. Hero — headline, sub-headline, single CTA
 *   2. Threat — visceral fraud stats
 *   3. How It Works — 3-step plain-English explainer
 *   4. Demo Preview — embedded demo teaser with "Try full demo →"
 *   5. Social Proof — 3 testimonial quotes
 *   6. Second CTA — repeat the ask
 */
import { Shield, ArrowRight, CheckCircle2, Play, Lock, Zap, Users, ChevronRight } from 'lucide-react';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { Link } from 'wouter';
import { useState } from 'react';

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663365906737/dFrrqs8eKQpkBZzRWadPWF/hvl-hero-bg-SkXeHbsmMrQakrcRuHx8QJ.webp';

const STATS = [
  {
    value: '$25.6M',
    label: 'Lost in a single deepfake video call',
    source: 'Arup, 2024',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
  },
  {
    value: '400%',
    label: 'Surge in AI voice clone scams',
    source: '2024 → 2025',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
  },
  {
    value: '$2.9B',
    label: 'Lost to BEC fraud in a single year',
    source: 'FBI IC3, 2023',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
  },
];

const STEPS = [
  {
    number: '01',
    icon: Users,
    title: 'A high-risk action is requested',
    description: 'Your CFO receives an urgent email: "Wire $180,000 to this new account." Or a voice message. Or a Slack DM. It looks real. It might not be.',
    color: 'text-[#00C9B1]',
    bg: 'bg-[#00C9B1]/10',
    border: 'border-[#00C9B1]/20',
  },
  {
    number: '02',
    icon: Zap,
    title: 'LiveLock sends a 10-second challenge',
    description: 'Before approving, both parties open LiveLock. Each speaks a unique one-time word and confirms hearing the other. The challenge runs on a separate, encrypted channel — not email, not phone.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
  {
    number: '03',
    icon: Lock,
    title: 'Identity confirmed. Action approved.',
    description: 'Both parties verified. The action proceeds with a timestamped audit record. If either party fails the challenge — or doesn\'t respond — the action is blocked.',
    color: 'text-[#00C9B1]',
    bg: 'bg-[#00C9B1]/10',
    border: 'border-[#00C9B1]/20',
  },
];

const TESTIMONIALS = [
  {
    initials: 'JR',
    name: 'James R.',
    role: 'CFO, Manufacturing',
    quote: 'We were targeted by a deepfake wire fraud attempt last year. LiveLock would have stopped it cold. This is exactly what small finance teams need.',
  },
  {
    initials: 'SK',
    name: 'Sandra K.',
    role: 'Controller, Real Estate',
    quote: 'Our team handles $2M+ in wires every week. The idea of a live human check before each one is exactly what we\'ve been looking for.',
  },
  {
    initials: 'TM',
    name: 'Thomas M.',
    role: 'COO, Legal Services',
    quote: 'AI voice cloning is already being used against law firms. LiveLock is the right tool at exactly the right time.',
  },
];

export default function Home() {
  const [demoHovered, setDemoHovered] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A1628]">
      <NavBar />

      {/* ── HERO ── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-24 overflow-hidden"
        style={{
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[#0A1628]/75" />

        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(0,201,177,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00C9B1]/10 border border-[#00C9B1]/20 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00C9B1] animate-pulse" />
            <span className="text-xs text-[#00C9B1] font-semibold tracking-wider uppercase">Private Beta — Limited Access</span>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.05] tracking-tight"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Before you approve<br />
            that wire,{' '}
            <span
              className="text-[#00C9B1]"
              style={{ textShadow: '0 0 40px rgba(0,201,177,0.4)' }}
            >
              verify the human.
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-lg md:text-xl text-white/55 mb-10 max-w-2xl mx-auto leading-relaxed">
            AI can clone a voice, fake a face, and forge an email in seconds. LiveLock gives your team a 10-second, out-of-band identity check before any action that can't be undone.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/early-access">
              <button className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-[#00C9B1] text-[#0A1628] font-bold text-base hover:bg-[#00B8A2] transition-all active:scale-[0.98] shadow-xl shadow-[#00C9B1]/25">
                Request Early Access
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <Link href="/demo">
              <button className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl border border-white/15 text-white/70 font-semibold text-base hover:border-[#00C9B1]/40 hover:text-white transition-all">
                <Play size={15} className="text-[#00C9B1]" />
                See it in action
              </button>
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-5 mt-10">
            {['Zero Trust Architecture', 'Out-of-Band Channel', '<10 Second Verify', 'Immutable Audit Log'].map((label) => (
              <div key={label} className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-[#00C9B1]" />
                <span className="text-xs text-white/45">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-30">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-[#00C9B1]" />
          <span className="text-[10px] text-white/50 tracking-widest uppercase">Scroll</span>
        </div>
      </section>

      {/* ── THREAT STATS ── */}
      <section className="py-20 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] uppercase tracking-widest text-red-400/70 mb-3">The Threat Is Real</p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              The attacks are already happening.
            </h2>
            <p className="text-sm text-white/45 max-w-xl mx-auto leading-relaxed">
              AI-generated voice, video, and email impersonation is making it impossible to trust your normal communication channels. These are not hypothetical — they are documented, sourced incidents.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {STATS.map((stat, i) => (
              <div
                key={i}
                className={`p-6 rounded-2xl ${stat.bg} border ${stat.border} text-center`}
              >
                <p
                  className={`text-4xl font-bold ${stat.color} mb-2`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {stat.value}
                </p>
                <p className="text-sm text-white/60 leading-snug mb-1">{stat.label}</p>
                <p className="text-[10px] text-white/25 uppercase tracking-wider">{stat.source}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href="/incidents">
              <button className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-[#00C9B1] transition-colors">
                View 10 documented real-world cases
                <ChevronRight size={14} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-3">How It Works</p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Three steps. Ten seconds.<br />Fraud stopped.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={i}
                  className={`relative p-6 rounded-2xl ${step.bg} border ${step.border} overflow-hidden`}
                >
                  {/* Step number watermark */}
                  <div
                    className={`absolute top-4 right-4 text-5xl font-black ${step.color} opacity-10 select-none`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {step.number}
                  </div>

                  <div className={`w-10 h-10 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center mb-4`}>
                    <Icon size={18} className={step.color} />
                  </div>
                  <h3
                    className="text-base font-bold text-white mb-2"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm text-white/45 leading-relaxed">{step.description}</p>

                  {/* Connector arrow (not on last) */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <ChevronRight size={18} className="text-white/15" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link href="/how-it-works">
              <button className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-[#00C9B1] transition-colors">
                See the full technical walkthrough
                <ChevronRight size={14} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── DEMO PREVIEW ── */}
      <section className="py-20 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-3">Interactive Demo</p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              See it before you commit.
            </h2>
            <p className="text-sm text-white/45 max-w-lg mx-auto leading-relaxed">
              Try the full split-screen simulation — both sides of a live verification session, running simultaneously on your screen.
            </p>
          </div>

          {/* Demo preview card */}
          <Link href="/demo">
            <div
              className="relative rounded-2xl border border-[#00C9B1]/20 bg-[#00C9B1]/5 overflow-hidden cursor-pointer group transition-all hover:border-[#00C9B1]/40 hover:bg-[#00C9B1]/8"
              onMouseEnter={() => setDemoHovered(true)}
              onMouseLeave={() => setDemoHovered(false)}
            >
              {/* Mock phone frames preview */}
              <div className="flex items-center justify-center gap-6 py-12 px-8">
                {/* Left phone mock */}
                <div className="w-36 h-64 rounded-2xl bg-[#0A1628] border border-white/10 flex flex-col overflow-hidden shadow-2xl flex-shrink-0">
                  <div className="h-6 bg-[#0A1628] border-b border-white/5 flex items-center justify-center">
                    <div className="w-12 h-1 rounded-full bg-white/10" />
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00C9B1]/20 border border-[#00C9B1]/30 flex items-center justify-center">
                      <Shield size={16} className="text-[#00C9B1]" />
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>LiveLock</p>
                      <p className="text-[7px] text-[#00C9B1]/60 uppercase tracking-wider">Initiator</p>
                    </div>
                    <div className="w-full space-y-1.5">
                      <div className="h-1.5 rounded-full bg-white/5 w-full" />
                      <div className="h-1.5 rounded-full bg-[#00C9B1]/20 w-3/4 mx-auto" />
                      <div className="h-1.5 rounded-full bg-white/5 w-2/3 mx-auto" />
                    </div>
                    <div className="w-full px-2 mt-1">
                      <div className="h-6 rounded-lg bg-[#00C9B1]/20 border border-[#00C9B1]/30 flex items-center justify-center">
                        <span className="text-[8px] text-[#00C9B1] font-semibold">FALCON</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center — vs badge */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[#00C9B1]/10 border border-[#00C9B1]/20 flex items-center justify-center">
                    <Zap size={14} className="text-[#00C9B1]" />
                  </div>
                  <div className="h-12 w-px bg-gradient-to-b from-[#00C9B1]/30 to-transparent" />
                  <p className="text-[9px] text-white/20 uppercase tracking-widest">Live</p>
                  <div className="h-12 w-px bg-gradient-to-t from-[#00C9B1]/30 to-transparent" />
                </div>

                {/* Right phone mock */}
                <div className="w-36 h-64 rounded-2xl bg-[#0A1628] border border-white/10 flex flex-col overflow-hidden shadow-2xl flex-shrink-0">
                  <div className="h-6 bg-[#0A1628] border-b border-white/5 flex items-center justify-center">
                    <div className="w-12 h-1 rounded-full bg-white/10" />
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-400/20 border border-blue-400/30 flex items-center justify-center">
                      <Shield size={16} className="text-blue-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>LiveLock</p>
                      <p className="text-[7px] text-blue-400/60 uppercase tracking-wider">Approver</p>
                    </div>
                    <div className="w-full space-y-1.5">
                      <div className="h-1.5 rounded-full bg-white/5 w-full" />
                      <div className="h-1.5 rounded-full bg-blue-400/20 w-3/4 mx-auto" />
                      <div className="h-1.5 rounded-full bg-white/5 w-2/3 mx-auto" />
                    </div>
                    <div className="w-full px-2 mt-1">
                      <div className="h-6 rounded-lg bg-blue-400/20 border border-blue-400/30 flex items-center justify-center">
                        <span className="text-[8px] text-blue-400 font-semibold">COBALT</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overlay play button */}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${demoHovered ? 'opacity-100' : 'opacity-0'}`}>
                <div className="bg-[#0A1628]/80 backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center gap-3 border border-[#00C9B1]/30">
                  <div className="w-10 h-10 rounded-full bg-[#00C9B1] flex items-center justify-center">
                    <Play size={16} className="text-[#0A1628] ml-0.5" fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Try the full demo</p>
                    <p className="text-xs text-white/40">No signup required</p>
                  </div>
                  <ArrowRight size={16} className="text-[#00C9B1]" />
                </div>
              </div>

              {/* Bottom label */}
              <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
                <p className="text-xs text-white/30">Interactive simulation — both sides shown simultaneously</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00C9B1] animate-pulse" />
                  <span className="text-[10px] text-[#00C9B1] font-semibold uppercase tracking-wider">Live Demo</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="py-20 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-3">Early Feedback</p>
            <h2
              className="text-3xl font-bold text-white"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Finance leaders get it immediately.
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-4"
              >
                <p className="text-sm text-white/60 leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#00C9B1]/15 border border-[#00C9B1]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#00C9B1]">{t.initials}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="text-[10px] text-white/35">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECOND CTA ── */}
      <section className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center shadow-xl shadow-[#00C9B1]/20 mx-auto mb-8"
          >
            <Shield size={24} className="text-white" />
          </div>
          <h2
            className="text-4xl font-bold text-white mb-4"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            Stop the next fraud attempt<br />before it costs you.
          </h2>
          <p className="text-base text-white/45 mb-10 max-w-md mx-auto leading-relaxed">
            LiveLock is in private beta. We're onboarding small teams who handle high-risk financial actions and want to stop AI impersonation fraud before it happens.
          </p>
          <Link href="/early-access">
            <button className="group inline-flex items-center gap-2.5 px-10 py-4 rounded-xl bg-[#00C9B1] text-[#0A1628] font-bold text-base hover:bg-[#00B8A2] transition-all active:scale-[0.98] shadow-xl shadow-[#00C9B1]/25">
              Request Early Access
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </Link>
          <p className="text-xs text-white/20 mt-4">No credit card required. Limited spots available.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
