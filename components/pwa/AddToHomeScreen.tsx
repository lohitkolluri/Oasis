"use client";

import { useState, useEffect } from "react";

/**
 * Shows "Add to Home Screen" hint for iOS/Safari (which lacks beforeinstallprompt).
 * Riders and admins can install the PWA via Share > Add to Home Screen.
 */
export function AddToHomeScreen() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;

    setIsIOS(!!ios);
    setIsStandalone(standalone);

    if (ios && !standalone) {
      const dismissed = sessionStorage.getItem("oasis-ios-hint-dismissed");
      if (!dismissed) setShow(true);
    }
  }, []);

  function handleDismiss() {
    setShow(false);
    sessionStorage.setItem("oasis-ios-hint-dismissed", "1");
  }

  if (!show || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 p-4 rounded-xl bg-zinc-900 border border-zinc-700 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-sm">Add Oasis to Home Screen</p>
          <p className="text-zinc-400 text-xs mt-0.5">
            Tap <span className="inline-flex items-center gap-1">Share → Add to Home Screen</span>
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-zinc-500 hover:text-zinc-400 text-xl leading-none shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
