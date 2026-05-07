/**
 * LiveLock — "Clinical Trust" Design System
 * NavBar: Shared sticky top navigation bar used across all pages.
 * - Desktop: logo left, nav links + CTA right
 * - Mobile: logo left, hamburger right → slide-down drawer with all links
 */
import { Shield, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useState, useEffect } from 'react';

const NAV_LINKS = [
  { href: '/demo', label: 'Demo' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/threats', label: 'Threat Library' },
  { href: '/incidents', label: 'Incidents' },
];

const CTA_LINK = { href: '/early-access', label: 'Request Access' };
const SIGNIN_LINK = { href: '/login', label: 'Sign In' };

export default function NavBar() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <nav
        className="sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06]"
        style={{ background: 'rgba(10,22,40,0.97)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#00C9B1] to-[#0077B6] flex items-center justify-center flex-shrink-0">
                <Shield size={13} className="text-white" />
              </div>
              <div>
                <span
                  className="text-sm font-bold text-white leading-none"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  LiveLock
                </span>
                <span
                  className="hidden sm:block text-[9px] text-white/30 tracking-widest uppercase leading-none mt-0.5"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Human Verification Layer
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = location === href;
              return (
                <Link key={href} href={href}>
                  <span
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                      isActive
                        ? 'text-[#00C9B1] bg-[#00C9B1]/10 border border-[#00C9B1]/20'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
                    }`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
            <Link href={SIGNIN_LINK.href}>
              <span
                className={`text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                  location === SIGNIN_LINK.href
                    ? 'text-white bg-white/[0.08]'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
                }`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {SIGNIN_LINK.label}
              </span>
            </Link>
            <Link href={CTA_LINK.href}>
              <span
                className={`ml-1 text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                  location === CTA_LINK.href
                    ? 'bg-[#00C9B1] text-[#0A1628]'
                    : 'bg-[#00C9B1]/15 text-[#00C9B1] border border-[#00C9B1]/30 hover:bg-[#00C9B1]/25'
                }`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {CTA_LINK.label}
              </span>
            </Link>
          </div>

          {/* Mobile: CTA pill + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Link href={CTA_LINK.href}>
              <span
                className={`text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer font-semibold ${
                  location === CTA_LINK.href
                    ? 'bg-[#00C9B1] text-[#0A1628]'
                    : 'bg-[#00C9B1]/15 text-[#00C9B1] border border-[#00C9B1]/30'
                }`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Request Access
              </span>
            </Link>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Drawer panel */}
          <div
            className="absolute top-[57px] left-0 right-0 border-b border-white/[0.08] px-4 py-3 flex flex-col gap-1"
            style={{ background: 'rgba(10,22,40,0.99)' }}
            onClick={e => e.stopPropagation()}
          >
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = location === href;
              return (
                <Link key={href} href={href}>
                  <span
                    className={`block w-full text-sm px-4 py-3 rounded-xl transition-all cursor-pointer font-medium ${
                      isActive
                        ? 'text-[#00C9B1] bg-[#00C9B1]/10 border border-[#00C9B1]/20'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                    }`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
            <div className="mt-1 pt-3 border-t border-white/[0.06] flex flex-col gap-2">
              <Link href={SIGNIN_LINK.href}>
                <span
                  className="block w-full text-center text-sm px-4 py-3 rounded-xl font-medium border border-white/[0.10] text-white/70 cursor-pointer hover:bg-white/[0.05]"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Sign In with Passkey
                </span>
              </Link>
              <Link href={CTA_LINK.href}>
                <span
                  className="block w-full text-center text-sm px-4 py-3 rounded-xl font-semibold bg-[#00C9B1] text-[#0A1628] cursor-pointer"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Request Early Access
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
