/**
 * PwaInstallPrompt
 * Shows a native-feeling "Add to Home Screen" banner on mobile browsers
 * that support the beforeinstallprompt event (Chrome/Android).
 * On iOS Safari, shows manual instructions since iOS doesn't support the event.
 */
import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Don't show if user already dismissed
    if (localStorage.getItem('pwa-prompt-dismissed')) return;

    // Check for iOS Safari
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as { standalone?: boolean }).standalone;
    if (isIos && !isInStandaloneMode) {
      const timer = setTimeout(() => setShowIosPrompt(true), 4000);
      return () => clearTimeout(timer);
    }

    // Chrome/Android: listen for the install event
    const handler = (e: Event) => {
      e.preventDefault();
      const timer = setTimeout(() => setInstallEvent(e as BeforeInstallPromptEvent), 3000);
      return () => clearTimeout(timer);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') {
      setInstallEvent(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setInstallEvent(null);
    setShowIosPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', '1');
  };

  if (dismissed) return null;

  // Android/Chrome install banner
  if (installEvent) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl p-4 shadow-2xl flex items-center gap-3"
        style={{
          background: 'rgba(10, 22, 40, 0.97)',
          border: '1px solid rgba(0, 201, 177, 0.3)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{ background: 'rgba(0, 201, 177, 0.15)', border: '1px solid rgba(0, 201, 177, 0.3)' }}
        >
          <Download size={18} className="text-[#00C9B1]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">Install LiveLock</p>
          <p className="text-xs text-white/50 leading-tight mt-0.5">Add to your home screen for instant access</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0A1628] flex-shrink-0"
          style={{ background: '#00C9B1' }}
        >
          Install
        </button>
        <button onClick={handleDismiss} className="text-white/40 hover:text-white/70 flex-shrink-0 ml-1">
          <X size={16} />
        </button>
      </div>
    );
  }

  // iOS Safari instructions
  if (showIosPrompt) {
    return (
      <div
        className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl p-4 shadow-2xl"
        style={{
          background: 'rgba(10, 22, 40, 0.97)',
          border: '1px solid rgba(0, 201, 177, 0.3)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm font-semibold text-white">Install LiveLock on iPhone</p>
          <button onClick={handleDismiss} className="text-white/40 hover:text-white/70 ml-2 flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60 leading-relaxed">
          <span>Tap</span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[#00C9B1]"
            style={{ background: 'rgba(0, 201, 177, 0.1)', border: '1px solid rgba(0, 201, 177, 0.2)' }}
          >
            <Share size={11} />
            Share
          </span>
          <span>then</span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-white/80"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            Add to Home Screen
          </span>
        </div>
      </div>
    );
  }

  return null;
}
