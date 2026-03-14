import { AdminRiderActions } from '@/components/admin/AdminRiderActions';
import { AdminRiderGovIdCard } from '@/components/admin/AdminRiderGovIdCard';
import { ClaimReviewButtons } from '@/components/admin/ClaimReviewButtons';
import { RoleSelector } from '@/components/admin/RoleSelector';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/Card';
import { CopyableId } from '@/components/ui/CopyableId';
import { PlatformLogo } from '@/components/ui/PlatformLogo';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createAdminClient } from '@/lib/supabase/admin';
import { reverseGeocode } from '@/lib/utils/geo';
import {
  FileCheck,
  Inbox,
  MapPin,
  Phone,
  Shield,
  User,
} from 'lucide-react';
import { ZoneMapLazy } from '@/components/ui/ZoneMapLazy';
import { notFound } from 'next/navigation';

export default async function AdminRiderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
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

  const hasCoords =
    profile.zone_latitude != null && profile.zone_longitude != null;
  const govIdPath = (profile as { government_id_url?: string | null })
    .government_id_url;
  const governmentIdVerified = (profile as { government_id_verified?: boolean | null })
    .government_id_verified;

  const [claimsRes, geocodedAddressRes] = await Promise.all([
    policyIds.length > 0
      ? supabase
          .from('parametric_claims')
          .select(
            'id, payout_amount_inr, status, is_flagged, flag_reason, created_at, admin_review_status',
          )
          .in('policy_id', policyIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    hasCoords
      ? reverseGeocode(profile.zone_latitude!, profile.zone_longitude!)
      : Promise.resolve(null),
  ]);

  const claims = claimsRes.data ?? [];
  const geocodedAddress = geocodedAddressRes;
  // Use image API so encrypted storage is decrypted on the server before display
  const governmentIdImageUrl =
    govIdPath && typeof govIdPath === 'string'
      ? `/api/admin/rider/${id}/government-id/image`
      : null;

  const zoneData = profile.primary_zone_geofence as {
    zone_name?: string;
    coordinates?: unknown;
  } | null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const sortedPolicies = [...policies].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return (
      new Date(b.week_start_date).getTime() -
      new Date(a.week_start_date).getTime()
    );
  });

  const displayName = profile.full_name ?? 'Unnamed rider';
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((s: string) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header: compact identity + actions */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-xl bg-[#1a1a1a] border border-[#2d2d2d] text-lg font-semibold text-[#7dd3fc] shrink-0"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-white tracking-tight truncate">
              {displayName}
            </h1>
            <p className="text-[13px] text-[#666] mt-0.5 flex items-center gap-2 flex-wrap">
              <PlatformLogo platform={profile.platform} size={18} showName />
              <span className="capitalize">{zoneData?.zone_name ?? 'No zone'}</span>
            </p>
            <div className="mt-1.5">
              <CopyableId value={profile.id} prefix="ID " label="Copy rider ID" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminRiderActions riderId={id} policies={policies} plans={plans} />
          <Card variant="outline" padding="md" className="border-[#2d2d2d] shrink-0">
            <RoleSelector
              profileId={id}
              currentRole={
                (profile as { role?: string }).role === 'admin' ? 'admin' : 'rider'
              }
            />
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile — compact key-value */}
        <Card variant="default" padding="lg" className="border-[#2d2d2d]">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-[#7dd3fc] shrink-0" />
            Profile
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-[11px] text-[#555] mb-0.5">Full name</dt>
              <dd className="text-[#e4e4e4] font-medium truncate">
                {profile.full_name ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-[#555] mb-0.5">Phone</dt>
              <dd className="text-[#e4e4e4] flex items-center gap-1.5 truncate">
                {profile.phone_number ? (
                  <>
                    <Phone className="h-3.5 w-3.5 text-[#555] shrink-0" />
                    {profile.phone_number}
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-[#555] mb-0.5">Platform</dt>
              <dd className="text-[#e4e4e4] flex items-center gap-2">
                <PlatformLogo platform={profile.platform} size={22} showName />
                <span className="capitalize truncate">{profile.platform ?? '—'}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-[#555] mb-0.5">Zone</dt>
              <dd className="text-[#e4e4e4] flex items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 text-[#555] shrink-0" />
                {zoneData?.zone_name ?? '—'}
              </dd>
            </div>
            {geocodedAddress && (
              <div className="col-span-2">
                <dt className="text-[11px] text-[#555] mb-0.5">Locality</dt>
                <dd className="text-[#e4e4e4] text-[13px] leading-snug">
                  {geocodedAddress}
                </dd>
              </div>
            )}
            <div className="col-span-2">
              <dt className="text-[11px] text-[#555] mb-0.5">Coords</dt>
              <dd className="text-[#9ca3af] font-mono text-xs">
                {hasCoords
                  ? `${profile.zone_latitude!.toFixed(4)}, ${profile.zone_longitude!.toFixed(4)}`
                  : '—'}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Government ID (KYC) — thumbnail, click to zoom */}
        <AdminRiderGovIdCard
          riderId={id}
          riderName={displayName}
          hasGovId={!!govIdPath && typeof govIdPath === 'string'}
          imageUrl={governmentIdImageUrl}
          governmentIdVerified={governmentIdVerified}
        />
      </div>

      {/* Policies */}
      <Card variant="default" padding="none" className="border-[#2d2d2d] overflow-hidden rounded-xl">
        <div className="border-b border-[#2d2d2d] px-5 py-3.5 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#7dd3fc] shrink-0" />
          <h2 className="text-sm font-semibold text-white">Policies</h2>
        </div>
        {sortedPolicies.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                <TableHead>Plan</TableHead>
                <TableHead className="w-[140px]">Period</TableHead>
                <TableHead className="w-[90px] text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPolicies.map((p) => {
                const plan = p.plan_packages as {
                  name?: string;
                  payout_per_claim_inr?: number;
                } | null;
                return (
                  <TableRow key={p.id} className="border-[#2d2d2d]">
                    <TableCell>
                      <span className="font-medium text-white">
                        {plan?.name ?? 'Legacy'} · ₹
                        {Number(p.weekly_premium_inr).toLocaleString()}/wk
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-[#9ca3af] tabular-nums">
                      {formatDate(p.week_start_date)} –{' '}
                      {formatDate(p.week_end_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className={
                          p.is_active
                            ? 'rounded-full border-[#22c55e]/25 bg-[#22c55e]/10 text-[#22c55e] text-[10px] font-semibold'
                            : 'rounded-full border-[#2d2d2d] bg-[#262626] text-[#555] text-[10px] font-medium'
                        }
                      >
                        {p.is_active ? 'Current' : 'Expired'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-10 w-10 text-[#3a3a3a] mb-3" />
            <p className="text-sm font-medium text-[#555]">No policies</p>
            <p className="text-xs text-[#444] mt-1">
              Rider has no policy history
            </p>
          </div>
        )}
      </Card>

      {/* Recent claims */}
      <Card variant="default" padding="none" className="border-[#2d2d2d] overflow-hidden rounded-xl">
        <div className="border-b border-[#2d2d2d] px-5 py-3.5 flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-[#7dd3fc] shrink-0" />
          <h2 className="text-sm font-semibold text-white">Recent claims</h2>
        </div>
        {claims?.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#2d2d2d]">
                <TableHead className="w-[100px]">Claim</TableHead>
                <TableHead className="w-[90px] text-right">Amount</TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((c) => {
                const reviewStatus = (c as { admin_review_status?: string | null })
                  .admin_review_status;
                return (
                  <TableRow key={c.id} className="border-[#2d2d2d]">
                    <TableCell>
                      <CopyableId value={c.id} prefix="" length={8} label="Copy claim ID" />
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-[#22c55e]">
                      +₹{Number(c.payout_amount_inr).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-[#9ca3af] tabular-nums">
                      {new Date(c.created_at).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          variant="secondary"
                          className={
                            c.status === 'paid'
                              ? 'rounded-full border-[#22c55e]/25 bg-[#22c55e]/10 text-[#22c55e] text-[10px] font-semibold'
                              : 'rounded-full border-[#2d2d2d] bg-[#262626] text-[#555] text-[10px]'
                          }
                        >
                          {c.status}
                        </Badge>
                        {c.is_flagged && (
                          <Badge
                            variant="secondary"
                            className="rounded-full border-[#f59e0b]/25 bg-[#f59e0b]/10 text-[#f59e0b] text-[10px] font-semibold"
                          >
                            Flagged
                          </Badge>
                        )}
                        {reviewStatus && (
                          <Badge
                            variant="secondary"
                            className="rounded-full border-[#2d2d2d] bg-[#262626] text-[#555] text-[10px]"
                          >
                            {reviewStatus}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <ClaimReviewButtons claimId={c.id} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-10 w-10 text-[#3a3a3a] mb-3" />
            <p className="text-sm font-medium text-[#555]">No claims yet</p>
            <p className="text-xs text-[#444] mt-1">
              Claims will appear here when payouts are made
            </p>
          </div>
        )}
      </Card>

      {/* Delivery zone */}
      {hasCoords && (
        <Card variant="default" padding="none" className="border-[#2d2d2d] overflow-hidden rounded-xl">
          <div className="border-b border-[#2d2d2d] px-5 py-3.5 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Delivery zone</h2>
            <p className="text-xs text-[#555] truncate">
              {geocodedAddress ?? zoneData?.zone_name ?? 'Delivery Zone'}
            </p>
          </div>
          <div className="p-4 pt-3">
            <ZoneMapLazy
              centerLat={profile.zone_latitude!}
              centerLng={profile.zone_longitude!}
              radiusKm={15}
              zoneName={
                geocodedAddress ?? zoneData?.zone_name ?? 'Delivery Zone'
              }
              className="h-64 w-full rounded-lg"
            />
            <p className="text-[11px] text-[#555] font-mono mt-2">
              {profile.zone_latitude!.toFixed(2)}, {profile.zone_longitude!.toFixed(2)} · 15 km radius
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
