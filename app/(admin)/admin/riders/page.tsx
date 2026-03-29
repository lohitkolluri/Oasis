import { RidersTable } from '@/components/admin/RidersTable';
import { KPICard } from '@/components/ui/KPICard';
import { WEEKLY_POLICY_EARNED_PREMIUM_STATUSES } from '@/lib/config/constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { Users } from 'lucide-react';

export default async function AdminRidersPage() {
  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select(
      `
      id,
      full_name,
      phone_number,
      platform,
      role,
      primary_zone_geofence,
      zone_latitude,
      zone_longitude,
      created_at
    `,
    )
    .order('created_at', { ascending: false });

  const { data: activePolicies } = await supabase
    .from('weekly_policies')
    .select('profile_id, weekly_premium_inr, plan_id')
    .eq('is_active', true)
    .in('payment_status', [...WEEKLY_POLICY_EARNED_PREMIUM_STATUSES]);

  const uniqueRidersWithPolicy = new Set<string>();
  let modeledPremium = 0;
  for (const row of (activePolicies ?? []) as { profile_id: string; weekly_premium_inr: number }[]) {
    uniqueRidersWithPolicy.add(row.profile_id);
    modeledPremium += Number(row.weekly_premium_inr);
  }

  const distinctPlatforms = Array.from(
    new Set(
      (profiles ?? [])
        .map((p) => (p as { platform?: string | null }).platform)
        .filter((p): p is string => !!p),
    ),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Riders
          </h1>
          <p className="text-sm text-[#666] mt-1">
            View and manage delivery partner profiles
          </p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20 tabular-nums font-medium">
          {profiles?.length ?? 0} total
        </span>
      </div>

      {profiles && profiles.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <KPICard
            title="Covered riders"
            label="With active weekly policies"
            value={uniqueRidersWithPolicy.size}
            accent="emerald"
            animateValue
          />
          <KPICard
            title="Modeled weekly premium"
            label="Across all active policies"
            value={`₹${modeledPremium.toLocaleString('en-IN')}`}
            accent="cyan"
            animateValue
          />
          <KPICard
            title="Delivery platforms"
            label="Distinct partner apps connected"
            value={distinctPlatforms.length}
            accent="violet"
            animateValue
          />
        </div>
      )}

      {profiles && profiles.length > 0 ? (
        <RidersTable profiles={profiles as any} />
      ) : (
        <div className="rounded-xl border border-[#2d2d2d] bg-[#161616] flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-[#3a3a3a] mb-4" />
          <p className="text-sm font-medium text-[#555]">No riders registered yet</p>
          <p className="text-xs text-[#444] mt-1">
            Riders appear here after they complete onboarding
          </p>
        </div>
      )}
    </div>
  );
}
