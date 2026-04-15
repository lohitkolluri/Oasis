import type { SupabaseClient } from '@supabase/supabase-js';

export type SharedPayoutDestinationRow = {
  payment_routing_id: string;
  profile_count: number;
  profile_ids: string[];
};

/** Groups profiles by `payment_routing_id` for fraud ops (multi-account / shared UPI). */
export async function listSharedPayoutDestinations(
  admin: SupabaseClient,
  options?: { fetchCap?: number; top?: number; idSample?: number },
): Promise<SharedPayoutDestinationRow[]> {
  const fetchCap = options?.fetchCap ?? 3000;
  const top = options?.top ?? 30;
  const idSample = options?.idSample ?? 15;

  const { data: rows, error } = await admin
    .from('profiles')
    .select('id, payment_routing_id')
    .not('payment_routing_id', 'is', null)
    .limit(fetchCap);

  if (error) throw new Error(error.message);

  const byRoute = new Map<string, string[]>();
  for (const r of rows ?? []) {
    const row = r as { id: string; payment_routing_id: string | null };
    const pid = row.payment_routing_id;
    if (!pid) continue;
    const list = byRoute.get(pid) ?? [];
    list.push(row.id);
    byRoute.set(pid, list);
  }

  return [...byRoute.entries()]
    .filter(([, ids]) => ids.length >= 2)
    .map(([payment_routing_id, profile_ids]) => ({
      payment_routing_id,
      profile_count: profile_ids.length,
      profile_ids: profile_ids.slice(0, idSample),
    }))
    .sort((a, b) => b.profile_count - a.profile_count)
    .slice(0, top);
}
