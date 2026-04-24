'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { gooeyToast } from 'goey-toast';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  FlaskConical,
  Layers,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Settings2,
  User,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export interface DemoRider {
  id: string;
  full_name: string;
  phone_number: string | null;
  platform: string | null;
  /** Delivery zone center from profile — drives sequence hub options. */
  zone_latitude?: number | null;
  zone_longitude?: number | null;
  /** Rough metro / coord label from `inferIndianMetroLabel` (server). */
  zone_label?: string | null;
}

type EventSubtype =
  | 'extreme_heat'
  | 'heavy_rain'
  | 'severe_aqi'
  | 'traffic_gridlock'
  | 'zone_curfew';

interface DemoResult {
  candidates_found?: number;
  claims_created?: number;
  payouts_initiated?: number;
  payout_failures?: number;
  zones_checked?: number;
  error?: string;
  batch?: boolean;
  steps_run?: number;
  step_details?: Array<{ eventSubtype?: string; claims_created?: number }>;
  duration_ms?: number;
}

type Preset = {
  label: string;
  subtype: EventSubtype;
  emoji: string;
  desc: string;
  lat: number;
  lng: number;
  color: string;
  city: string;
  radiusKm?: number;
  severity?: number;
};

const PRESETS: Preset[] = [
  {
    label: 'Extreme Heat',
    subtype: 'extreme_heat',
    emoji: '🌡️',
    desc: '43°C sustained',
    lat: 12.9716,
    lng: 77.5946,
    city: 'Bengaluru',
    color: '#f59e0b',
    radiusKm: 20,
    severity: 9,
  },
  {
    label: 'Heavy Rain',
    subtype: 'heavy_rain',
    emoji: '🌧️',
    desc: 'High intensity rain',
    lat: 12.9716,
    lng: 77.5946,
    city: 'Bengaluru',
    color: '#7dd3fc',
    radiusKm: 25,
    severity: 9,
  },
  {
    label: 'Severe AQI',
    subtype: 'severe_aqi',
    emoji: '😷',
    desc: 'Dense smog band',
    lat: 28.6139,
    lng: 77.209,
    city: 'Delhi NCR',
    color: '#a78bfa',
    radiusKm: 35,
    severity: 9,
  },
  {
    label: 'Traffic Gridlock',
    subtype: 'traffic_gridlock',
    emoji: '🚦',
    desc: 'Severe congestion',
    lat: 19.076,
    lng: 72.8777,
    city: 'Mumbai',
    color: '#ef4444',
    radiusKm: 18,
    severity: 8,
  },
  {
    label: 'Zone Curfew',
    subtype: 'zone_curfew',
    emoji: '🚫',
    desc: 'Restriction / bandh',
    lat: 13.0827,
    lng: 80.2707,
    city: 'Chennai',
    color: '#f97316',
    radiusKm: 22,
    severity: 9,
  },
  {
    label: 'Heat · Hyderabad',
    subtype: 'extreme_heat',
    emoji: '🌡️',
    desc: 'Peak afternoon heat',
    lat: 17.385,
    lng: 78.4867,
    city: 'Hyderabad',
    color: '#fbbf24',
    radiusKm: 20,
    severity: 9,
  },
  {
    label: 'Rain · Kolkata',
    subtype: 'heavy_rain',
    emoji: '🌧️',
    desc: 'Monsoon burst',
    lat: 22.5726,
    lng: 88.3639,
    city: 'Kolkata',
    color: '#38bdf8',
    radiusKm: 28,
    severity: 9,
  },
];

/** Default pause between chained steps (ms). API max 120s. */
const DEFAULT_SEQUENCE_PAUSE_MS = 600;

/** Fallback reference hubs when no rider zone is selected. */
const SEQUENCE_HUBS: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Delhi NCR', lat: 28.6139, lng: 77.209 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
];

const EVENT_SUBTYPE_OPTIONS: { value: EventSubtype; label: string }[] = [
  { value: 'extreme_heat', label: 'Extreme heat' },
  { value: 'heavy_rain', label: 'Heavy rain' },
  { value: 'severe_aqi', label: 'Severe AQI' },
  { value: 'traffic_gridlock', label: 'Traffic gridlock' },
  { value: 'zone_curfew', label: 'Zone curfew' },
];

function hubIndexForDefaultLabel(defaultHubLabel: string): number {
  const map: Record<string, number> = {
    Bengaluru: 0,
    'Delhi NCR': 1,
    Mumbai: 2,
    Chennai: 3,
    Hyderabad: 4,
    Kolkata: 5,
  };
  if (defaultHubLabel in map) return map[defaultHubLabel]!;
  const idx = SEQUENCE_HUBS.findIndex((h) => h.name === defaultHubLabel);
  return idx >= 0 ? idx : 0;
}

function defaultRadiusSeverityForSubtype(subtype: EventSubtype): {
  radiusKm: number;
  severity: number;
} {
  const p = PRESETS.find((x) => x.subtype === subtype);
  return {
    radiusKm: p?.radiusKm ?? 20,
    severity: p?.severity ?? 8,
  };
}

type SequenceStepConfig = {
  eventSubtype: EventSubtype;
  radiusKm: number;
  severity: number;
};

type SequenceScenarioUserConfig = {
  /** Event preset, a rider's zone, or a fallback reference metro. */
  hubSource: 'event_preset' | 'named' | 'rider';
  namedHubIndex: number;
  riderId: string | null;
  steps: SequenceStepConfig[];
  pauseBetweenMs: number;
};

function buildInitialSequenceConfig(): SequenceScenarioUserConfig {
  return {
    hubSource: 'named',
    namedHubIndex: hubIndexForDefaultLabel('Bengaluru'),
    riderId: null,
    pauseBetweenMs: DEFAULT_SEQUENCE_PAUSE_MS,
    steps: [
      { eventSubtype: 'heavy_rain', radiusKm: 24, severity: 9 },
      { eventSubtype: 'traffic_gridlock', radiusKm: 18, severity: 8 },
    ],
  };
}

function encodeHubSelectValue(cfg: SequenceScenarioUserConfig): string {
  if (cfg.hubSource === 'event_preset') return '__event_preset__';
  if (cfg.hubSource === 'rider' && cfg.riderId) return `rider:${cfg.riderId}`;
  return `metro:${cfg.namedHubIndex}`;
}

function resolveSequenceHub(
  cfg: SequenceScenarioUserConfig,
  riders: DemoRider[],
  effectiveHubLat: number,
  effectiveHubLng: number,
  presetCityLabel: string,
): { lat: number; lng: number; auditName: string } | null {
  if (cfg.hubSource === 'event_preset') {
    return {
      lat: effectiveHubLat,
      lng: effectiveHubLng,
      auditName: `${presetCityLabel} (preset)`,
    };
  }
  if (cfg.hubSource === 'rider' && cfg.riderId) {
    const r = riders.find((x) => x.id === cfg.riderId);
    const lat = r?.zone_latitude != null ? Number(r.zone_latitude) : NaN;
    const lng = r?.zone_longitude != null ? Number(r.zone_longitude) : NaN;
    if (!r || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    const place = r.zone_label?.trim() || 'delivery zone';
    return { lat, lng, auditName: `${r.full_name} · ${place}` };
  }
  const namedHub = SEQUENCE_HUBS[cfg.namedHubIndex] ?? SEQUENCE_HUBS[0]!;
  return { lat: namedHub.lat, lng: namedHub.lng, auditName: namedHub.name };
}

interface DemoTriggerPanelProps {
  riders?: DemoRider[];
}

export function DemoTriggerPanel({ riders = [] }: DemoTriggerPanelProps) {
  const router = useRouter();
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const [selected, setSelected] = useState(PRESETS[0]!);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [riderDropdownOpen, setRiderDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [radiusKm, setRadiusKm] = useState(selected.radiusKm ?? 50);
  const [severity, setSeverity] = useState(selected.severity ?? 9);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  const [runLabel, setRunLabel] = useState('');
  /** Single customizable multi-step sequence (hub + steps + pause). */
  const [sequenceConfig, setSequenceConfig] = useState<SequenceScenarioUserConfig>(
    buildInitialSequenceConfig,
  );

  const selectedRider = riders.find((r) => r.id === selectedRiderId);
  const isRiderScopedSingleEvent = Boolean(selectedRiderId);

  function parseOptionalCoord(s: string): number | null {
    const n = parseFloat(s.trim());
    return Number.isFinite(n) ? n : null;
  }

  const effectiveHubLat = parseOptionalCoord(customLat) ?? selected.lat;
  const effectiveHubLng = parseOptionalCoord(customLng) ?? selected.lng;

  function applyPreset(p: Preset) {
    setSelected(p);
    setRadiusKm(p.radiusKm ?? 50);
    setSeverity(p.severity ?? 9);
    setCustomLat('');
    setCustomLng('');
  }

  async function handleTrigger() {
    setLoading(true);
    setBatchRunning(false);
    setResult(null);
    const latRaw = parseOptionalCoord(customLat);
    const lngRaw = parseOptionalCoord(customLng);

    try {
      const payload: Record<string, unknown> = {
        eventSubtype: selected.subtype,
        radiusKm,
        severity,
        ...(selectedRiderId && { riderId: selectedRiderId }),
        ...(runLabel.trim() && { runLabel: runLabel.trim() }),
      };

      if (!selectedRiderId) {
        payload.lat = latRaw ?? selected.lat;
        payload.lng = lngRaw ?? selected.lng;
      }

      const res = await fetch('/api/admin/demo-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as DemoResult;
      if (!res.ok) {
        const err = (data as { error?: string }).error ?? 'Failed';
        setResult({
          error: err,
        });
        gooeyToast.error('Demo failed', { description: err });
        return;
      }
      setResult(data);
      const payouts = data.payouts_initiated ?? 0;
      const forRider = selectedRider ? ` for ${selectedRider.full_name}` : '';
      gooeyToast.success('Demo completed', {
        description: `${data.claims_created ?? 0} claim(s), ${payouts} payout(s)${forRider}`,
      });
      router.refresh();
    } catch {
      setResult({ error: 'Request failed' });
      gooeyToast.error('Demo failed', { description: 'Request failed' });
    } finally {
      setLoading(false);
    }
  }

  function resetSequenceConfig() {
    setSequenceConfig(buildInitialSequenceConfig());
  }

  const ridersWithZones = useMemo(
    () =>
      riders.filter(
        (r) =>
          r.zone_latitude != null &&
          r.zone_longitude != null &&
          Number.isFinite(Number(r.zone_latitude)) &&
          Number.isFinite(Number(r.zone_longitude)),
      ),
    [riders],
  );

  useEffect(() => {
    setSequenceConfig((c) => {
      if (c.hubSource !== 'rider' || !c.riderId) return c;
      const ok = riders.some(
        (r) =>
          r.id === c.riderId &&
          r.zone_latitude != null &&
          r.zone_longitude != null &&
          Number.isFinite(Number(r.zone_latitude)) &&
          Number.isFinite(Number(r.zone_longitude)),
      );
      if (ok) return c;
      return {
        ...c,
        hubSource: 'named',
        namedHubIndex: hubIndexForDefaultLabel('Bengaluru'),
        riderId: null,
      };
    });
  }, [riders]);

  async function handleBatchScenario() {
    const cfg = sequenceConfig;
    if (!cfg.steps.length) {
      gooeyToast.error('Add at least one step');
      return;
    }

    setBatchRunning(true);
    setLoading(false);
    setResult(null);

    const hub = resolveSequenceHub(cfg, riders, effectiveHubLat, effectiveHubLng, selected.city);
    if (!hub) {
      gooeyToast.error('Invalid hub — choose a rider with a zone or another hub.');
      setBatchRunning(false);
      return;
    }
    const { lat: hubLat, lng: hubLng, auditName: hubAuditName } = hub;

    const locationParts = [`Sequence @ ${hubAuditName}`];
    if (runLabel.trim()) locationParts.unshift(runLabel.trim());
    const batchLabelRaw = locationParts.join(' · ');
    const batchLabel =
      batchLabelRaw.length > 120 ? `${batchLabelRaw.slice(0, 119)}…` : batchLabelRaw;
    const pauseMs = Math.min(120_000, Math.max(0, Math.round(cfg.pauseBetweenMs)));
    try {
      const res = await fetch('/api/admin/demo-trigger/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps: cfg.steps.map((s) => ({
            eventSubtype: s.eventSubtype,
            lat: hubLat,
            lng: hubLng,
            radiusKm: s.radiusKm,
            severity: s.severity,
          })),
          pauseBetweenMs: pauseMs,
          batchLabel,
          ...(selectedRiderId && { riderId: selectedRiderId }),
        }),
      });
      const data = (await res.json()) as DemoResult & { error?: string };
      if (!res.ok) {
        const err = data.error ?? 'Batch failed';
        setResult({ error: err });
        gooeyToast.error('Batch demo failed', { description: err });
        return;
      }
      setResult(data);
      gooeyToast.success('Batch demo completed', {
        description: `${data.steps_run ?? 0} steps · ${data.claims_created ?? 0} claims`,
      });
      router.refresh();
    } catch {
      setResult({ error: 'Request failed' });
      gooeyToast.error('Batch demo failed', { description: 'Request failed' });
    } finally {
      setBatchRunning(false);
    }
  }

  function getResultMessage() {
    if (!result) return null;
    if (result.error) return result.error;
    if (result.batch) {
      const steps = result.step_details?.length ?? result.steps_run ?? 0;
      return `${steps} step(s) · ${result.claims_created ?? 0} claim(s) · ${result.payouts_initiated ?? 0} payout(s) · ${result.duration_ms ?? '—'}ms`;
    }
    const payouts = result.payouts_initiated ?? 0;
    const forRider = selectedRider ? ` for ${selectedRider.full_name}` : '';
    let msg = `${result.claims_created ?? 0} claim(s), ${payouts} payout(s)${forRider}.`;
    if (result.claims_created === 0) {
      msg += selectedRiderId
        ? ' No claim created for selected rider. Check policy week/status, weekly claim cap, or fraud hold rules.'
        : ' No riders with active policies in the preset zone.';
    } else if (payouts === 0) {
      msg += ' Payouts not recorded (check payout_ledger / migrations).';
    }
    return msg;
  }

  const sequenceHubPreview = resolveSequenceHub(
    sequenceConfig,
    riders,
    effectiveHubLat,
    effectiveHubLng,
    selected.city,
  );
  const sequenceHubSelectValue = encodeHubSelectValue(sequenceConfig);

  return (
    <Card variant="default" padding="none" className="shadow-lg shadow-black/20">
      <CardHeader
        icon={<FlaskConical className="h-4 w-4 text-[#a78bfa]" />}
        title="Trigger a demo"
        description="Synthetic events for QA · weekly coverage · loss-of-income scope only"
        className="px-5 pt-5 pb-2 border-b border-[#252525]"
      />

      <div className="px-5 pb-6 space-y-6">
        {result && (
          <div
            className={cn(
              'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm -mt-1',
              result.error
                ? 'border-[#ef4444]/30 bg-[#ef4444]/[0.08] text-[#fca5a5]'
                : 'border-[#22c55e]/30 bg-[#14532d]/25 text-[#86efac]',
            )}
            role="status"
          >
            {result.error ? (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#f87171]" />
            ) : (
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#4ade80]" />
            )}
            <div className="min-w-0 flex-1">
              {result.error ? (
                <p className="font-medium text-[#fecaca]">{result.error}</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'rounded-full text-[10px] font-semibold border',
                        result.batch
                          ? 'border-violet-500/35 bg-violet-500/20 text-violet-100'
                          : 'border-emerald-500/35 bg-emerald-500/15 text-emerald-100',
                      )}
                    >
                      {result.batch ? 'Batch demo' : 'Single demo'}
                    </Badge>
                    {result.duration_ms != null && (
                      <span className="text-[10px] text-[#86efac]/80 tabular-nums">
                        {result.duration_ms}ms
                      </span>
                    )}
                  </div>
                  <p className="text-[#bbf7d0] text-[13px] leading-relaxed">{getResultMessage()}</p>
                </>
              )}
            </div>
          </div>
        )}

        {riders.length > 0 && (
          <section className="rounded-xl border border-[#2d2d2d] bg-[#121212] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-[#737373]" aria-hidden />
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8b8b8b]">
                Rider scope
              </h3>
            </div>
            <p className="text-[11px] text-[#6b7280] leading-relaxed -mt-1">
              Limit demo payouts to one rider — useful for screen recordings. Leave as “all riders”
              to exercise zone-wide matching.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#9ca3af] sr-only">Rider (optional)</label>
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
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#1e1e1e] transition-colors',
                          selectedRiderId === r.id && 'bg-[#1e1e1e]',
                        )}
                      >
                        <User className="h-4 w-4 text-[#555] shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{r.full_name}</p>
                          <p className="text-xs text-[#555]">
                            {[r.platform, r.phone_number, r.zone_label]
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
          </section>
        )}

        <section className="rounded-xl border border-[#2d2d2d] bg-[#121212] p-4 space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-400/90" aria-hidden />
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8b8b8b]">
                Single event
              </h3>
            </div>
          </div>
          <p className="text-[11px] text-[#6b7280] leading-relaxed">
            One synthetic disruption — location comes from the selected rider zone when rider scope
            is set; otherwise it uses the event preset (or Advanced coordinate override).
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#9ca3af]">Event preset</label>
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
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-[#555] shrink-0 transition-transform',
                      eventDropdownOpen && 'rotate-180',
                    )}
                  />
                </Button>
                {eventDropdownOpen && (
                  <div className="absolute z-20 top-full mt-1.5 left-0 right-0 sm:right-auto sm:min-w-[300px] max-h-64 overflow-y-auto rounded-xl border border-[#2d2d2d] bg-[#161616] shadow-xl overflow-hidden">
                    {PRESETS.map((p) => (
                      <button
                        key={`${p.subtype}-${p.city}-${p.label}`}
                        type="button"
                        onClick={() => {
                          applyPreset(p);
                          setEventDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-[#1e1e1e] transition-colors',
                          selected.label === p.label && selected.city === p.city && 'bg-[#1e1e1e]',
                        )}
                      >
                        <span className="text-base shrink-0">{p.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">{p.label}</p>
                          <p className="text-xs text-[#555]">{p.desc}</p>
                        </div>
                        {selected.label === p.label && selected.city === p.city && (
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
                disabled={loading || batchRunning}
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
        </section>

        <div className="rounded-xl border border-[#2d2d2d] bg-[#141414] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3 text-left text-xs font-medium text-[#9ca3af] hover:bg-white/[0.04]"
          >
            <span className="flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5 text-[#737373]" />
              Advanced — radius, severity, coordinates, run label
            </span>
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', showAdvanced && 'rotate-180')}
            />
          </button>
          {showAdvanced && (
            <div className="px-4 pb-4 pt-1 space-y-4 border-t border-[#2d2d2d]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#6b7280]">
                    Geofence radius (km)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full h-9 rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] px-3 text-sm text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#6b7280]">
                    Severity (1–10)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={severity}
                    onChange={(e) => setSeverity(Number(e.target.value))}
                    className="w-full h-9 rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] px-3 text-sm text-white"
                  />
                </label>
              </div>
              {isRiderScopedSingleEvent ? (
                <div className="rounded-lg border border-[#2d2d2d] bg-[#111111] px-3 py-2 text-[11px] text-[#9ca3af]">
                  Using rider zone coordinates for single-event trigger
                  {selectedRider?.zone_label ? ` · ${selectedRider.zone_label}` : ''}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#6b7280]">
                      Latitude (optional override)
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={`Default ${selected.lat}`}
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      className="w-full h-9 rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] px-3 text-sm text-white placeholder:text-[#444]"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#6b7280]">
                      Longitude (optional override)
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={`Default ${selected.lng}`}
                      value={customLng}
                      onChange={(e) => setCustomLng(e.target.value)}
                      className="w-full h-9 rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] px-3 text-sm text-white placeholder:text-[#444]"
                    />
                  </label>
                </div>
              )}
              <label className="block space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#6b7280]">
                  Run label (logged)
                </span>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="e.g. Phase 3 recording take 2"
                  value={runLabel}
                  onChange={(e) => setRunLabel(e.target.value)}
                  className="w-full h-9 rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] px-3 text-sm text-white placeholder:text-[#444]"
                />
              </label>
            </div>
          )}
        </div>

        <section className="rounded-xl border border-[#2d2d2d] bg-[#121212] p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-violet-400/90 shrink-0" aria-hidden />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8b8b8b]">
                  Sequence simulation
                </h3>
              </div>
              <p className="text-[11px] text-[#6b7280] leading-relaxed max-w-2xl">
                Chain any synthetic events with a pause between steps — one audit row in Recent demo
                runs. Pick a hub, add or remove steps, then run.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => resetSequenceConfig()}
                className="inline-flex items-center gap-1 text-[10px] text-[#6b7280] hover:text-[#a1a1aa]"
              >
                <RotateCcw className="h-3 w-3" />
                Reset defaults
              </button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loading || batchRunning}
                onClick={() => handleBatchScenario()}
                className="border-violet-500/40 text-violet-100 hover:bg-violet-500/15"
              >
                {batchRunning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    Running…
                  </>
                ) : (
                  <>Run {sequenceConfig.steps.length} steps</>
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-[#2d2d2d] border-l-4 border-l-violet-500/50 bg-[#0f0f0f] px-4 py-3 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <label className="block space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[#6b7280]">
                  Pause between steps (ms)
                </span>
                <input
                  type="number"
                  min={0}
                  max={120000}
                  step={100}
                  value={sequenceConfig.pauseBetweenMs}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setSequenceConfig((c) => ({
                      ...c,
                      pauseBetweenMs: Number.isFinite(n) ? n : c.pauseBetweenMs,
                    }));
                  }}
                  className="w-full h-9 rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] px-3 text-sm text-white tabular-nums"
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-[#6b7280]">Hub</label>
              <select
                value={sequenceHubSelectValue}
                onChange={(e) => {
                  const v = e.target.value;
                  setSequenceConfig((cur) => {
                    if (v === '__event_preset__') {
                      return { ...cur, hubSource: 'event_preset', riderId: null };
                    }
                    if (v.startsWith('rider:')) {
                      return {
                        ...cur,
                        hubSource: 'rider',
                        riderId: v.slice('rider:'.length),
                      };
                    }
                    if (v.startsWith('metro:')) {
                      return {
                        ...cur,
                        hubSource: 'named',
                        riderId: null,
                        namedHubIndex: Number(v.slice('metro:'.length)),
                      };
                    }
                    return cur;
                  });
                }}
                className="w-full max-w-xl h-9 rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] px-3 text-sm text-white"
              >
                <option value="__event_preset__">
                  Event preset hub — {selected.city} (use Advanced lat/lng to override)
                </option>
                {ridersWithZones.length > 0 && (
                  <optgroup label="Riders (delivery zone)">
                    {ridersWithZones.map((r) => (
                      <option key={r.id} value={`rider:${r.id}`}>
                        {r.full_name}
                        {r.zone_label
                          ? ` · ${r.zone_label}`
                          : ` · ${Number(r.zone_latitude).toFixed(3)}°, ${Number(r.zone_longitude).toFixed(3)}°`}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Reference metros (static)">
                  {SEQUENCE_HUBS.map((h, i) => (
                    <option key={h.name} value={`metro:${i}`}>
                      {h.name} ({h.lat.toFixed(4)}, {h.lng.toFixed(4)})
                    </option>
                  ))}
                </optgroup>
              </select>
              <p className="text-[10px] text-[#52525b] font-mono tabular-nums">
                {sequenceHubPreview ? (
                  <>
                    → fires at: {sequenceHubPreview.auditName} ({sequenceHubPreview.lat.toFixed(4)},{' '}
                    {sequenceHubPreview.lng.toFixed(4)})
                  </>
                ) : (
                  <span className="text-amber-500/90 font-sans">
                    → Rider zone unavailable — pick another hub or refresh rider list
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-[#6b7280]">
                  Steps (order = chain)
                </span>
                <button
                  type="button"
                  disabled={sequenceConfig.steps.length >= 8 || batchRunning}
                  onClick={() => {
                    const d = defaultRadiusSeverityForSubtype('heavy_rain');
                    setSequenceConfig((cur) => ({
                      ...cur,
                      steps: [
                        ...cur.steps,
                        {
                          eventSubtype: 'heavy_rain',
                          radiusKm: d.radiusKm,
                          severity: d.severity,
                        },
                      ],
                    }));
                  }}
                  className="inline-flex items-center gap-1 text-[10px] text-violet-300/90 hover:text-violet-200 disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" />
                  Add step
                </button>
              </div>
              <div className="space-y-2">
                {sequenceConfig.steps.map((step, stepIdx) => (
                  <div
                    key={`seq-step-${stepIdx}`}
                    className="flex flex-col gap-2 rounded-lg border border-[#262626] bg-[#141414] p-2 sm:flex-row sm:flex-wrap sm:items-end"
                  >
                    <label className="flex flex-col gap-0.5 min-w-[140px] flex-1">
                      <span className="text-[9px] text-[#52525b]">Event · step {stepIdx + 1}</span>
                      <select
                        value={step.eventSubtype}
                        onChange={(e) => {
                          const st = e.target.value as EventSubtype;
                          const d = defaultRadiusSeverityForSubtype(st);
                          setSequenceConfig((cur) => {
                            const next = [...cur.steps];
                            next[stepIdx] = {
                              eventSubtype: st,
                              radiusKm: d.radiusKm,
                              severity: d.severity,
                            };
                            return { ...cur, steps: next };
                          });
                        }}
                        className="h-8 rounded-md border border-[#2d2d2d] bg-[#1a1a1a] px-2 text-xs text-white"
                      >
                        {EVENT_SUBTYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-0.5 w-[88px]">
                      <span className="text-[9px] text-[#52525b]">Radius km</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        value={step.radiusKm}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setSequenceConfig((cur) => {
                            const next = [...cur.steps];
                            next[stepIdx] = {
                              ...next[stepIdx]!,
                              radiusKm: Number.isFinite(n) ? n : next[stepIdx]!.radiusKm,
                            };
                            return { ...cur, steps: next };
                          });
                        }}
                        className="h-8 rounded-md border border-[#2d2d2d] bg-[#1a1a1a] px-2 text-xs text-white tabular-nums"
                      />
                    </label>
                    <label className="flex flex-col gap-0.5 w-[72px]">
                      <span className="text-[9px] text-[#52525b]">Severity</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={step.severity}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setSequenceConfig((cur) => {
                            const next = [...cur.steps];
                            next[stepIdx] = {
                              ...next[stepIdx]!,
                              severity: Number.isFinite(n) ? n : next[stepIdx]!.severity,
                            };
                            return { ...cur, steps: next };
                          });
                        }}
                        className="h-8 rounded-md border border-[#2d2d2d] bg-[#1a1a1a] px-2 text-xs text-white tabular-nums"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={sequenceConfig.steps.length <= 1 || batchRunning}
                      onClick={() => {
                        setSequenceConfig((cur) => ({
                          ...cur,
                          steps: cur.steps.filter((_, j) => j !== stepIdx),
                        }));
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#3f3f46] text-[#9ca3af] hover:bg-white/10 hover:text-white disabled:opacity-30"
                      aria-label="Remove step"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </Card>
  );
}
