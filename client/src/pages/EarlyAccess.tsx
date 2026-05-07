/**
 * LiveLock — "Clinical Trust" Design System
 * Early Access page: Interest capture form for waitlist signups.
 * Collects name, company, email, team size, and primary use case.
 * Submits to the real tRPC backend and stores in the database.
 */
import { useState } from 'react';
import { Shield, CheckCircle2, ArrowRight, Users, Building2, Mail, User, Zap, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';

const USE_CASES = [
  'Wire transfers & payment approvals',
  'Invoice & contract approvals',
  'System access & credential changes',
  'HR decisions & personnel actions',
  'Legal document execution',
  'Other high-risk actions',
];

const TEAM_SIZES = [
  '2–5 people',
  '6–15 people',
  '16–50 people',
  '51–200 people',
  '200+ people',
];

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  teamSize: string;
  useCase: string;
  message: string;
}

const EMPTY_FORM: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  company: '',
  teamSize: '',
  useCase: '',
  message: '',
};

// Social proof entries
const SOCIAL_PROOF = [
  { initials: 'JR', name: 'James R.', role: 'CFO, Manufacturing', quote: 'We were targeted by a deepfake wire fraud attempt. LiveLock would have stopped it cold.' },
  { initials: 'SK', name: 'Sandra K.', role: 'Controller, Real Estate', quote: 'Our team handles $2M+ wires weekly. The idea of a live human check before each one is exactly what we need.' },
  { initials: 'TM', name: 'Thomas M.', role: 'COO, Legal Services', quote: 'AI voice cloning is already being used against law firms. This is the right tool at the right time.' },
];

export default function EarlyAccess() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const submitMutation = trpc.earlyAccess.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setServerError(null);
    },
    onError: (err) => {
      setServerError(err.message || 'Something went wrong. Please try again.');
    },
  });

  function validate(): boolean {
    const newErrors: Partial<FormData> = {};
    if (!form.firstName.trim()) newErrors.firstName = 'Required';
    if (!form.lastName.trim()) newErrors.lastName = 'Required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Valid email required';
    if (!form.company.trim()) newErrors.company = 'Required';
    if (!form.teamSize) newErrors.teamSize = 'Please select team size';
    if (!form.useCase) newErrors.useCase = 'Please select a use case';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setServerError(null);
    submitMutation.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      teamSize: form.teamSize,
      useCase: form.useCase,
      message: form.message.trim() || undefined,
    });
  }

  function handleChange(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex flex-col">
        <NavBar />
        <div className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="max-w-md w-full text-center">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 rounded-full bg-[#00C9B1]/10 border-2 border-[#00C9B1]/30 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} className="text-[#00C9B1]" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#00C9B1] flex items-center justify-center">
                <Shield size={12} className="text-[#0A1628]" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              You're on the list.
            </h1>
            <p className="text-sm text-white/50 mb-6 leading-relaxed">
              Thanks, <span className="text-white/80">{form.firstName}</span>. We'll be in touch with early access details for <span className="text-white/80">{form.company}</span> soon.
            </p>
            <div className="p-4 rounded-2xl bg-[#00C9B1]/[0.05] border border-[#00C9B1]/20 text-left mb-8">
              <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-2 font-medium">What happens next</p>
              {[
                'We review your submission within 2 business days',
                'You receive a private invite link for your team',
                'Onboard up to 5 team members in under 10 minutes',
                'Run your first live verification session',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5 mb-2 last:mb-0">
                  <div className="w-4 h-4 rounded-full bg-[#00C9B1]/15 border border-[#00C9B1]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[8px] font-bold text-[#00C9B1]">{i + 1}</span>
                  </div>
                  <p className="text-[11px] text-white/50">{step}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <Link href="/">
                <button className="px-5 py-2.5 rounded-xl border border-white/10 text-white/60 text-xs hover:text-white/80 hover:border-white/20 transition-all" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Back to Demo
                </button>
              </Link>
              <Link href="/how-it-works">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00C9B1] text-[#0A1628] text-xs font-bold hover:bg-[#00B8A2] transition-all" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  How It Works
                  <ArrowRight size={12} />
                </button>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col">
      <NavBar />

      {/* ── HEADER ── */}
      <section className="py-14 px-6 border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00C9B1]/[0.08] border border-[#00C9B1]/[0.2] mb-5">
            <Zap size={11} className="text-[#00C9B1]" />
            <span className="text-[10px] uppercase tracking-widest text-[#00C9B1]/80 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Limited Early Access
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Request Early Access
          </h1>
          <p className="text-sm text-white/50 max-w-lg mx-auto leading-relaxed">
            LiveLock is currently in private beta. We're onboarding small teams who handle high-risk actions and want to stop AI impersonation fraud before it happens.
          </p>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <section className="py-14 px-6 flex-1">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10">

          {/* ── FORM (3 cols) ── */}
          <div className="md:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    First Name
                  </label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={e => handleChange('firstName', e.target.value)}
                      placeholder="Sarah"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border text-sm text-white placeholder-white/20 outline-none transition-all focus:border-[#00C9B1]/40 focus:bg-white/[0.06] ${errors.firstName ? 'border-red-400/40' : 'border-white/[0.08]'}`}
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    />
                  </div>
                  {errors.firstName && <p className="text-[10px] text-red-400 mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={e => handleChange('lastName', e.target.value)}
                    placeholder="Chen"
                    className={`w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border text-sm text-white placeholder-white/20 outline-none transition-all focus:border-[#00C9B1]/40 focus:bg-white/[0.06] ${errors.lastName ? 'border-red-400/40' : 'border-white/[0.08]'}`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  />
                  {errors.lastName && <p className="text-[10px] text-red-400 mt-1">{errors.lastName}</p>}
                </div>
              </div>

              {/* Work email */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Work Email
                </label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => handleChange('email', e.target.value)}
                    placeholder="sarah@yourcompany.com"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border text-sm text-white placeholder-white/20 outline-none transition-all focus:border-[#00C9B1]/40 focus:bg-white/[0.06] ${errors.email ? 'border-red-400/40' : 'border-white/[0.08]'}`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  />
                </div>
                {errors.email && <p className="text-[10px] text-red-400 mt-1">{errors.email}</p>}
              </div>

              {/* Company */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Company Name
                </label>
                <div className="relative">
                  <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input
                    type="text"
                    value={form.company}
                    onChange={e => handleChange('company', e.target.value)}
                    placeholder="Acme Corp"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border text-sm text-white placeholder-white/20 outline-none transition-all focus:border-[#00C9B1]/40 focus:bg-white/[0.06] ${errors.company ? 'border-red-400/40' : 'border-white/[0.08]'}`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  />
                </div>
                {errors.company && <p className="text-[10px] text-red-400 mt-1">{errors.company}</p>}
              </div>

              {/* Team size */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Team Size
                </label>
                <div className="relative">
                  <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                  <select
                    value={form.teamSize}
                    onChange={e => handleChange('teamSize', e.target.value)}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] border text-sm text-white outline-none transition-all focus:border-[#00C9B1]/40 appearance-none ${errors.teamSize ? 'border-red-400/40' : 'border-white/[0.08]'} ${!form.teamSize ? 'text-white/30' : ''}`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    <option value="" disabled className="bg-[#0F1E35]">Select team size</option>
                    {TEAM_SIZES.map(s => <option key={s} value={s} className="bg-[#0F1E35]">{s}</option>)}
                  </select>
                </div>
                {errors.teamSize && <p className="text-[10px] text-red-400 mt-1">{errors.teamSize}</p>}
              </div>

              {/* Primary use case */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Primary Use Case
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {USE_CASES.map(uc => (
                    <button
                      key={uc}
                      type="button"
                      onClick={() => handleChange('useCase', uc)}
                      className={`text-left px-3 py-2.5 rounded-xl border text-[11px] transition-all ${
                        form.useCase === uc
                          ? 'border-[#00C9B1]/40 bg-[#00C9B1]/[0.08] text-[#00C9B1]'
                          : 'border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/[0.12] hover:text-white/60'
                      }`}
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {uc}
                    </button>
                  ))}
                </div>
                {errors.useCase && <p className="text-[10px] text-red-400 mt-1">{errors.useCase}</p>}
              </div>

              {/* Optional message */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Anything else? <span className="text-white/20 normal-case tracking-normal">(optional)</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={e => handleChange('message', e.target.value)}
                  placeholder="Tell us about your team's situation or any specific concerns..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none transition-all focus:border-[#00C9B1]/40 focus:bg-white/[0.06] resize-none"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                />
              </div>

              {/* Server error */}
              {serverError && (
                <div className="p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20 flex items-start gap-2">
                  <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-400">{serverError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full py-3.5 rounded-xl bg-[#00C9B1] text-[#0A1628] font-bold text-sm hover:bg-[#00B8A2] transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed hvl-teal-glow"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    Request Early Access
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              <p className="text-[10px] text-white/25 text-center">
                No spam. No credit card. We'll reach out within 2 business days.
              </p>
            </form>
          </div>

          {/* ── SIDEBAR (2 cols) ── */}
          <div className="md:col-span-2 space-y-5">

            {/* Why early access */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-[10px] uppercase tracking-widest text-[#00C9B1]/60 mb-3 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Why Early Access?
              </p>
              {[
                { icon: <Users size={13} />, text: 'Onboard up to 5 team members free during beta' },
                { icon: <Zap size={13} />, text: 'Direct access to the founding team for feedback' },
                { icon: <Shield size={13} />, text: 'Shape the product roadmap — your use case matters' },
                { icon: <Lock size={13} />, text: 'Locked-in pricing before public launch' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-2.5 mb-3 last:mb-0">
                  <div className="w-6 h-6 rounded-lg bg-[#00C9B1]/10 flex items-center justify-center flex-shrink-0 text-[#00C9B1]">
                    {icon}
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {/* Threat stat */}
            <div className="p-4 rounded-2xl bg-red-500/[0.04] border border-red-500/[0.15]">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] uppercase tracking-widest text-red-400/70 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  The Threat Is Real
                </p>
              </div>
              <p className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>$25.6B</p>
              <p className="text-[11px] text-white/40 leading-relaxed">
                Lost to business email compromise and wire fraud in 2023 alone. AI deepfakes and voice cloning have made this 4× worse since 2022.
              </p>
            </div>

            {/* Social proof */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                What people are saying
              </p>
              {SOCIAL_PROOF.map(({ initials, name, role, quote }) => (
                <div key={name} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <p className="text-[11px] text-white/50 leading-relaxed mb-2.5 italic">"{quote}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#00C9B1]/15 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-[#00C9B1]">{initials}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-white/60" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{name}</p>
                      <p className="text-[9px] text-white/30">{role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
