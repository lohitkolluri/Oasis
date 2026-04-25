'use client';

import { Logo } from '@/components/ui/Logo';
import { PlusSquare, Share2, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Shows "Add to Home Screen" hint for iOS/Safari (which lacks beforeinstallprompt).
 * Riders and admins can install the PWA via Share > Add to Home Screen.
 */
export function AddToHomeScreen() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  const onRiderSurfaces =
    pathname === '/dashboard' ||
    (pathname?.startsWith('/dashboard/') ?? false) ||
    pathname?.startsWith('/onboarding');

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    setIsStandalone(standalone);

    if (ios && isSafari && !standalone && onRiderSurfaces) {
      const key = 'oasis-ios-a2hs-dismissed';
      const dismissedAt = Number(localStorage.getItem(key) ?? '0');
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      if (!dismissedAt || Date.now() - dismissedAt > THIRTY_DAYS) setShow(true);
    } else {
      setShow(false);
    }
  }, [onRiderSurfaces]);

  useEffect(() => {
    if (!show) return;
    setClosing(false);
    setMounted(false);
    const id = window.setTimeout(() => setMounted(true), 10);
    return () => window.clearTimeout(id);
  }, [show]);

  function handleDismiss() {
    setClosing(true);
    localStorage.setItem('oasis-ios-a2hs-dismissed', String(Date.now()));
    window.setTimeout(() => setShow(false), 220);
  }

  if (!show || isStandalone) return null;

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
              <p className="text-sm font-semibold text-white tracking-tight">
                Add Oasis to your Home Screen
              </p>
              <p className="mt-0.5 text-xs text-white/55 leading-relaxed">
                Home Screen install unlocks full-screen mode, optional push alerts, and icon badges
                for new payout updates.
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

          <div className="mt-3 grid gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 grid place-items-center shrink-0">
                <Share2 className="h-4 w-4 text-white/70" />
              </div>
              <p className="text-[12px] text-white/70">
                Tap <span className="font-semibold text-white/85">Share</span> in Safari
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 grid place-items-center shrink-0">
                <PlusSquare className="h-4 w-4 text-white/70" />
              </div>
              <p className="text-[12px] text-white/70">
                Choose <span className="font-semibold text-white/85">Add to Home Screen</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] font-semibold text-white/80 hover:bg-white/[0.06] active:scale-[0.99] transition-all"
            type="button"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
