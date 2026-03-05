import { AdminRiderActions } from '@/components/admin/AdminRiderActions';
import { RoleSelector } from '@/components/admin/RoleSelector';
import { Card } from '@/components/ui/Card';
import { ZoneMap } from '@/components/ui/ZoneMap';
import { createAdminClient } from '@/lib/supabase/admin';
import { reverseGeocode } from '@/lib/utils/geo';
import { ArrowLeft, FileCheck, MapPin, Phone, Shield, User } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function AdminRiderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();

  if (!profile) notFound();

  const { data: policies } = await supabase
    .from('weekly_policies')
    .select(
      `
      id,
      plan_id,
      week_start_date,
      week_end_date,
      weekly_premium_inr,
      is_active,
      created_at,
      plan_packages(name, slug, payout_per_claim_inr)
    `,
    )
    .eq('profile_id', id)
    .order('week_start_date', { ascending: false })
    .limit(20);

  const { data: plans } = await supabase
    .from('plan_packages')
    .select('id, name, slug, weekly_premium_inr, payout_per_claim_inr')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const { data: claims } = await supabase
    .from('parametric_claims')
    .select(
      `
      id,
      payout_amount_inr,
      status,
      is_flagged,
      flag_reason,
      created_at
    `,
    )
    .in('policy_id', policies?.map((p) => p.id) ?? [])
    .order('created_at', { ascending: false })
    .limit(20);

  const zoneData = profile.primary_zone_geofence as {
    zone_name?: string;
    coordinates?: unknown;
  } | null;

  // Reverse-geocode zone coordinates to a human-readable address
  const hasCoords =
    profile.zone_latitude != null && profile.zone_longitude != null;
  const geocodedAddress = hasCoords
    ? await reverseGeocode(profile.zone_latitude!, profile.zone_longitude!)
    : null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      <Link
        href="/admin/riders"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to riders
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-800 text-zinc-400">
            <User className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">
              {profile.full_name ?? 'Unnamed rider'}
            </h1>
            <p className="text-sm text-zinc-500 font-mono">{profile.id}</p>
            <p className="text-sm text-zinc-500 mt-1 capitalize">
              {profile.platform ?? '—'} · {zoneData?.zone_name ?? 'No zone'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <AdminRiderActions riderId={id} policies={policies ?? []} plans={plans ?? []} />
          <Card variant="outline" padding="md" className="w-full sm:max-w-xs">
            <RoleSelector
              profileId={id}
              currentRole={(profile as { role?: string }).role === 'admin' ? 'admin' : 'rider'}
            />
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card variant="elevated" padding="lg">
          <h2 className="font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-zinc-500" />
            Profile data
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-zinc-500">Full name</dt>
              <dd className="text-zinc-200">{profile.full_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Phone</dt>
              <dd className="text-zinc-200 flex items-center gap-1.5">
                {profile.phone_number ? (
                  <>
                    <Phone className="h-3.5 w-3.5" />
                    {profile.phone_number}
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Platform</dt>
              <dd className="text-zinc-200 capitalize">{profile.platform ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Zone</dt>
              <dd className="text-zinc-200 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {zoneData?.zone_name ?? '—'}
              </dd>
            </div>
            {geocodedAddress && (
              <div>
                <dt className="text-zinc-500">Locality</dt>
                <dd className="text-zinc-200 text-xs">{geocodedAddress}</dd>
              </div>
            )}
            <div>
              <dt className="text-zinc-500">Coords</dt>
              <dd className="text-zinc-200 font-mono text-xs">
                {hasCoords
                  ? `${profile.zone_latitude!.toFixed(4)}, ${profile.zone_longitude!.toFixed(4)}`
                  : '—'}
              </dd>
            </div>
          </dl>
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 className="font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-zinc-500" />
            Policies
          </h2>
          {policies?.length ? (
            <ul className="space-y-3">
              {policies.map((p) => {
                const plan = p.plan_packages as {
                  name?: string;
                  payout_per_claim_inr?: number;
                } | null;
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b border-zinc-800/60 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-zinc-200">
                        {plan?.name ?? 'Legacy'} · ₹{Number(p.weekly_premium_inr).toLocaleString()}
                        /wk
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(p.week_start_date)} – {formatDate(p.week_end_date)}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.is_active
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-700 text-zinc-500'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Expired'}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-zinc-500 text-sm">No policies</p>
          )}
        </Card>
      </div>

      <Card variant="elevated" padding="lg">
        <h2 className="font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-zinc-500" />
          Recent claims
        </h2>
        {claims?.length ? (
          <ul className="space-y-2">
            {claims.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between py-2 border-b border-zinc-800/60 last:border-0 text-sm"
              >
                <span className="font-mono text-zinc-500">{c.id.slice(0, 8)}…</span>
                <span className="font-medium text-emerald-400 tabular-nums">
                  +₹{Number(c.payout_amount_inr).toLocaleString()}
                </span>
                <span className="text-zinc-500">
                  {new Date(c.created_at).toLocaleDateString('en-IN')}
                </span>
                {c.is_flagged && (
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                    Flagged
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-zinc-500 text-sm">No claims</p>
        )}
      </Card>

      {hasCoords && (
        <div>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Delivery Zone Map
          </p>
          <ZoneMap
            centerLat={profile.zone_latitude!}
            centerLng={profile.zone_longitude!}
            radiusKm={15}
            zoneName={geocodedAddress ?? zoneData?.zone_name ?? 'Delivery Zone'}
            className="h-72"
          />
        </div>
      )}
    </div>
  );
}
