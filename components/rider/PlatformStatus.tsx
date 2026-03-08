"use client";

import { useEffect, useState } from "react";
import { Truck, AlertTriangle } from "lucide-react";
import { ReportDeliveryImpact } from "./ReportDeliveryImpact";

interface PlatformStatus {
  platform: string;
  status: "normal" | "limited" | "paused";
  message: string;
  self_reports_last_2h?: number;
}

export function PlatformStatus() {
  const [data, setData] = useState<PlatformStatus | null>(null);

  useEffect(() => {
    fetch("/api/platform/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data || data.status === "normal") return null;

  const isPaused = data.status === "paused";

  return (
    <div
      className={`rounded-[20px] border overflow-hidden ${
        isPaused
          ? "border-red-500/20 bg-[#1a0e0e]"
          : "border-uber-yellow/20 bg-[#171409]"
      }`}
    >
      {/* Accent strip */}
      <div
        className={`h-0.5 ${
          isPaused
            ? "bg-gradient-to-r from-red-500/60 via-red-400/30 to-transparent"
            : "bg-gradient-to-r from-uber-yellow/60 via-uber-yellow/30 to-transparent"
        }`}
      />
      <div className="flex items-start gap-3 p-4">
        <div
          className={`flex items-center justify-center w-9 h-9 rounded-[12px] shrink-0 mt-0.5 ${
            isPaused ? "bg-uber-red/12" : "bg-uber-yellow/12"
          }`}
        >
          {isPaused ? (
            <AlertTriangle className="text-red-400" style={{ width: 16, height: 16 }} />
          ) : (
            <Truck className="text-uber-yellow" style={{ width: 16, height: 16 }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-[13px] font-semibold capitalize ${isPaused ? "text-uber-red" : "text-uber-yellow/90"}`}>
              {data.platform}
            </p>
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                isPaused
                  ? "bg-red-500/15 text-red-400 border border-red-500/20"
                  : "bg-uber-yellow/15 text-uber-yellow border border-uber-yellow/20"
              }`}
            >
              {data.status}
            </span>
          </div>
          <p className="text-[12px] text-zinc-400 leading-relaxed">{data.message}</p>
          {typeof data.self_reports_last_2h === "number" && data.self_reports_last_2h > 0 && (
            <p className="text-[11px] text-uber-yellow mt-1.5 font-medium">
              {data.self_reports_last_2h} rider{data.self_reports_last_2h === 1 ? "" : "s"} in your zone reported issues
            </p>
          )}
          <div className="mt-3">
            <ReportDeliveryImpact />
          </div>
        </div>
      </div>
    </div>
  );
}
