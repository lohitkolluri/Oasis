import { AdminRiderActions } from '@/components/admin/AdminRiderActions';
import { RiderGovernmentIdAvatar } from '@/components/admin/RiderGovernmentIdAvatar';
import { RoleSelector } from '@/components/admin/RoleSelector';
import { Card } from '@/components/ui/Card';
import { createAdminClient } from '@/lib/supabase/admin';
import { reverseGeocode } from '@/lib/utils/geo';
import { FileCheck, Inbox, MapPin, Phone, Shield, User } from 'lucide-react';
import { ZoneMapLazy } from '@/components/ui/ZoneMapLazy';
import { notFound } from 'next/navigation';

const GOVERNMENT_IDS_BUCKET = 'government-ids';

export default async function AdminRiderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (!profile) notFound();

  const [policiesRes, plansRes] = await Promise.all([
    supabase
      .from('weekly_policies')
      .select(
        `id, plan_id, week_start_date, week_end_date, weekly_premium_inr, is_active, created_at, plan_packages(name, slug, payout_per_claim_inr)`,
      )
      .eq('profile_id', id)
      .order('week_start_date', { ascending: false })
      .limit(20),
    supabase
      .from('plan_packages')
      .select('id, name, slug, weekly_premium_inr, payout_per_claim_inr')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  const policies = policiesRes.data ?? [];
  const plans = plansRes.data ?? [];
  const policyIds = policies.map((p) => p.id);

  const hasCoords = profile.zone_latitude != null && profile.zone_longitude != null;
  const govIdPath = (profile as { government_id_url?: string | null }).government_id_url;

  const [claimsRes, geocodedAddressRes, signedUrlRes] = await Promise.all([
    policyIds.length > 0
      ? supabase
          .from('parametric_claims')
          .select('id, payout_amount_inr, status, is_flagged, flag_reason, created_at')
          .in('policy_id', policyIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    hasCoords
      ? reverseGeocode(profile.zone_latitude!, profile.zone_longitude!)
      : Promise.resolve(null),
    govIdPath && typeof govIdPath === 'string'
      ? supabase.storage.from(GOVERNMENT_IDS_BUCKET).createSignedUrl(govIdPath, 3600)
      : Promise.resolve({ data: null }),
  ]);

  const claims = claimsRes.data ?? [];
  const geocodedAddress = geocodedAddressRes;
  let governmentIdImageUrl: string | null = null;
  if (signedUrlRes.data?.signedUrl) governmentIdImageUrl = signedUrlRes.data.signedUrl;

  const zoneData = profile.primary_zone_geofence as {
    zone_name?: string;
    coordinates?: unknown;
  } | null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const sortedPolicies = [...(policies ?? [])].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime();
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header: rider identity + actions */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4 min-w-0">
          <RiderGovernmentIdAvatar
            imageUrl={governmentIdImageUrl}
            riderName={profile.full_name ?? 'Unnamed rider'}
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-white tracking-tight truncate">
              {profile.full_name ?? 'Unnamed rider'}
            </h1>
            <p className="text-sm text-zinc-500 mt-1 capitalize">
              {profile.platform ?? '—'} · {zoneData?.zone_name ?? 'No zone'}
            </p>
            <p
              className="text-[11px] text-zinc-600 font-mono mt-2 truncate"
              title={`${profile.id} (click to copy)`}
            >
              ID {profile.id.slice(0, 8)}…
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-stretch gap-3 sm:flex-nowrap">
          <AdminRiderActions riderId={id} policies={policies} plans={plans} />
          <Card
            variant="outline"
            padding="md"
            className="w-full sm:w-auto min-w-[140px] border-white/5"
          >
            <RoleSelector
              profileId={id}
              currentRole={(profile as { role?: string }).role === 'admin' ? 'admin' : 'rider'}
            />
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card variant="elevated" padding="lg" className="border-white/5">
          <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="h-3.5 w-3.5" />
            Profile
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] text-zinc-500 uppercase tracking-wide">Full name</dt>
              <dd className="text-zinc-100 font-medium">{profile.full_name ?? '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] text-zinc-500 uppercase tracking-wide">Phone</dt>
              <dd className="text-zinc-100 flex items-center gap-1.5">
                {profile.phone_number ? (
                  <>
                    <Phone className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    {profile.phone_number}
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] text-zinc-500 uppercase tracking-wide">Platform</dt>
              <dd className="text-zinc-100 capitalize">{profile.platform ?? '—'}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-[11px] text-zinc-500 uppercase tracking-wide">Zone</dt>
              <dd className="text-zinc-100 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                {zoneData?.zone_name ?? '—'}
              </dd>
            </div>
            {geocodedAddress && (
              <div className="flex flex-col gap-0.5 sm:col-span-2">
                <dt className="text-[11px] text-zinc-500 uppercase tracking-wide">Locality</dt>
                <dd className="text-zinc-100 text-xs leading-relaxed">{geocodedAddress}</dd>
              </div>
            )}
            <div className="flex flex-col gap-0.5 sm:col-span-2">
              <dt className="text-[11px] text-zinc-500 uppercase tracking-wide">Coords</dt>
              <dd className="text-zinc-400 font-mono text-xs">
                {hasCoords
                  ? `${profile.zone_latitude!.toFixed(4)}, ${profile.zone_longitude!.toFixed(4)}`
                  : '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card variant="elevated" padding="lg" className="border-white/5">
          <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            Policies
          </h2>
          {sortedPolicies.length ? (
            <ul className="space-y-0 divide-y divide-white/5">
              {sortedPolicies.map((p) => {
                const plan = p.plan_packages as {
                  name?: string;
                  payout_per_claim_inr?: number;
                } | null;
                return (
                  <li
                    key={p.id}
                    className={`flex items-center justify-between gap-4 py-3 first:pt-0 ${
                      p.is_active ? 'border-l-2 border-l-uber-green pl-3 -ml-px' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-100">
                        {plan?.name ?? 'Legacy'} · ₹{Number(p.weekly_premium_inr).toLocaleString()}
                        /wk
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {formatDate(p.week_start_date)} – {formatDate(p.week_end_date)}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] shrink-0 ${
                        p.is_active ? 'text-uber-green' : 'text-zinc-600'
                      }`}
                    >
                      {p.is_active ? 'Current' : 'Expired'}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="h-10 w-10 text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-500">No policies</p>
              <p className="text-xs text-zinc-600 mt-1">Rider has no policy history</p>
            </div>
          )}
        </Card>
      </div>

      <Card variant="elevated" padding="lg" className="border-white/5">
        <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileCheck className="h-3.5 w-3.5" />
          Recent claims
        </h2>
        {claims?.length ? (
          <ul className="space-y-0 divide-y divide-white/5">
            {claims.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 first:pt-0 text-sm"
              >
                <span className="font-mono text-zinc-500 text-xs">{c.id.slice(0, 8)}…</span>
                <span className="font-medium text-uber-green tabular-nums">
                  +₹{Number(c.payout_amount_inr).toLocaleString()}
                </span>
                <span className="text-zinc-500 text-xs">
                  {new Date(c.created_at).toLocaleDateString('en-IN')}
                </span>
                {c.is_flagged && <span className="text-[11px] text-uber-yellow">Flagged</span>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Inbox className="h-10 w-10 text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-500">No claims yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              Claims will appear here when payouts are made
            </p>
          </div>
        )}
      </Card>

      {hasCoords && (
        <Card variant="elevated" padding="lg" className="border-white/5 overflow-hidden">
          <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-4">
            Delivery zone
          </h2>
          <ZoneMapLazy
            centerLat={profile.zone_latitude!}
            centerLng={profile.zone_longitude!}
            radiusKm={15}
            zoneName={geocodedAddress ?? zoneData?.zone_name ?? 'Delivery Zone'}
            className="h-72 rounded-xl"
          />
        </Card>
      )}
    </div>
  );
}
