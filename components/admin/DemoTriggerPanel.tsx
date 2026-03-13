'use client';

import { gooeyToast } from 'goey-toast';
import { AlertCircle, CheckCircle, ChevronDown, FlaskConical, Loader2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface DemoRider {
  id: string;
  full_name: string;
  phone_number: string | null;
  platform: string | null;
}

type EventSubtype =
  | 'extreme_heat'
  | 'heavy_rain'
  | 'severe_aqi'
  | 'traffic_gridlock'
  | 'zone_curfew';

interface DemoResult {
  candidates_found: number;
  claims_created: number;
  payouts_initiated?: number;
  payout_failures?: number;
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
  color: string;
}> = [
  {
    label: 'Extreme Heat',
    subtype: 'extreme_heat',
    emoji: '🌡️',
    desc: '43C sustained heat disruption',
    lat: 12.9716,
    lng: 77.5946,
    color: '#f59e0b',
  },
  {
    label: 'Heavy Rain',
    subtype: 'heavy_rain',
    emoji: '🌧️',
    desc: '4 mm/h precipitation rain disruption',
    lat: 12.9716,
    lng: 77.5946,
    color: '#7dd3fc',
  },
  {
    label: 'Severe AQI',
    subtype: 'severe_aqi',
    emoji: '😷',
    desc: 'AQI >= 201 outdoor work stopped',
    lat: 28.6139,
    lng: 77.209,
    color: '#a78bfa',
  },
  {
    label: 'Traffic Gridlock',
    subtype: 'traffic_gridlock',
    emoji: '🚦',
    desc: 'Severe road closure, delivery halted',
    lat: 19.076,
    lng: 72.8777,
    color: '#ef4444',
  },
  {
    label: 'Zone Curfew',
    subtype: 'zone_curfew',
    emoji: '🚫',
    desc: 'Local curfew / strike / lockdown',
    lat: 12.9716,
    lng: 77.5946,
    color: '#f59e0b',
  },
];

interface DemoTriggerPanelProps {
  riders?: DemoRider[];
}

export function DemoTriggerPanel({ riders = [] }: DemoTriggerPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(PRESETS[0]);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [riderDropdownOpen, setRiderDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);

  const lat = selected.lat;
  const lng = selected.lng;
  const selectedRider = riders.find((r) => r.id === selectedRiderId);

  async function handleTrigger() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/demo-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSubtype: selected.subtype,
          lat,
          lng,
          radiusKm: 50,
          severity: 9,
          ...(selectedRiderId && { riderId: selectedRiderId }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data.error ?? 'Failed';
        setResult({ candidates_found: 0, claims_created: 0, zones_checked: 0, error: err });
        gooeyToast.error('Demo failed', { description: err });
        return;
      }
      setResult(data);
      const payouts = data.payouts_initiated ?? 0;
      const forRider = selectedRider ? ` for ${selectedRider.full_name}` : '';
      gooeyToast.success('Demo completed', {
        description: `${data.claims_created} claim(s), ${payouts} payout(s)${forRider}`,
      });
      router.refresh();
    } catch {
      setResult({
        candidates_found: 0,
        claims_created: 0,
        zones_checked: 0,
        error: 'Request failed',
      });
      gooeyToast.error('Demo failed', { description: 'Request failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#161616] border border-[#2d2d2d] rounded-xl p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <FlaskConical className="h-4 w-4 text-[#a78bfa]" />
        <h2 className="font-semibold text-white">Trigger a demo</h2>
      </div>
      <p className="text-sm text-[#555] mb-4">
        Fires a synthetic disruption at the preset location. Choose a rider to trigger the payout
        for that user only, or leave as &quot;All riders in zone&quot; to find all drivers in the
        preset area and create claims + notifications.
      </p>

      <div className="space-y-3">
        {riders.length > 0 && (
          <div className="relative min-w-0">
            <label className="block text-[10px] font-medium text-[#555] uppercase tracking-[0.1em] mb-1.5">
              Rider (optional)
            </label>
            <button
              type="button"
              onClick={() => setRiderDropdownOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg border border-[#2d2d2d] bg-[#1e1e1e] text-sm text-[#9ca3af] hover:border-[#3a3a3a] hover:text-white transition-colors"
            >
              <span className="truncate flex items-center gap-2">
                <User className="h-4 w-4 text-[#555] shrink-0" />
                {selectedRider
                  ? `${selectedRider.full_name}${selectedRider.platform ? ` (${selectedRider.platform})` : ''}`
                  : 'All riders in zone'}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[#555] shrink-0 transition-transform ${riderDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {riderDropdownOpen && (
              <div className="absolute z-20 top-full mt-1.5 w-full rounded-xl border border-[#2d2d2d] bg-[#161616] shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRiderId(null);
                    setRiderDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#1e1e1e] transition-colors ${!selectedRiderId ? 'bg-[#1e1e1e]' : ''}`}
                >
                  <User className="h-4 w-4 text-[#555] shrink-0" />
                  <span className="font-medium text-white">All riders in zone</span>
                </button>
                {riders.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedRiderId(r.id);
                      setRiderDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#1e1e1e] transition-colors ${selectedRiderId === r.id ? 'bg-[#1e1e1e]' : ''}`}
                  >
                    <User className="h-4 w-4 text-[#555] shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{r.full_name}</p>
                      <p className="text-xs text-[#555]">
                        {[r.platform, r.phone_number].filter(Boolean).join(' · ') ||
                          r.id.slice(0, 8)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <label className="block text-[10px] font-medium text-[#555] uppercase tracking-[0.1em] mb-1.5">
              Event type (preset location)
            </label>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg border border-[#2d2d2d] bg-[#1e1e1e] text-sm text-[#9ca3af] hover:border-[#3a3a3a] hover:text-white transition-colors"
            >
              <span className="truncate flex items-center gap-2">
                <span>{selected.emoji}</span>
                <span className="font-medium text-white">{selected.label}</span>
                <span className="text-[#555] hidden sm:inline"> {selected.desc}</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 text-[#555] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>

            {open && (
              <div className="absolute z-20 top-full mt-1.5 w-full rounded-xl border border-[#2d2d2d] bg-[#161616] shadow-xl overflow-hidden">
                {PRESETS.map((p) => (
                  <button
                    key={p.subtype}
                    type="button"
                    onClick={() => {
                      setSelected(p);
                      setOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left text-sm hover:bg-[#1e1e1e] transition-colors ${
                      selected.subtype === p.subtype ? 'bg-[#1e1e1e]' : ''
                    }`}
                  >
                    <span className="text-base shrink-0 mt-0.5">{p.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-white">{p.label}</p>
                      <p className="text-xs text-[#555]">{p.desc}</p>
                    </div>
                    {selected.subtype === p.subtype && (
                      <span
                        className="ml-auto h-2 w-2 rounded-full shrink-0 mt-1.5"
                        style={{ background: p.color }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleTrigger}
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-[#a78bfa] text-black font-semibold text-sm hover:bg-[#b79cfb] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Triggering...
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4" />
                Fire demo
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`mt-4 flex items-center gap-2.5 text-sm py-3 px-4 rounded-lg border font-medium ${
            result.error
              ? 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]'
              : 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]'
          }`}
        >
          {result.error ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0" />
          )}
          {result.error
            ? result.error
            : (() => {
                const payouts = result.payouts_initiated ?? 0;
                const forRider = selectedRider ? ` for ${selectedRider.full_name}` : '';
                let msg = `Demo completed. ${result.claims_created} claim(s), ${payouts} payout(s)${forRider}.`;
                if (result.claims_created === 0) {
                  msg += selectedRiderId
                    ? ' Selected rider has no active policy covering this week (or payment not yet confirmed).'
                    : ' Ensure at least one rider has an active weekly policy and their zone is within the preset area.';
                } else if (payouts === 0) {
                  msg +=
                    ' Payouts not recorded: ensure the payout_ledger table exists (run Supabase migrations).';
                }
                return msg;
              })()}
        </div>
      )}
    </div>
  );
}
