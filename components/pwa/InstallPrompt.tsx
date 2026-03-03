"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem("oasis-pwa-dismissed");
      if (!dismissed || Date.now() - Number(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem("oasis-pwa-dismissed", String(Date.now()));
  }

  if (isStandalone || !showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 flex flex-col gap-2 p-4 rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
          <span className="text-xl">📱</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">Install Oasis</p>
          <p className="text-zinc-400 text-xs mt-0.5">
            Add to home screen for quick access
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-zinc-500 hover:text-zinc-400 text-xl leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleInstall} variant="primary" size="sm" className="flex-1">
          Install
        </Button>
        <Button onClick={handleDismiss} variant="outline" size="sm">
          Not now
        </Button>
      </div>
    </div>
  );
}
