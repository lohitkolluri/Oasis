"use client";

import { Flag } from "lucide-react";
import { ReportDeliveryImpact } from "./ReportDeliveryImpact";

export function ReportDeliverySection() {
  return (
    <div className="rounded-[20px] bg-surface-1 border border-white/10 overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-uber-yellow/30 via-transparent to-transparent" />
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-uber-yellow/10">
            <Flag className="text-uber-yellow" style={{ width: 14, height: 14 }} />
          </div>
          <p className="text-[13px] font-semibold text-zinc-300">
            Report delivery issue
          </p>
        </div>
        <ReportDeliveryImpact />
      </div>
    </div>
  );
}
