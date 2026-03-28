'use client';

import { gooeyToast } from 'goey-toast';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  FlaskConical,
  Loader2,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    desc: '43°C sustained heat',
    lat: 12.9716,
    lng: 77.5946,
    color: '#f59e0b',
  },
  {
    label: 'Heavy Rain',
    subtype: 'heavy_rain',
    emoji: '🌧️',
    desc: '4 mm/h precipitation',
    lat: 12.9716,
    lng: 77.5946,
    color: '#7dd3fc',
  },
  {
    label: 'Severe AQI',
    subtype: 'severe_aqi',
    emoji: '😷',
    desc: 'AQI ≥ 201',
    lat: 28.6139,
    lng: 77.209,
    color: '#a78bfa',
  },
  {
    label: 'Traffic Gridlock',
    subtype: 'traffic_gridlock',
    emoji: '🚦',
    desc: 'Road closure',
    lat: 19.076,
    lng: 72.8777,
    color: '#ef4444',
  },
  {
    label: 'Zone Curfew',
    subtype: 'zone_curfew',
    emoji: '🚫',
    desc: 'Curfew / lockdown',
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
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const [selected, setSelected] = useState(PRESETS[0]);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [riderDropdownOpen, setRiderDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);

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
          lat: selected.lat,
          lng: selected.lng,
          radiusKm: 50,
          severity: 9,
          ...(selectedRiderId && { riderId: selectedRiderId }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data.error ?? 'Failed';
        setResult({
          candidates_found: 0,
          claims_created: 0,
          zones_checked: 0,
          error: err,
        });
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

  function getResultMessage() {
    if (!result) return null;
    if (result.error) return result.error;
    const payouts = result.payouts_initiated ?? 0;
    const forRider = selectedRider ? ` for ${selectedRider.full_name}` : '';
    let msg = `${result.claims_created} claim(s), ${payouts} payout(s)${forRider}.`;
    if (result.claims_created === 0) {
      msg += selectedRiderId
        ? ' Selected rider has no active policy this week (or payment not confirmed).'
        : ' No riders with active policies in the preset zone.';
    } else if (payouts === 0) {
      msg += ' Payouts not recorded (check payout_ledger / migrations).';
    }
    return msg;
  }

  return (
    <Card variant="default" padding="none">
      <CardHeader
        icon={<FlaskConical className="h-4 w-4 text-[#a78bfa]" />}
        title="Trigger a demo"
        description="Fire a synthetic disruption at a preset location. Choose a rider to pay out only that user, or leave as all riders in zone."
        className="px-5 pt-5 pb-2"
      />

      <div className="px-5 pb-5 space-y-5">
        {/* Rider (optional) */}
        {riders.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9ca3af]">
              Rider (optional)
            </label>
            <div className="relative min-w-0">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between h-9 rounded-lg border-[#2d2d2d] bg-[#1e1e1e] text-[#9ca3af] hover:bg-[#262626] hover:text-white hover:border-[#3a3a3a]"
                onClick={() => setRiderDropdownOpen((o) => !o)}
              >
                <span className="truncate flex items-center gap-2">
                  <User className="h-4 w-4 text-[#555] shrink-0" />
                  {selectedRider
                    ? `${selectedRider.full_name}${selectedRider.platform ? ` · ${selectedRider.platform}` : ''}`
                    : 'All riders in zone'}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-[#555] shrink-0 transition-transform',
                    riderDropdownOpen && 'rotate-180',
                  )}
                />
              </Button>
              {riderDropdownOpen && (
                <div className="absolute z-20 top-full mt-1.5 w-full rounded-xl border border-[#2d2d2d] bg-[#161616] shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRiderId(null);
                      setRiderDropdownOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#1e1e1e] transition-colors',
                      !selectedRiderId && 'bg-[#1e1e1e]',
                    )}
                  >
                    <User className="h-4 w-4 text-[#555] shrink-0" />
                    <span className="font-medium text-white">
                      All riders in zone
                    </span>
                  </button>
                  {riders.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setSelectedRiderId(r.id);
                        setRiderDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#1e1e1e] transition-colors',
                        selectedRiderId === r.id && 'bg-[#1e1e1e]',
                      )}
                    >
                      <User className="h-4 w-4 text-[#555] shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">
                          {r.full_name}
                        </p>
                        <p className="text-xs text-[#555]">
                          {[r.platform, r.phone_number]
                            .filter(Boolean)
                            .join(' · ') || r.id.slice(0, 8)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Event type + Fire */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#9ca3af]">
            Event type (preset location)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between h-9 rounded-lg border-[#2d2d2d] bg-[#1e1e1e] text-left text-[#9ca3af] hover:bg-[#262626] hover:text-white hover:border-[#3a3a3a]"
                onClick={() => setEventDropdownOpen((o) => !o)}
              >
                <span className="truncate flex items-center gap-2">
                  <span>{selected.emoji}</span>
                  <span className="font-medium text-white">{selected.label}</span>
                  <span className="text-[#555] hidden sm:inline">
                    {' '}
                    · {selected.desc}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-[#555] shrink-0 transition-transform',
                    eventDropdownOpen && 'rotate-180',
                  )}
                />
              </Button>
              {eventDropdownOpen && (
                <div className="absolute z-20 top-full mt-1.5 left-0 right-0 sm:right-auto sm:min-w-[280px] rounded-xl border border-[#2d2d2d] bg-[#161616] shadow-xl overflow-hidden">
                  {PRESETS.map((p) => (
                    <button
                      key={p.subtype}
                      type="button"
                      onClick={() => {
                        setSelected(p);
                        setEventDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#1e1e1e] transition-colors',
                        selected.subtype === p.subtype && 'bg-[#1e1e1e]',
                      )}
                    >
                      <span className="text-base shrink-0">{p.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{p.label}</p>
                        <p className="text-xs text-[#555]">{p.desc}</p>
                      </div>
                      {selected.subtype === p.subtype && (
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: p.color }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              type="button"
              onClick={handleTrigger}
              disabled={loading}
              size="default"
              className="shrink-0 bg-[#a78bfa] text-black font-semibold hover:bg-[#b79cfb] border-0 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Triggering…
                </>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4" />
                  Fire demo
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div
            className={cn(
              'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
              result.error
                ? 'border-[#ef4444]/25 bg-[#ef4444]/10 text-[#ef4444]'
                : 'border-[#22c55e]/25 bg-[#22c55e]/10 text-[#22c55e]',
            )}
          >
            {result.error ? (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              {result.error ? (
                <p className="font-medium">{result.error}</p>
              ) : (
                <>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'rounded-full text-[10px] font-semibold mb-1.5 border border-[#22c55e]/25 bg-[#22c55e]/20 text-[#22c55e]',
                    )}
                  >
                    Demo completed
                  </Badge>
                  <p className="text-[#22c55e]">{getResultMessage()}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
