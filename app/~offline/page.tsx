"use client";

import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Clock, RefreshCw, Shield, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0b0e14] text-zinc-100">
      <div className="text-center max-w-sm">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#111820] border border-[#1e2535] mx-auto mb-6">
          <WifiOff className="text-zinc-500" style={{ width: 32, height: 32 }} />
        </div>

        <Logo size={48} />

        <h1 className="text-2xl font-bold mt-4 mb-2">You&apos;re offline</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed text-sm">
          Don&apos;t worry — your coverage is still active. Oasis monitors disruptions
          automatically, even when you&apos;re offline.
        </p>

        {/* Cached info section */}
        <div className="rounded-[20px] bg-[#111820] border border-[#1e2535]/70 p-5 mb-6 text-left">
          <h2 className="text-[13px] font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <Shield className="text-emerald-400" style={{ width: 14, height: 14 }} />
            While offline:
          </h2>
          <ul className="space-y-2.5 text-[12px] text-zinc-400">
            <li className="flex items-start gap-2">
              <Clock className="text-sky-400 shrink-0 mt-0.5" style={{ width: 12, height: 12 }} />
              Your active policy remains in effect
            </li>
            <li className="flex items-start gap-2">
              <Shield className="text-emerald-400 shrink-0 mt-0.5" style={{ width: 12, height: 12 }} />
              Claims are processed automatically in the background
            </li>
            <li className="flex items-start gap-2">
              <RefreshCw className="text-violet-400 shrink-0 mt-0.5" style={{ width: 12, height: 12 }} />
              Your dashboard will sync when you reconnect
            </li>
          </ul>
        </div>

        <Button
          onClick={() => window.location.reload()}
          size="lg"
          fullWidth
        >
          <RefreshCw style={{ width: 14, height: 14 }} className="mr-2" />
          Try again
        </Button>
      </div>
    </div>
  );
}
