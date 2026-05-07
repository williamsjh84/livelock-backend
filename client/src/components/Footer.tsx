/**
 * LiveLock — "Clinical Trust" Design System
 * Footer: Shared site footer used across all pages.
 * - LiveLock logo + tagline on the left
 * - Navigation links in the center
 * - "Built to stop AI impersonation fraud" line + copyright on the right
 */
import { Shield, Lock } from 'lucide-react';
import { Link } from 'wouter';

const NAV_LINKS = [
  { href: '/demo', label: 'Demo' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/threats', label: 'Threat Library' },
  { href: '/incidents', label: 'Incidents' },
  { href: '/early-access', label: 'Request Access' },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-auto" style={{ background: 'rgba(10,22,40,0.98)' }}>
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Main footer row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center flex-shrink-0">
                <Shield size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  LiveLock
                </p>
                <p className="text-[9px] text-white/30 tracking-widest uppercase leading-none mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Human Verification Layer
                </p>
              </div>
            </div>
            <p className="text-xs text-white/40 max-w-[220px] leading-relaxed">
              Before you act, verify the human. Real-time out-of-band identity checks for teams.
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-2">
            <p className="text-[9px] uppercase tracking-widest text-white/20 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Pages
            </p>
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href}>
                <span className="text-xs text-white/40 hover:text-[#00C9B1] transition-colors cursor-pointer">
                  {label}
                </span>
              </Link>
            ))}
          </nav>

          {/* Right column */}
          <div className="flex flex-col items-start md:items-end gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00C9B1]/[0.07] border border-[#00C9B1]/[0.15]">
              <Lock size={11} className="text-[#00C9B1]" />
              <span className="text-[10px] text-[#00C9B1]/80 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Built to stop AI impersonation fraud
              </span>
            </div>
            <p className="text-[10px] text-white/20">
              Zero Trust · Out-of-Band · One-Time Challenge
            </p>
          </div>
        </div>

        {/* Divider + copyright */}
        <div className="mt-8 pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-white/20">
            © {new Date().getFullYear()} LiveLock — Human Verification Layer. Prototype demo.
          </p>
          <p className="text-[10px] text-white/15">
            AI can fake a voice, a face, and an email. LiveLock can't be faked.
          </p>
        </div>

      </div>
    </footer>
  );
}
