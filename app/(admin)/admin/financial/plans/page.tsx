import { AdminPageTitle } from '@/components/admin/AdminPageTitle';
import { PlanPricingForecastChartLazy } from '@/components/admin/PlanPricingForecastChartLazy';
import type {
  PlanPricingTimelineRow,
  PlanTierKey,
} from '@/components/admin/PlanPricingTimelineTable';
import { PlanPricingTimelineTable } from '@/components/admin/PlanPricingTimelineTable';
import { Card } from '@/components/ui/Card';
import { callOpenRouterChat } from '@/lib/clients/openrouter';
import { PREMIUM, WEEKLY_POLICY_EARNED_PREMIUM_STATUSES } from '@/lib/config/constants';
import { getPricingForecastModel } from '@/lib/config/env';
import { getISTCurrentCoverageWeekMondayStart, getISTDateString } from '@/lib/datetime/ist';
import { parseLlmJsonWithSchema } from '@/lib/llm/strict-json';
import { createAdminClient } from '@/lib/supabase/admin';
import { addDays } from '@/lib/utils/date';
import { getPolicyWeekRange } from '@/lib/utils/policy-week';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type PlanPackage = Record<string, any>;

/** Monday YYYY-MM-DD (IST) for the policy week containing `date`. */
function istPolicyWeekMondayYmd(date: Date): string {
  return getISTDateString(getISTCurrentCoverageWeekMondayStart(date));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const w = idx - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

function clampWeeklyPremiumInr(n: number): number {
  return Math.max(PREMIUM.BASE, Math.min(PREMIUM.MAX, Math.round(n)));
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const ForecastTierJsonSchema = z
  .object({
    basic: z.number(),
    standard: z.number(),
    premium: z.number(),
    note: z.string().optional(),
  })
  .strict();

function toFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

function stdev(xs: number[]): number {
  if (xs.length <= 1) return 0;
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function summarize(xs: number[]): { n: number; mean: number; p50: number; p90: number } {
  const sorted = xs
    .filter((n) => Number.isFinite(n))
    .slice()
    .sort((a, b) => a - b);
  return {
    n: sorted.length,
    mean: Number(mean(sorted).toFixed(3)),
    p50: Number(percentile(sorted, 0.5).toFixed(3)),
    p90: Number(percentile(sorted, 0.9).toFixed(3)),
  };
}

async function maybeForecastWithLlm(input: {
  weekStart: string;
  basicKey: PlanTierKey;
  standardKey: PlanTierKey;
  premiumKey: PlanTierKey;
  recValues: number[];
  lastActual: { basic: number | null; standard: number | null; premium: number | null };
  history: {
    standardActualLastN: number[];
    premiumActualLastN: number[];
  };
  signals: {
    forecastRisk: { n: number; mean: number; p50: number; p90: number };
    historicalEvents: { n: number; mean: number; p50: number; p90: number };
    socialRisk: { n: number; mean: number; p50: number; p90: number };
    claimCount4w: { n: number; mean: number; p50: number; p90: number };
  };
  deterministic: { basic: number; standard: number; premium: number };
}): Promise<{ basic: number; standard: number; premium: number; note: string | null }> {
  // If OpenRouter isn't configured, keep this deterministic.
  if (!process.env.OPENROUTER_API_KEY) {
    return { ...input.deterministic, note: null };
  }

  const p25 = percentile(input.recValues, 0.25);
  const p50 = percentile(input.recValues, 0.5);
  const p75 = percentile(input.recValues, 0.75);

  const stdHist = input.history.standardActualLastN;
  const premHist = input.history.premiumActualLastN;
  const stdMean = mean(stdHist);
  const stdSd = stdev(stdHist);
  const premMean = mean(premHist);
  const premSd = stdev(premHist);

  const model = getPricingForecastModel();
  try {
    const system = [
      'You are an actuarial pricing assistant for a weekly parametric income-protection product in India.',
      'Coverage scope: income loss from external disruptions only (weather, lockdowns, gridlock).',
      'Do NOT mention health, life, accidents, or vehicle repairs as covered.',
      '',
      'Goal: output next-week tier prices (Basic/Standard/Premium) as JSON only.',
      '',
      'Hard constraints:',
      `- All premiums are weekly INR integers within [${PREMIUM.BASE}, ${PREMIUM.MAX}].`,
      '- Must maintain tier separation: basic < standard < premium.',
      '- Premium may equal the global cap, but Standard should leave headroom so Premium is not forced to equal Standard.',
      '- Use the provided distribution + last actual snapshots; prefer stability over volatility.',
      '',
      'Return JSON only with schema:',
      '{"basic": number, "standard": number, "premium": number, "note": string}',
    ].join('\n');

    const user = [
      `Week start: ${input.weekStart}`,
      '',
      'Per-profile recommended premium distribution (INR) for target week:',
      `- count: ${input.recValues.length}`,
      `- p25: ${p25.toFixed(1)}`,
      `- median: ${p50.toFixed(1)}`,
      `- p75: ${p75.toFixed(1)}`,
      '',
      'Upstream risk signals used by the pricing engine (aggregated across profiles):',
      `- forecast_risk (0-1): n=${input.signals.forecastRisk.n}, mean=${input.signals.forecastRisk.mean}, p50=${input.signals.forecastRisk.p50}, p90=${input.signals.forecastRisk.p90}`,
      `- historical_events (count): n=${input.signals.historicalEvents.n}, mean=${input.signals.historicalEvents.mean}, p50=${input.signals.historicalEvents.p50}, p90=${input.signals.historicalEvents.p90}`,
      `- social_risk (0-1): n=${input.signals.socialRisk.n}, mean=${input.signals.socialRisk.mean}, p50=${input.signals.socialRisk.p50}, p90=${input.signals.socialRisk.p90}`,
      `- claim_count_4w (count): n=${input.signals.claimCount4w.n}, mean=${input.signals.claimCount4w.mean}, p50=${input.signals.claimCount4w.p50}, p90=${input.signals.claimCount4w.p90}`,
      '',
      'Historical plan pricing snapshots (recent weeks, INR):',
      `- Standard last ${stdHist.length} actuals: ${stdHist.length ? stdHist.join(', ') : 'none'}`,
      `- Standard mean: ${stdMean.toFixed(1)}; stdev: ${stdSd.toFixed(1)}`,
      `- Premium last ${premHist.length} actuals: ${premHist.length ? premHist.join(', ') : 'none'}`,
      `- Premium mean: ${premMean.toFixed(1)}; stdev: ${premSd.toFixed(1)}`,
      '',
      'Last actual snapshot (INR) for previous week (may be null):',
      `- basic: ${input.lastActual.basic ?? 'null'}`,
      `- standard: ${input.lastActual.standard ?? 'null'}`,
      `- premium: ${input.lastActual.premium ?? 'null'}`,
      '',
      'Deterministic baseline forecast (INR):',
      `- basic: ${input.deterministic.basic}`,
      `- standard: ${input.deterministic.standard}`,
      `- premium: ${input.deterministic.premium}`,
      '',
      'Decide final tier premiums.',
      '- Use the historical snapshot trend/volatility as a stabilizer (avoid big jumps unless distribution strongly supports it).',
      '- If forecast_risk / social_risk / historical_events are elevated (especially p90), it is acceptable to push Premium up faster than Standard (while preserving tier separation).',
      '- Prefer continuity: if history is flat, keep forecast near history; if history shows sustained rise/fall, allow gentle movement.',
      'Reply JSON only.',
    ].join('\n');

    const data = await callOpenRouterChat({
      model,
      temperature: 0,
      max_tokens: 120,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = parseLlmJsonWithSchema(ForecastTierJsonSchema, content);

    // Enforce constraints post-parse, even if the model drifts.
    let basic = clampWeeklyPremiumInr(parsed.basic);
    let standard = clampWeeklyPremiumInr(parsed.standard);
    let premium = clampWeeklyPremiumInr(parsed.premium);

    // Ensure strict ordering and headroom.
    const STANDARD_MAX_FOR_PREMIUM_HEADROOM = Math.floor(PREMIUM.MAX / 1.3);
    standard = Math.min(standard, STANDARD_MAX_FOR_PREMIUM_HEADROOM);
    basic = Math.min(basic, standard - 1);
    premium = Math.max(premium, standard + 1);

    basic = clampWeeklyPremiumInr(basic);
    standard = clampWeeklyPremiumInr(standard);
    premium = clampWeeklyPremiumInr(premium);

    // If clamping collapses tiers, fall back.
    if (!(basic < standard && standard < premium)) {
      return {
        ...input.deterministic,
        note: 'LLM forecast collapsed tiers; fell back to baseline',
      };
    }

    return { basic, standard, premium, note: parsed.note ?? `LLM: ${model}` };
  } catch {
    return { ...input.deterministic, note: null };
  }
}

export default async function PlansPage() {
  const supabase = createAdminClient();

  let plans: PlanPackage[] = [];
  try {
    const { data } = await supabase
      .from('plan_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    plans = (data ?? []) as PlanPackage[];
  } catch {
    plans = [];
  }

  const payoutsByPlan = new Map<string, number>();

  const activePlans = plans
    .map((p) => ({
      id: String(p.id),
      slug: String(p.slug ?? ''),
      name: String(p.name ?? p.label ?? p.tier ?? 'Plan'),
      sortOrder: Number(p.sort_order ?? 0),
    }))
    .filter((p) => !!p.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const now = new Date();
  /** Same week key as `weekly-premium` cron (`getPolicyWeekRange()`). */
  const forecastWeekStart = getPolicyWeekRange(now).start;
  const currentWeekStart = istPolicyWeekMondayYmd(now);
  const sinceIso = addDays(currentWeekStart, -7 * 23);
  // Rolling plan performance window aligned with pricing widgets.
  const performanceSinceIso = sinceIso;

  const [snapshotsRes, policiesPaidRes, recsRes] = await Promise.all([
    supabase
      .from('plan_pricing_snapshots')
      .select('week_start_date, plan_id, weekly_premium_inr, source')
      .gte('week_start_date', sinceIso)
      .order('week_start_date', { ascending: false }),
    supabase
      .from('weekly_policies')
      .select('id, week_start_date, plan_id, payment_status, weekly_premium_inr')
      .gte('week_start_date', performanceSinceIso)
      .in('payment_status', [...WEEKLY_POLICY_EARNED_PREMIUM_STATUSES]),
    supabase
      .from('premium_recommendations')
      .select('recommended_premium_inr, risk_factors')
      .eq('week_start_date', forecastWeekStart),
  ]);

  const dataErrors: Array<{ label: string; message: string }> = [];
  if (snapshotsRes.error) {
    dataErrors.push({
      label: 'plan_pricing_snapshots',
      message: snapshotsRes.error.message,
    });
  }
  if (policiesPaidRes.error) {
    dataErrors.push({
      label: 'weekly_policies',
      message: policiesPaidRes.error.message,
    });
  }
  if (recsRes.error) {
    dataErrors.push({
      label: 'premium_recommendations',
      message: recsRes.error.message,
    });
  }

  type RecSource = 'target' | 'latest' | 'catalog';
  let recSource: RecSource = 'target';
  let usedWeekForRecs = forecastWeekStart;
  let recRows = (recsRes.data ?? []) as Array<{
    recommended_premium_inr: number;
    risk_factors?: unknown;
  }>;

  if (recRows.length === 0 && !recsRes.error) {
    const { data: maxRow, error: maxErr } = await supabase
      .from('premium_recommendations')
      .select('week_start_date')
      .order('week_start_date', { ascending: false })
      .limit(1);
    if (!maxErr && maxRow?.[0]?.week_start_date) {
      const lw = maxRow[0].week_start_date as string;
      if (lw !== forecastWeekStart) {
        const { data: latestRecs } = await supabase
          .from('premium_recommendations')
          .select('recommended_premium_inr, risk_factors')
          .eq('week_start_date', lw);
        recRows = (latestRecs ?? []) as Array<{
          recommended_premium_inr: number;
          risk_factors?: unknown;
        }>;
        if (recRows.length > 0) {
          recSource = 'latest';
          usedWeekForRecs = lw;
        }
      }
    }
  }

  const snapshots = (snapshotsRes.data ?? []) as Array<{
    week_start_date: string;
    plan_id: string;
    weekly_premium_inr: number;
    source?: string | null;
  }>;

  const paidPolicies = (policiesPaidRes.data ?? []) as Array<{
    id: string;
    week_start_date: string;
    plan_id: string | null;
    weekly_premium_inr?: number | null;
  }>;

  const subsByWeekPlan = new Map<string, number>();
  const premiumByWeekPlan = new Map<string, number>();
  for (const p of paidPolicies) {
    if (!p.plan_id) continue;
    const key = `${p.week_start_date}:${p.plan_id}`;
    subsByWeekPlan.set(key, (subsByWeekPlan.get(key) ?? 0) + 1);
    premiumByWeekPlan.set(
      key,
      (premiumByWeekPlan.get(key) ?? 0) + Number(p.weekly_premium_inr ?? 0),
    );
  }

  // Payouts across policies in the rolling window
  if (paidPolicies.length > 0) {
    const policyIds = paidPolicies.map((p) => p.id);
    const { data: payoutRows } = await supabase
      .from('parametric_claims')
      .select('policy_id, payout_amount_inr')
      .in('policy_id', policyIds);
    for (const row of (payoutRows ?? []) as Array<{
      policy_id: string;
      payout_amount_inr: number;
    }>) {
      payoutsByPlan.set(
        row.policy_id,
        (payoutsByPlan.get(row.policy_id) ?? 0) + Number(row.payout_amount_inr ?? 0),
      );
    }
  }

  const priceByWeekPlan = new Map<string, number>();
  for (const s of snapshots) {
    const key = `${s.week_start_date}:${s.plan_id}`;
    priceByWeekPlan.set(key, clampWeeklyPremiumInr(Number(s.weekly_premium_inr)));
  }

  // Build week list from DB-returned week_start_date values to avoid timezone/ISO-week mismatches.
  const weekStartSet = new Set<string>();
  snapshots.forEach((s) => weekStartSet.add(s.week_start_date));
  paidPolicies.forEach((p) => weekStartSet.add(p.week_start_date));

  const weekStarts = Array.from(weekStartSet).sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
  // Ensure we have a consistent 24-week window for the chart/table.
  if (weekStarts.length > 0) {
    while (weekStarts.length < 24) {
      const last = weekStarts[weekStarts.length - 1]!;
      weekStarts.push(addDays(last, -7));
    }
  } else {
    const base = istPolicyWeekMondayYmd(now);
    for (let i = 0; i < 24; i++) weekStarts.push(addDays(base, -7 * i));
  }

  const tierOrder: Array<{ key: PlanTierKey; label: string; planId: string }> = activePlans.map(
    (p) => ({
      key: p.slug || p.id,
      label: p.name,
      planId: p.id,
    }),
  );

  const timelineRows: PlanPricingTimelineRow[] = weekStarts.map((w) => {
    const tiers: Record<
      PlanTierKey,
      { label: string; weeklyPremiumInr: number | null; subscriberCount: number }
    > = {};
    for (const t of tierOrder) {
      const k = `${w}:${t.planId}`;
      tiers[t.key] = {
        label: t.label,
        weeklyPremiumInr: priceByWeekPlan.get(k) ?? null,
        subscriberCount: subsByWeekPlan.get(k) ?? 0,
      };
    }
    return { weekStartDate: w, tiers };
  });

  const lastHistorical = timelineRows[0];

  // Forecast: premium_recommendations for enrollment week `forecastWeekStart` (cron-aligned), else latest DB week, else catalog.
  const recValues = recRows
    .map((r: { recommended_premium_inr: number }) => Number(r.recommended_premium_inr))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  const forecastRiskValues: number[] = [];
  const historicalEventsValues: number[] = [];
  const socialRiskValues: number[] = [];
  const claimCount4wValues: number[] = [];

  for (const row of recRows as Array<{ risk_factors?: unknown }>) {
    const rf = (row as any)?.risk_factors ?? null;
    if (!rf || typeof rf !== 'object') continue;
    const obj = rf as Record<string, unknown>;
    const fr = toFiniteNumber(obj.forecast_risk);
    const he = toFiniteNumber(obj.historical_events);
    const sr = toFiniteNumber(obj.social_risk);
    const cc = toFiniteNumber(obj.claim_count_4w);
    if (fr != null) forecastRiskValues.push(fr);
    if (he != null) historicalEventsValues.push(he);
    if (sr != null) socialRiskValues.push(sr);
    if (cc != null) claimCount4wValues.push(cc);
  }

  const signalSummary = {
    forecastRisk: summarize(forecastRiskValues),
    historicalEvents: summarize(historicalEventsValues),
    socialRisk: summarize(socialRiskValues),
    claimCount4w: summarize(claimCount4wValues),
  };

  const predictedByTier = new Map<PlanTierKey, number>();
  if (recValues.length > 0 && tierOrder.length >= 3) {
    // Industry-style: derive a robust central "Standard" premium first, then scale tiers.
    // This makes the forecast stable and interpretable (tiers are functions of one indicated price),
    // while remaining hard-capped to product bounds.
    const STANDARD_MAX_FOR_PREMIUM_HEADROOM = Math.floor(PREMIUM.MAX / 1.3);
    const standardIndicated = Math.min(
      STANDARD_MAX_FOR_PREMIUM_HEADROOM,
      clampWeeklyPremiumInr(median(recValues)),
    );

    const keys = tierOrder.map((t) => t.key);
    const deterministic = {
      basic: clampWeeklyPremiumInr(standardIndicated * 0.7),
      standard: standardIndicated,
      premium: clampWeeklyPremiumInr(standardIndicated * 1.3),
    };

    const lastActual = {
      basic: lastHistorical?.tiers?.[keys[0]!]?.weeklyPremiumInr ?? null,
      standard: lastHistorical?.tiers?.[keys[1]!]?.weeklyPremiumInr ?? null,
      premium: lastHistorical?.tiers?.[keys[2]!]?.weeklyPremiumInr ?? null,
    };

    // Pull a small recent-history window from the already-loaded timelineRows (no extra DB query).
    // These rows are week-start aligned and include actual snapshot premiums where present.
    const HISTORY_WEEKS = 8;
    const standardActualLastN = timelineRows
      .slice(0, HISTORY_WEEKS)
      .map((r) => r.tiers?.[keys[1]!]?.weeklyPremiumInr)
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
      .map((n) => clampWeeklyPremiumInr(n));

    const premiumActualLastN = timelineRows
      .slice(0, HISTORY_WEEKS)
      .map((r) => r.tiers?.[keys[2]!]?.weeklyPremiumInr)
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
      .map((n) => clampWeeklyPremiumInr(n));

    const llmForecast = await maybeForecastWithLlm({
      weekStart: forecastWeekStart,
      basicKey: keys[0]!,
      standardKey: keys[1]!,
      premiumKey: keys[2]!,
      recValues,
      lastActual,
      history: { standardActualLastN, premiumActualLastN },
      signals: signalSummary,
      deterministic,
    });

    predictedByTier.set(keys[0]!, llmForecast.basic);
    predictedByTier.set(keys[1]!, llmForecast.standard);
    predictedByTier.set(keys[2]!, llmForecast.premium);
  } else if (recValues.length > 0 && tierOrder.length > 0) {
    // If tier count isn't 3, fall back to percentiles across tiers.
    tierOrder.forEach((t, i) => {
      const p = tierOrder.length === 1 ? 0.6 : i / (tierOrder.length - 1);
      predictedByTier.set(t.key, clampWeeklyPremiumInr(percentile(recValues, p)));
    });
  }

  if (predictedByTier.size === 0 && tierOrder.length > 0) {
    for (const t of tierOrder.slice(0, 3)) {
      const plan = plans.find((p) => String(p.id) === t.planId);
      const v = plan?.weekly_premium_inr ?? plan?.weekly_price_inr ?? plan?.price_inr ?? null;
      if (v != null && Number.isFinite(Number(v))) {
        predictedByTier.set(t.key, clampWeeklyPremiumInr(Number(v)));
      }
    }
    if (predictedByTier.size > 0) recSource = 'catalog';
  }

  const forecastTiers = tierOrder.slice(0, 3).map((t, idx) => ({
    key: t.key,
    label: t.label,
    color: idx === 0 ? '#7dd3fc' : idx === 1 ? '#a78bfa' : '#22c55e',
  }));

  const points = [...timelineRows].reverse().map((r) => {
    const point: Record<string, any> = { weekStartDate: r.weekStartDate };
    for (const t of forecastTiers) {
      point[`${t.key}Actual`] = r.tiers[t.key]?.weeklyPremiumInr ?? null;
      point[`${t.key}Pred`] = null;
    }
    return point as any;
  });

  if (points.length > 0) {
    const lastActualPoint = points[points.length - 1] as any;

    // Render a short forward forecast window (next N weeks) so it's clearly "future",
    // not just a single point that can look like the current price.
    const FORECAST_WEEKS = 4;
    let carry = new Map<PlanTierKey, number>();
    for (const t of forecastTiers) {
      const v = predictedByTier.get(t.key);
      if (v != null) carry.set(t.key, v);
    }

    // Only draw forecast when we have any recommendation-driven prediction.
    if (carry.size > 0) {
      // Connect dashed forecast from the last actual point.
      for (const t of forecastTiers) {
        const actualLast = lastActualPoint?.[`${t.key}Actual`] ?? null;
        if (actualLast != null) lastActualPoint[`${t.key}Pred`] = actualLast;
      }

      for (let i = 0; i < FORECAST_WEEKS; i++) {
        const wk = addDays(forecastWeekStart, 7 * i);
        const fp: Record<string, any> = { weekStartDate: wk, isForecast: true };
        for (const t of forecastTiers) {
          const rawPred = carry.get(t.key) ?? null;
          const lastActual = lastHistorical?.tiers?.[t.key]?.weeklyPremiumInr ?? null;
          // Smooth forecast against the most recent actual snapshot to avoid week-to-week jitter.
          // Keep it deterministic and capped in product bounds.
          const smoothed =
            rawPred != null && lastActual != null
              ? clampWeeklyPremiumInr(lastActual * 0.7 + rawPred * 0.3)
              : rawPred != null
                ? clampWeeklyPremiumInr(rawPred)
                : null;
          fp[`${t.key}Actual`] = null;
          fp[`${t.key}Pred`] = smoothed;
        }
        points.push(fp as any);
      }
    }
  }

  const forecastCaption =
    recSource === 'target' && recValues.length > 0
      ? [
          `Model week ${usedWeekForRecs} · ${recValues.length} profiles`,
          '',
          'What this forecast means:',
          '- A best estimate of next week’s prices based on weather + recent disruptions',
          '- We also look at recent weeks so prices don’t jump suddenly',
          `- Prices are always within ₹${PREMIUM.BASE}–₹${PREMIUM.MAX} per week`,
        ].join('\n')
      : recSource === 'latest' && recValues.length > 0
        ? [
            `Showing ${usedWeekForRecs} (${recValues.length} profiles); target ${forecastWeekStart}`,
            '',
            'What this forecast means:',
            '- A best estimate of next week’s prices based on weather + recent disruptions',
            '- We also look at recent weeks so prices don’t jump suddenly',
            `- Prices are always within ₹${PREMIUM.BASE}–₹${PREMIUM.MAX} per week`,
          ].join('\n')
        : recSource === 'catalog' && predictedByTier.size > 0
          ? [
              `Catalog prices · target week ${forecastWeekStart}`,
              '',
              'What this means:',
              '- Forecast data isn’t available for this week yet',
              '- Showing the default plan prices instead',
              `- Prices are always within ₹${PREMIUM.BASE}–₹${PREMIUM.MAX} per week`,
            ].join('\n')
          : `No model rows · target ${forecastWeekStart}`;

  const targetWeekModelSnapshots = snapshots.filter(
    (s) => s.week_start_date === forecastWeekStart && s.source === 'model',
  ).length;
  const pricingDataEpoch = [
    forecastWeekStart,
    recSource,
    usedWeekForRecs,
    recValues.length,
    targetWeekModelSnapshots,
    snapshots.length,
  ].join('|');

  return (
    <div className="space-y-6">
      <AdminPageTitle
        title="Plans & Pricing Performance"
        help="Plan tiers (Basic / Standard / Premium) are defined in plan_packages with weekly premium and per-claim payout caps. Charts compare modeled premiums, recommendations, and uptake. All customer-facing pricing is weekly — do not quote monthly or annual totals as products."
        description="Weekly pricing for Basic, Standard, and Premium cohorts."
      />

      {dataErrors.length > 0 && (
        <Card variant="default" padding="lg" className="bg-[#111111] border-[#262626]">
          <p className="text-sm font-semibold text-white">
            Pricing widgets are not fully configured
          </p>
          <p className="mt-1 text-xs text-[#9ca3af]">
            One or more required tables/columns are missing in your database. Apply migrations and
            re-run the seed.
          </p>
          <div className="mt-3 space-y-2">
            {dataErrors.map((e) => (
              <div
                key={e.label}
                className="rounded-lg border border-[#2d2d2d] bg-[#0b0b0b] px-3 py-2"
              >
                <p className="text-[11px] font-semibold text-[#e5e7eb]">{e.label}</p>
                <p className="text-[11px] text-[#6b7280] mt-0.5">{e.message}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <PlanPricingForecastChartLazy
        key={`forecast:${pricingDataEpoch}`}
        tiers={forecastTiers}
        points={points as any}
        caption={forecastCaption}
        forecastGenerateWeekStart={
          recSource !== 'target' || recValues.length === 0 ? forecastWeekStart : null
        }
      />

      <PlanPricingTimelineTable
        key={`timeline:${pricingDataEpoch}`}
        rows={timelineRows}
        tierOrder={tierOrder}
      />
    </div>
  );
}
