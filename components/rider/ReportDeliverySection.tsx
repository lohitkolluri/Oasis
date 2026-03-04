"use client";

import { Flag } from "lucide-react";
import { ReportDeliveryImpact } from "./ReportDeliveryImpact";

/**
 * Always-visible section so riders can report delivery issues even when platform status is "normal".
 * PlatformStatus only shows when limited/paused, so this ensures the feature is discoverable.
 */
export function ReportDeliverySection() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
        <Flag className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        Having trouble delivering in your zone?
      </p>
      <ReportDeliveryImpact />
    </div>
  );
}
