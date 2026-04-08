'use client';

import { G, GOV_BUILDER_HEIGHT } from '@/components/admin/governance-styles';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { TRIGGERS, type TriggersConfig } from '@/lib/config/constants';
import {
  EXCLUDABLE_SUBTYPES,
  TRIGGER_FIELD_GROUPS,
} from '@/lib/parametric-rules/trigger-field-metadata';
import type { PayoutLadderStep } from '@/lib/parametric-rules/types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Layers, Plus, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const STEPS = ['Basics', 'Thresholds', 'Payout & exclusions', 'Review'] as const;

type Props = {
  onPublished?: () => void;
};

function todayVersionLabel(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export function RuleSetInteractiveForm({ onPublished }: Props) {
  const [step, setStep] = useState(0);
  const [versionLabel, setVersionLabel] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [notes, setNotes] = useState('');
  const [thresholds, setThresholds] = useState<TriggersConfig>(() => ({ ...TRIGGERS }));
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [ladder, setLadder] = useState<PayoutLadderStep[]>([
    { severity_min: 0, severity_max: 10, multiplier: 1 },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changedKeys = useMemo(() => {
    return (Object.keys(TRIGGERS) as (keyof TriggersConfig)[]).filter(
      (k) => thresholds[k] !== TRIGGERS[k],
    );
  }, [thresholds]);

  const goesLiveSummary = useMemo(() => {
    if (!effectiveFrom.trim()) return 'When you publish (server time)';
    try {
      return new Date(effectiveFrom).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return effectiveFrom;
    }
  }, [effectiveFrom]);

  function toggleExcluded(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addLadderRow() {
    setLadder((rows) => [...rows, { severity_min: 0, severity_max: 10, multiplier: 1 }]);
  }

  function removeLadderRow(i: number) {
    setLadder((rows) => (rows.length <= 1 ? rows : rows.filter((_, j) => j !== i)));
  }

  function patchLadder(i: number, patch: Partial<PayoutLadderStep>) {
    setLadder((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  async function onSubmit() {
    setError(null);
    if (!versionLabel.trim()) {
      setError('Add a rule version.');
      setStep(0);
      return;
    }
    setBusy(true);
    try {
      const triggers: Record<string, number> = {};
      for (const k of Object.keys(TRIGGERS) as (keyof TriggersConfig)[]) {
        triggers[k] = thresholds[k];
      }
      const body: Record<string, unknown> = {
        versionLabel: versionLabel.trim(),
        triggers,
        payoutLadder: ladder,
        ...(effectiveFrom.trim() ? { effectiveFrom: new Date(effectiveFrom).toISOString() } : {}),
        ...(excluded.size > 0 ? { excludedSubtypes: [...excluded] } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };

      const res = await fetch('/api/admin/rule-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Request failed');
        setBusy(false);
        return;
      }
      setVersionLabel('');
      setEffectiveFrom('');
      setNotes('');
      setThresholds({ ...TRIGGERS });
      setExcluded(new Set());
      setLadder([{ severity_min: 0, severity_max: 10, multiplier: 1 }]);
      setStep(0);
      onPublished?.();
    } catch {
      setError('Network error');
    } finally {
      setBusy(false);
    }
  }

  const defListClass = 'grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-[8.5rem_1fr]';
  const defDt = 'text-[12px] text-white/40';
  const defDd = 'text-[12px] text-white/80';

  return (
    <div className="w-full">
      <div className={cn('flex min-h-0 min-w-0 flex-col', G.panel, GOV_BUILDER_HEIGHT)}>
        <nav aria-label="Steps" className={cn(G.panelHeader, 'items-stretch py-3')}>
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            {STEPS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(i)}
                className={cn(
                  'flex min-h-[48px] flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-center transition-colors sm:min-h-[44px] sm:flex-row sm:gap-2 sm:px-2.5',
                  step === i
                    ? 'border-white/20 bg-white/[0.08] text-white'
                    : 'border-transparent bg-transparent text-white/40 hover:bg-white/[0.04] hover:text-white/65',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold',
                    step === i ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-white/35',
                  )}
                >
                  {i + 1}
                </span>
                <span className="line-clamp-2 text-[10px] font-medium leading-snug sm:line-clamp-none sm:text-left sm:text-[11px]">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </nav>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 py-5">
            {step === 0 ? (
              <div className="mx-auto max-w-xl space-y-6">
                <div className="space-y-2">
                  <label htmlFor="rs-version" className={G.fieldLabel}>
                    Rule version
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <Input
                      id="rs-version"
                      required
                      value={versionLabel}
                      onChange={(e) => setVersionLabel(e.target.value)}
                      placeholder={todayVersionLabel()}
                      className={cn(G.input, 'min-w-0 flex-1 font-mono')}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 shrink-0 border-white/15 bg-white/[0.03] px-4 text-white/80 hover:bg-white/[0.06] sm:w-auto"
                      onClick={() => setVersionLabel(todayVersionLabel())}
                    >
                      <Sparkles className="mr-1.5 h-3.5 w-3.5 opacity-70" />
                      Today
                    </Button>
                  </div>
                  <p className={G.helper}>
                    Shown on every trigger ledger entry. Must be unique for each publish.
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="rs-effective" className={G.fieldLabel}>
                    Goes live at
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      id="rs-effective"
                      type="datetime-local"
                      value={effectiveFrom}
                      onChange={(e) => setEffectiveFrom(e.target.value)}
                      className={cn(G.input, 'w-full max-w-[240px]')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-fit text-white/45 hover:text-white/80"
                      onClick={() => setEffectiveFrom('')}
                    >
                      Clear — use publish time
                    </Button>
                  </div>
                  <p className={G.helper}>
                    Leave empty to start the new set when you click Publish.
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="rs-notes" className={G.fieldLabel}>
                    Internal notes
                  </label>
                  <Input
                    id="rs-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional — e.g. IRDA filing ref, legal sign-off"
                    className={cn(G.input, 'w-full')}
                  />
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-4">
                <p className={G.helper}>
                  Adjust numbers by group. Reset restores the platform default for that field only.
                </p>
                <Accordion
                  type="multiple"
                  defaultValue={[TRIGGER_FIELD_GROUPS[0]?.id ?? 'heat_rain']}
                >
                  {TRIGGER_FIELD_GROUPS.map((group) => (
                    <AccordionItem key={group.id} value={group.id} className="border-white/10">
                      <AccordionTrigger className="py-4 text-[13px] text-white/85 hover:no-underline">
                        <span className="flex flex-col items-start gap-0.5 text-left">
                          <span className="font-medium">{group.title}</span>
                          <span className="text-[11px] font-normal text-white/40">
                            {group.subtitle}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {group.fields.map((f) => (
                            <div
                              key={f.key}
                              className={cn(G.insetCard, 'flex min-h-[132px] flex-col')}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[12px] font-medium text-white/80">{f.label}</p>
                                  <p
                                    className="mt-1.5 text-[11px] leading-snug text-white/38"
                                    title={f.description}
                                  >
                                    {f.description}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 shrink-0 px-2 text-white/35 hover:text-white/80"
                                  title="Reset to default"
                                  onClick={() =>
                                    setThresholds((t) => ({ ...t, [f.key]: TRIGGERS[f.key] }))
                                  }
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                                <Input
                                  type="number"
                                  step={f.step ?? 'any'}
                                  value={thresholds[f.key]}
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value);
                                    if (!Number.isFinite(v)) return;
                                    setThresholds((t) => ({ ...t, [f.key]: v }));
                                  }}
                                  className={cn(G.input, 'w-[7.25rem] font-mono text-[13px]')}
                                />
                                {f.unit ? (
                                  <span className="text-[11px] tabular-nums text-white/35">
                                    {f.unit}
                                  </span>
                                ) : null}
                                {thresholds[f.key] !== TRIGGERS[f.key] ? (
                                  <span className="rounded border border-white/12 bg-white/[0.05] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/50">
                                    changed
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-10">
                <section className="space-y-4">
                  <div>
                    <p className={G.eyebrow}>Payout</p>
                    <h3 className={cn(G.sectionTitle, 'mt-1 flex items-center gap-2')}>
                      <Layers className="h-4 w-4 text-white/45" />
                      Ladder
                    </h3>
                    <p className={cn(G.helper, 'mt-2 max-w-2xl')}>
                      Plan payout × multiplier by severity (0–10). Add tiers for graduated payouts.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {ladder.map((row, i) => (
                      <div
                        key={i}
                        className={cn(
                          G.insetCard,
                          'grid grid-cols-1 items-end gap-4 sm:grid-cols-[4.5rem_4.5rem_1fr_auto]',
                        )}
                      >
                        <div className="space-y-1.5">
                          <label className={G.eyebrow}>Min</label>
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            value={row.severity_min}
                            onChange={(e) =>
                              patchLadder(i, { severity_min: Number(e.target.value) || 0 })
                            }
                            className={cn(G.input, 'w-full font-mono text-xs')}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className={G.eyebrow}>Max</label>
                          <Input
                            type="number"
                            min={0}
                            max={10}
                            value={row.severity_max}
                            onChange={(e) =>
                              patchLadder(i, { severity_max: Number(e.target.value) || 0 })
                            }
                            className={cn(G.input, 'w-full font-mono text-xs')}
                          />
                        </div>
                        <div className="min-w-0 space-y-1.5 sm:col-span-1">
                          <label className={G.eyebrow}>
                            Multiplier ({row.multiplier.toFixed(2)}×)
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={2}
                            step={0.05}
                            value={row.multiplier}
                            onChange={(e) =>
                              patchLadder(i, { multiplier: parseFloat(e.target.value) })
                            }
                            className="h-2 w-full cursor-pointer accent-zinc-500"
                          />
                        </div>
                        <div className="flex justify-end sm:justify-start">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={ladder.length <= 1}
                            className="h-9 text-red-400/85 hover:text-red-300"
                            onClick={() => removeLadderRow(i)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-full border-dashed border-white/12 text-white/50 hover:border-white/18 hover:bg-white/[0.03] sm:w-auto"
                      onClick={addLadderRow}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add tier
                    </Button>
                  </div>
                </section>

                <Separator className="bg-white/[0.08]" />

                <section className="space-y-4">
                  <div>
                    <p className={G.eyebrow}>Coverage</p>
                    <h3 className={cn(G.sectionTitle, 'mt-1')}>Excluded trigger types</h3>
                    <p className={cn(G.helper, 'mt-2')}>
                      Selected types do not create disruptions or claims under this version.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {EXCLUDABLE_SUBTYPES.map((s) => {
                      const on = excluded.has(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleExcluded(s.id)}
                          className={cn(
                            'flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2.5 text-center transition-colors',
                            on
                              ? 'border-amber-500/30 bg-amber-500/[0.08] text-amber-100/95'
                              : 'border-white/10 bg-white/[0.02] text-white/55 hover:border-white/16',
                          )}
                        >
                          <span className="text-[12px] font-medium leading-tight">{s.label}</span>
                          <span className="text-[10px] text-white/30">{s.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="mx-auto max-w-xl space-y-5">
                <h3 className={G.sectionTitle}>Summary</h3>
                <dl className={defListClass}>
                  <dt className={defDt}>Rule version</dt>
                  <dd className={cn(defDd, 'font-mono')}>{versionLabel.trim() || '—'}</dd>
                  <dt className={defDt}>Goes live</dt>
                  <dd className={defDd}>{goesLiveSummary}</dd>
                  <dt className={defDt}>Thresholds changed</dt>
                  <dd className={defDd}>{changedKeys.length} fields</dd>
                  <dt className={defDt}>Payout tiers</dt>
                  <dd className={defDd}>{ladder.length}</dd>
                  <dt className={defDt}>Exclusions</dt>
                  <dd className={defDd}>{excluded.size ? [...excluded].join(', ') : 'None'}</dd>
                </dl>
                {error ? <p className="text-sm text-red-400/90">{error}</p> : null}
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-amber-100/75">
                  Publishing closes the previous current version at the scheduled time (or now) and
                  makes this row current. This cannot be undone from the UI.
                </p>
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <div className={cn(G.panelFooter, 'justify-between gap-3')}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="h-9 text-white/55 hover:text-white/85"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              size="sm"
              className="h-9 bg-zinc-100 px-5 text-zinc-950 hover:bg-white"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              className="h-9 bg-zinc-100 px-5 text-zinc-950 hover:bg-white"
              onClick={() => void onSubmit()}
            >
              {busy ? 'Publishing…' : 'Publish rule set'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
