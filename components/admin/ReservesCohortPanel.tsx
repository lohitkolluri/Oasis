'use client';

import { AdminInlineHelp } from '@/components/admin/AdminPageTitle';
import { G } from '@/components/admin/governance-styles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { InlineHelp } from '@/components/ui/inline-help';
import { MetricCard } from '@/components/ui/MetricCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatShortDateIST } from '@/lib/datetime/ist';
import type { ReservesCohortsPayload, WeeklyCohortRow } from '@/lib/reserves/weekly-cohorts';
import { cn } from '@/lib/utils';
import {
  Activity,
  Gauge,
  IndianRupee,
  MapPin,
  RefreshCw,
  Shield,
  Siren,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

/** Accent for stress control and cap utilization bars. */
const SB = {
  text: 'text-[#3ECF8E]',
  bg: 'bg-[#3ECF8E]',
  bgSoft: 'bg-[#3ECF8E]/12',
  border: 'border-[#3ECF8E]/35',
  ring: 'focus-visible:ring-[#3ECF8E]/40',
} as const;

function inr(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function CapUtilBar({ label, pct, help }: { label: string; pct: number; help: string }) {
  const p = Math.min(100, Math.max(0, pct));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <span className={cn(G.helper, '!text-[10px]')}>{label}</span>
          <InlineHelp text={help} size="sm" className="translate-y-px" />
        </div>
        <span className="shrink-0 text-[10px] font-medium tabular-nums text-white/55">{p.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn('h-full rounded-full transition-[width] duration-300 ease-out', SB.bg, 'opacity-90')}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}

export function ReservesCohortPanel() {
  const [weeks, setWeeks] = useState(8);
  const [extraDays, setExtraDays] = useState(0);
  const [data, setData] = useState<ReservesCohortsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [detailWeek, setDetailWeek] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/reserves-cohorts?weeks=${weeks}&extraDays=${extraDays}`,
        { credentials: 'include' },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? res.statusText);
      }
      const payload = (await res.json()) as ReservesCohortsPayload;
      setData(payload);
      if (payload.cohorts.length > 0) {
        setDetailWeek((prev) =>
          prev && payload.cohorts.some((c) => c.weekStart === prev)
            ? prev
            : payload.cohorts[0]!.weekStart,
        );
      } else {
        setDetailWeek(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [weeks, extraDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const detail = useMemo(() => {
    if (!data || !detailWeek) return null;
    return data.cohorts.find((c) => c.weekStart === detailWeek) ?? null;
  }, [data, detailWeek]);

  const latest: WeeklyCohortRow | null = data?.cohorts[0] ?? null;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <span className={G.eyebrow}>Financial · Weekly model</span>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
              Payouts &amp; reserves
            </h1>
            <AdminInlineHelp
              className="translate-y-0.5"
              text="Weekly cohorts group policies by coverage week_start (IST). Earned premium counts paid/demo rows only. Max exposure is plan max_claims_per_week × payout_per_claim. Realized = parametric claims on those policies. Stress days add a linear slice of remaining headroom for liquidity what-if — not statutory IBNR. Cap % uses RESERVE_WEEKLY_PAYOUT_CAP_INR."
            />
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-white/45">
            Earned premium vs. contractual exposure and realized parametric payouts by coverage week. Stress
            simulates extra lockdown-equivalent days against remaining headroom — for liquidity narrative only,
            not statutory IBNR.
          </p>
        </div>
      </header>

      <div className={cn(G.summaryPanel, 'p-4 sm:p-5')}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[160px] flex-col gap-1.5">
              <span className="flex items-center gap-1">
                <span className={G.fieldLabel}>Cohort window</span>
                <InlineHelp
                  size="sm"
                  className="translate-y-px"
                  text="How many recent coverage weeks (IST Mondays) to load. Each cohort row is one week: all weekly policies that started that Monday with paid or demo premium. Wider windows help you compare trends."
                />
              </span>
              <select
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className={cn(G.input, 'w-full cursor-pointer px-3')}
              >
                {[4, 8, 12, 16, 24].map((w) => (
                  <option key={w} value={w}>
                    Last {w} weeks
                  </option>
                ))}
              </select>
            </label>

            <div className="min-w-[min(100%,280px)] flex-1 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="flex items-center gap-1">
                  <span className={G.fieldLabel}>Stress scenario</span>
                  <InlineHelp
                    size="sm"
                    className="translate-y-px"
                    text="Pretend extra lockdown-equivalent days hit the portfolio. Each day adds 1/7 of the gap between max contractual exposure and payouts already taken for that week. The stressed total metric and the second cap bar update — for liquidity what-if, not a forecast."
                  />
                </span>
                <span className={cn('text-xs font-semibold tabular-nums', SB.text)}>
                  +{extraDays} day{extraDays === 1 ? '' : 's'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={14}
                step={1}
                value={extraDays}
                onChange={(e) => setExtraDays(Number(e.target.value))}
                className={cn(
                  'h-2 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08]',
                  '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none',
                  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#141414]',
                  '[&::-webkit-slider-thumb]:bg-[#3ECF8E] [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(62,207,142,0.45)]',
                  '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full',
                  '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#141414] [&::-moz-range-thumb]:bg-[#3ECF8E]',
                )}
                aria-label="Extra lockdown-equivalent days"
              />
              <p className={G.helper}>
                Each day adds <span className="text-white/55">1/7</span> of remaining headroom (max exposure −
                realized) to the stressed payout total.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => void load()}
            disabled={loading}
            className={cn('shrink-0 border-white/12 bg-white/[0.03] text-white/85 hover:bg-white/[0.06]', SB.ring)}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} aria-hidden />
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        {data && (
          <>
            <Separator className="my-4 bg-white/[0.06]" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className={cn(G.helper, '!text-[11px]')}>
                Weekly payout cap{' '}
                <span className="font-medium text-white/55">{inr(data.meta.weeklyPayoutCapInr)}</span>
                <span className="text-white/30"> · </span>
                {data.disclaimer}
              </p>
            </div>
          </>
        )}
      </div>

      {err && (
        <div
          className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200/95"
          role="alert"
        >
          {err}
        </div>
      )}

      {loading && !data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px] rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      )}

      {data && latest && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Earned premium"
              value={inr(latest.earnedPremiumInr)}
              icon={IndianRupee}
              accent="cyan"
              delay={0}
              subtext={formatShortDateIST(latest.weekStart)}
              help="Premium collected for the latest row's coverage week only: we add weekly_premium_inr for every policy in that week with paid or demo status. The chip is that week's start (Monday, IST). Not lifetime revenue — just that seven-day window."
            />
            <MetricCard
              label="Max exposure"
              value={inr(latest.cohortMaxExposureInr)}
              icon={Shield}
              accent="violet"
              delay={0.05}
              subtext="Plan caps × policies"
              help="Worst-case payout if every policy in that week used all allowed claims: per rider, (max claims per week from plan) × (payout per claim from plan), summed. Unassigned plans use a small fallback. This is a contractual ceiling for capacity planning, not a prediction."
            />
            <MetricCard
              label="Realized payouts"
              value={inr(latest.realizedPayoutInr)}
              icon={Wallet}
              accent="emerald"
              delay={0.1}
              subtext="Parametric claims"
              help="Total INR from parametric claims linked to policies in that coverage week — automated loss-of-income payouts when triggers fired (weather, curfew, etc.). Product scope is income disruption only; not medical, accident, or vehicle repair."
            />
            <MetricCard
              label="Stressed total"
              value={inr(latest.stressedTotalPayoutInr)}
              icon={Gauge}
              accent="amber"
              delay={0.15}
              subtext={`Scenario +${extraDays}d`}
              help="Realized payouts plus the extra amount from the stress dial: each hypothetical day adds one-seventh of remaining headroom (max exposure minus realized). The subtitle shows how many extra days you assumed. Illustrative liquidity math — not IBNR or an actuarial reserve."
            />
          </div>

          <div className={cn(G.insetCard, 'grid gap-4 overflow-visible sm:grid-cols-2')}>
            <CapUtilBar
              label="Cap utilization (realized)"
              pct={latest.utilizationOfCapPct}
              help="Realized payouts for the latest week divided by your configured weekly aggregate cap (RESERVE_WEEKLY_PAYOUT_CAP_INR, default ₹1 cr). Shows how much of that notional limit actual claims have consumed."
            />
            <CapUtilBar
              label="Cap utilization (after stress)"
              pct={latest.stressedUtilizationOfCapPct}
              help="Same weekly cap, but the numerator is the stressed total (realized + scenario increment). Compare to the first bar to see how much headroom disappears if the stress days materialized."
            />
          </div>
        </>
      )}

      <Tabs defaultValue="cohorts" className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full justify-start sm:w-auto">
            <TabsTrigger value="cohorts" className="gap-1.5">
              <Activity className="h-3.5 w-3.5 opacity-70" aria-hidden />
              Weekly cohorts
            </TabsTrigger>
            <TabsTrigger value="drill" className="gap-1.5">
              <MapPin className="h-3.5 w-3.5 opacity-70" aria-hidden />
              Zones &amp; perils
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="cohorts" className="mt-4">
          <Card variant="default" padding="none" className={cn(G.contentCard, 'flex min-h-0 flex-col overflow-hidden')}>
            <div className={G.panelHeader}>
              <div className="min-w-0">
                <p className={G.sectionTitle}>Coverage-week ledger</p>
                <p className={cn(G.helper, 'mt-0.5')}>
                  Realized burn vs. configured cap; stressed columns include the scenario increment.
                </p>
              </div>
            </div>
            {!data || data.cohorts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <Siren className="h-8 w-8 text-white/20" aria-hidden />
                <p className="text-sm text-white/45">No earned weekly policies in this window.</p>
              </div>
            ) : (
              <div
                className={cn(
                  'max-h-[min(520px,60vh)] min-h-0 w-full overflow-y-auto scrollbar-admin',
                  'border-t border-white/[0.06]',
                )}
              >
                <div className="w-full min-w-0 overflow-x-auto scrollbar-admin pb-1">
                  <Table className="min-w-[920px]">
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className={cn(G.th, 'whitespace-nowrap')}>Week (IST)</TableHead>
                      <TableHead className={cn(G.th, 'text-right')}>Policies</TableHead>
                      <TableHead className={cn(G.th, 'text-right whitespace-nowrap')}>Premium</TableHead>
                      <TableHead className={cn(G.th, 'text-right whitespace-nowrap')}>Max exp.</TableHead>
                      <TableHead className={cn(G.th, 'text-right')}>Realized</TableHead>
                      <TableHead className={cn(G.th, 'text-right')}>Headroom</TableHead>
                      <TableHead className={cn(G.th, 'text-right whitespace-nowrap')}>Stress +</TableHead>
                      <TableHead className={cn(G.th, 'text-right whitespace-nowrap')}>Stressed</TableHead>
                      <TableHead className={cn(G.th, 'text-right')}>Gap</TableHead>
                      <TableHead className={cn(G.th, 'text-right whitespace-nowrap')}>Cap %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.cohorts.map((c) => (
                      <TableRow
                        key={c.weekStart}
                        className="border-white/[0.06] transition-colors hover:bg-white/[0.02]"
                      >
                        <TableCell className={cn(G.td, 'whitespace-nowrap text-white/80')}>
                          {formatShortDateIST(c.weekStart)}
                          {c.weekEnd ? (
                            <span className="text-white/35"> — {formatShortDateIST(c.weekEnd)}</span>
                          ) : null}
                        </TableCell>
                        <TableCell className={cn(G.td, 'text-right tabular-nums text-white/45')}>
                          {c.policyCount}
                        </TableCell>
                        <TableCell className={cn(G.td, 'text-right tabular-nums text-white')}>
                          {inr(c.earnedPremiumInr)}
                        </TableCell>
                        <TableCell className={cn(G.td, 'text-right tabular-nums text-violet-300/90')}>
                          {inr(c.cohortMaxExposureInr)}
                        </TableCell>
                        <TableCell className={cn(G.td, 'text-right tabular-nums text-emerald-300/85')}>
                          {inr(c.realizedPayoutInr)}
                        </TableCell>
                        <TableCell className={cn(G.td, 'text-right tabular-nums text-white/45')}>
                          {inr(c.headroomInr)}
                        </TableCell>
                        <TableCell className={cn(G.td, 'text-right tabular-nums text-amber-200/90')}>
                          +{inr(c.incrementalStressInr)}
                        </TableCell>
                        <TableCell className={cn(G.td, 'text-right tabular-nums text-amber-100/95')}>
                          {inr(c.stressedTotalPayoutInr)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            G.td,
                            'text-right tabular-nums',
                            c.liquidityGapVsPremiumInr > 0 ? 'text-red-300/90' : 'text-emerald-300/85',
                          )}
                        >
                          {c.liquidityGapVsPremiumInr >= 0 ? '+' : ''}
                          {inr(c.liquidityGapVsPremiumInr)}
                        </TableCell>
                        <TableCell className={cn(G.td, 'text-right tabular-nums text-white/45')}>
                          {c.utilizationOfCapPct.toFixed(1)} → {c.stressedUtilizationOfCapPct.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="drill" className="mt-4 space-y-4">
          {data && data.cohorts.length > 0 ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardHeader
                  className="mb-0"
                  title="Geography & peril mix"
                  description="Pick a coverage week to compare zone-level exposure with realized payouts by trigger type."
                />
                <label className="flex items-center gap-2 sm:shrink-0">
                  <span className={G.fieldLabel}>Week</span>
                  <select
                    value={detailWeek ?? ''}
                    onChange={(e) => setDetailWeek(e.target.value || null)}
                    className={cn(G.input, 'min-w-[140px] cursor-pointer px-3')}
                  >
                    {data.cohorts.map((c) => (
                      <option key={c.weekStart} value={c.weekStart}>
                        {formatShortDateIST(c.weekStart)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card variant="default" padding="none" className={cn(G.contentCard, 'flex flex-col overflow-hidden')}>
                  <div className={G.panelHeader}>
                    <p className={G.sectionTitle}>By zone</p>
                    <Badge variant="secondary" className="border-0 bg-white/[0.06] text-[10px] text-white/50">
                      Expected vs realized
                    </Badge>
                  </div>
                  {!detail || detail.byZone.length === 0 ? (
                    <div className="px-4 py-12 text-center text-sm text-white/40">No zone breakdown.</div>
                  ) : (
                    <ScrollArea
                      viewportClassName="scrollbar-admin"
                      className={cn(
                        G.tableShell,
                        '!h-[min(360px,42vh)] min-h-[200px] border-0',
                      )}
                    >
                      <div className="min-w-0 overflow-x-auto scrollbar-admin">
                        <Table className="min-w-[520px]">
                        <TableHeader>
                          <TableRow className="border-white/[0.06] hover:bg-transparent">
                            <TableHead className={G.th}>Zone</TableHead>
                            <TableHead className={cn(G.th, 'text-right')}>N</TableHead>
                            <TableHead className={cn(G.th, 'text-right')}>Premium</TableHead>
                            <TableHead className={cn(G.th, 'text-right')}>Max</TableHead>
                            <TableHead className={cn(G.th, 'text-right')}>Paid</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.byZone.map((z) => (
                            <TableRow key={z.zone} className="border-white/[0.06] hover:bg-white/[0.02]">
                              <TableCell
                                className={cn(G.td, 'max-w-[160px] truncate text-white/80')}
                                title={z.zone}
                              >
                                {z.zone}
                              </TableCell>
                              <TableCell className={cn(G.td, 'text-right tabular-nums')}>{z.policyCount}</TableCell>
                              <TableCell className={cn(G.td, 'text-right tabular-nums text-white')}>
                                {inr(z.earnedPremiumInr)}
                              </TableCell>
                              <TableCell className={cn(G.td, 'text-right tabular-nums text-violet-300/85')}>
                                {inr(z.maxExposureInr)}
                              </TableCell>
                              <TableCell className={cn(G.td, 'text-right tabular-nums text-emerald-300/85')}>
                                {inr(z.realizedPayoutInr)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    </ScrollArea>
                  )}
                </Card>

                <Card variant="default" padding="none" className={cn(G.contentCard, 'flex flex-col overflow-hidden')}>
                  <div className={G.panelHeader}>
                    <p className={G.sectionTitle}>By peril</p>
                    <Badge variant="secondary" className="border-0 bg-white/[0.06] text-[10px] text-white/50">
                      From disruption events
                    </Badge>
                  </div>
                  {!detail || detail.byPeril.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-14 text-center">
                      <Activity className="h-7 w-7 text-white/15" aria-hidden />
                      <p className="text-sm text-white/40">No claims linked to events for this week.</p>
                    </div>
                  ) : (
                    <ScrollArea
                      viewportClassName="scrollbar-admin"
                      className={cn(
                        G.tableShell,
                        '!h-[min(360px,42vh)] min-h-[200px] border-0',
                      )}
                    >
                      <div className="min-w-0 overflow-x-auto scrollbar-admin">
                        <Table className="min-w-[320px]">
                        <TableHeader>
                          <TableRow className="border-white/[0.06] hover:bg-transparent">
                            <TableHead className={G.th}>Event type</TableHead>
                            <TableHead className={cn(G.th, 'text-right')}>Claims</TableHead>
                            <TableHead className={cn(G.th, 'text-right')}>Payout</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detail.byPeril.map((p) => (
                            <TableRow key={p.peril} className="border-white/[0.06] hover:bg-white/[0.02]">
                              <TableCell className={cn(G.td, 'font-mono text-[11px] text-white/70')}>
                                {p.peril}
                              </TableCell>
                              <TableCell className={cn(G.td, 'text-right tabular-nums')}>{p.claimCount}</TableCell>
                              <TableCell className={cn(G.td, 'text-right tabular-nums text-emerald-300/85')}>
                                {inr(p.realizedPayoutInr)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      </div>
                    </ScrollArea>
                  )}
                </Card>
              </div>
            </>
          ) : (
            <Card variant="default" className={cn(G.contentCard, 'p-8 text-center text-sm text-white/45')}>
              Load cohort data from the first tab — no policies in range yet.
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
