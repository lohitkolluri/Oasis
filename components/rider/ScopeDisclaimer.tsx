import { ShieldAlert } from "lucide-react";

export function ScopeDisclaimer() {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-200 mb-1">Coverage scope</p>
          <p className="text-zinc-400">
            Oasis protects <strong>loss of income only</strong> due to external
            disruptions (extreme weather, zone lockdowns, curfews). It does{" "}
            <strong>not</strong> cover health, life, accidents, or vehicle
            repairs.
          </p>
        </div>
      </div>
    </div>
  );
}
