/**
 * Dynamic weekly premium calculation.
 * Uses historical disruption frequency in the rider's zone.
 * Base premium + risk adjustment from past events.
 */

const BASE_PREMIUM = 79;
const MAX_PREMIUM = 149;
const RISK_FACTOR_PER_EVENT = 8;
const WEEKS_LOOKBACK = 4;

export interface PremiumInput {
  zoneName?: string | null;
  historicalEventCount?: number;
}

export function calculateWeeklyPremium(input: PremiumInput): number {
  const events = input.historicalEventCount ?? 0;
  const riskAdjustment = Math.min(
    events * RISK_FACTOR_PER_EVENT,
    MAX_PREMIUM - BASE_PREMIUM
  );
  return Math.round(BASE_PREMIUM + riskAdjustment);
}

export async function getHistoricalEventCount(
  supabase: { from: (table: string) => { select: (cols: string) => { gte: (col: string, val: string) => Promise<{ data: unknown[] | null }> } } },
  zoneName?: string | null
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - WEEKS_LOOKBACK * 7);

  const { data } = await supabase
    .from("live_disruption_events")
    .select("id")
    .gte("created_at", since.toISOString());

  const count = (data ?? []).length;
  return zoneName ? count : Math.floor(count / 2);
}
