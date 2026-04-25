'use client';

import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Download, ShieldCheck, X, Zap } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  const onRiderSurfaces =
    pathname === '/dashboard' ||
    (pathname?.startsWith('/dashboard/') ?? false) ||
    pathname?.startsWith('/onboarding');

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = Number(localStorage.getItem('oasis-pwa-dismissed') ?? '0');
      const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
      if (!dismissed || Date.now() - dismissed > FOURTEEN_DAYS) {
        setShowBanner(true);
      }
    };

    const onAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
      localStorage.removeItem('oasis-pwa-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!onRiderSurfaces) {
      setShowBanner(false);
    }
  }, [onRiderSurfaces]);

  useEffect(() => {
    if (!showBanner) return;
    setClosing(false);
    setMounted(false);
    const id = window.setTimeout(() => setMounted(true), 10);
    return () => window.clearTimeout(id);
  }, [showBanner]);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setClosing(true);
    localStorage.setItem('oasis-pwa-dismissed', String(Date.now()));
    window.setTimeout(() => setShowBanner(false), 220);
  }

  if (isStandalone || !showBanner || !onRiderSurfaces) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50">
      <div
        className={[
          'rounded-2xl border border-white/10 bg-zinc-950/90 backdrop-blur-xl overflow-hidden',
          'shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_60px_rgba(0,0,0,0.65)]',
          'transition-all duration-200 ease-out will-change-transform',
          mounted && !closing
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-3 scale-[0.98]',
        ].join(' ')}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-uber-green-500/15 border border-uber-green-500/20 flex items-center justify-center shrink-0">
              <Logo size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white tracking-tight">Install Oasis</p>
              <p className="mt-0.5 text-xs text-white/55 leading-relaxed">
                Weekly cover at a glance · push payout alerts · works when the network drops
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/45 hover:text-white/70 transition-colors active:scale-95"
              aria-label="Dismiss"
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { Icon: Zap, label: 'Instant open' },
              { Icon: ShieldCheck, label: 'Full screen' },
              { Icon: Download, label: 'Cached shell' },
            ].map(({ Icon, label }) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2 text-center"
              >
                <Icon className="h-4 w-4 mx-auto text-white/70" />
                <p className="mt-1 text-[11px] font-semibold text-white/70 leading-tight">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <Button onClick={handleInstall} variant="primary" size="sm" className="flex-1">
              Install
            </Button>
            <Button onClick={handleDismiss} variant="outline" size="sm" className="px-4">
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
