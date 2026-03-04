"use client";

import { useState } from "react";
import { FlaskConical, Loader2, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";

type EventSubtype =
  | "extreme_heat"
  | "heavy_rain"
  | "severe_aqi"
  | "traffic_gridlock"
  | "zone_curfew";

interface DemoResult {
  candidates_found: number;
  claims_created: number;
  zones_checked: number;
  error?: string;
}

const PRESETS: Array<{
  label: string;
  subtype: EventSubtype;
  emoji: string;
  desc: string;
  lat: number;
  lng: number;
}> = [
  {
    label: "Extreme Heat",
    subtype: "extreme_heat",
    emoji: "🌡️",
    desc: "43°C sustained — heat disruption",
    lat: 12.9716,
    lng: 77.5946,
  },
  {
    label: "Heavy Rain",
    subtype: "heavy_rain",
    emoji: "🌧️",
    desc: "4 mm/h precipitation — rain disruption",
    lat: 12.9716,
    lng: 77.5946,
  },
  {
    label: "Severe AQI",
    subtype: "severe_aqi",
    emoji: "😷",
    desc: "AQI ≥ 201 — outdoor work stopped",
    lat: 28.6139,
    lng: 77.209,
  },
  {
    label: "Traffic Gridlock",
    subtype: "traffic_gridlock",
    emoji: "🚦",
    desc: "Severe road closure — delivery halted",
    lat: 19.076,
    lng: 72.8777,
  },
  {
    label: "Zone Curfew",
    subtype: "zone_curfew",
    emoji: "🚫",
    desc: "Local curfew / strike / lockdown",
    lat: 12.9716,
    lng: 77.5946,
  },
];

export function DemoTriggerButton() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(PRESETS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);

  async function handleTrigger() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/demo-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSubtype: selected.subtype,
          lat: selected.lat,
          lng: selected.lng,
          radiusKm: 50,
          severity: 9,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ candidates_found: 0, claims_created: 0, zones_checked: 0, error: data.error ?? "Failed" });
        return;
      }
      setResult(data);
    } catch {
      setResult({ candidates_found: 0, claims_created: 0, zones_checked: 0, error: "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-amber-500/15 flex items-center gap-2">
        <FlaskConical className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-[11px] font-semibold text-amber-500/80 uppercase tracking-widest">
          Demo Mode
        </span>
        <span className="ml-auto text-[10px] text-amber-600/60 font-medium">
          Injects a synthetic disruption for demo/testing
        </span>
      </div>

      <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Preset selector */}
        <div className="relative flex-1 w-full">
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800/60 text-sm text-zinc-300 hover:border-zinc-600 transition-colors"
          >
            <span>
              {selected.emoji} {selected.label} —{" "}
              <span className="text-zinc-500">{selected.desc}</span>
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-zinc-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open && (
            <div className="absolute z-10 top-full mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl overflow-hidden">
              {PRESETS.map((p) => (
                <button
                  key={p.subtype}
                  onClick={() => {
                    setSelected(p);
                    setOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left text-sm hover:bg-zinc-800 transition-colors ${
                    selected.subtype === p.subtype ? "bg-zinc-800" : ""
                  }`}
                >
                  <span className="text-base shrink-0">{p.emoji}</span>
                  <div>
                    <p className="font-medium text-zinc-200">{p.label}</p>
                    <p className="text-xs text-zinc-500">{p.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleTrigger}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium text-sm hover:bg-amber-500 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Triggering…
            </>
          ) : (
            <>
              <FlaskConical className="h-3.5 w-3.5" />
              Fire Demo
            </>
          )}
        </button>
      </div>

      {result && (
        <div
          className={`px-5 py-3 border-t border-amber-500/15 flex items-center gap-2 text-xs ${
            result.error ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {result.error ? (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>
            {result.error
              ? result.error
              : `✓ Demo event created — ${result.claims_created} payout(s) triggered across ${result.zones_checked} zone(s)`}
          </span>
        </div>
      )}
    </div>
  );
}
