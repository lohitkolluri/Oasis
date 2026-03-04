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
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data || data.status === "normal") return null;

  const isPaused = data.status === "paused";
  return (
    <div
      className={`rounded-xl border p-4 ${
        isPaused ? "border-red-500/30 bg-red-500/5" : "border-amber-500/25 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {isPaused ? (
            <AlertTriangle className="h-4 w-4 text-red-400" />
          ) : (
            <Truck className="h-4 w-4 text-amber-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 capitalize">
            {data.platform} — {data.status}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">{data.message}</p>
          {typeof data.self_reports_last_2h === "number" &&
            data.self_reports_last_2h > 0 && (
              <p className="text-xs text-amber-400 mt-1.5">
                {data.self_reports_last_2h} rider
                {data.self_reports_last_2h === 1 ? "" : "s"} in your zone reported
                issues
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
