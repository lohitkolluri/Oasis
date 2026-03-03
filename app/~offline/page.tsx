"use client";

import { Button } from "@/components/ui/Button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a0a] text-zinc-100">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold mb-2">You&apos;re offline</h1>
        <p className="text-zinc-400 mb-6">
          Connect to the internet to use Oasis. Your data will sync when you&apos;re back online.
        </p>
        <Button onClick={() => window.location.reload()} size="lg">
          Retry
        </Button>
      </div>
    </div>
  );
}
