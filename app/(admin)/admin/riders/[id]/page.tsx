import { AdminRiderActions } from '@/components/admin/AdminRiderActions';
import { AdminRiderGovIdCard } from '@/components/admin/AdminRiderGovIdCard';
import { ClaimReviewButtons } from '@/components/admin/ClaimReviewButtons';
import { RoleSelector } from '@/components/admin/RoleSelector';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/badge';
import { CopyableId } from '@/components/ui/CopyableId';
import { PlatformLogo } from '@/components/ui/PlatformLogo';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ZoneMapLazy } from '@/components/ui/ZoneMapLazy';
import { isEarnedPremiumStatus } from '@/lib/config/constants';
import { createAdminClient } from '@/lib/supabase/admin';
import { reverseGeocode } from '@/lib/utils/geo';
import {
  ArrowLeft,
  FileCheck,
  Globe,
  Inbox,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react';
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

  const [policiesRes, plansRes] = await Promise.all([
    supabase
      .from('weekly_policies')
      .select(
        `id, plan_id, week_start_date, week_end_date, weekly_premium_inr, is_active, payment_status, created_at, plan_packages(name, slug, payout_per_claim_inr)`,
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
    return new Date(b.week_start_date).getTime() - new Date(a.week_start_date).getTime();
  });

  const displayName = profile.full_name ?? 'Unnamed rider';

  const activePolicies = sortedPolicies.filter((p) => p.is_active);
  const modeledPremium = activePolicies.reduce((s, p) => {
    if (!isEarnedPremiumStatus((p as { payment_status?: string | null }).payment_status)) {
      return s;
    }
    return s + Number(p.weekly_premium_inr);
  }, 0);
  const paidClaims = claims.filter((c) => c.status === 'paid');
  const flaggedClaims = claims.filter((c) => c.is_flagged);
  const paidPayoutTotal = paidClaims.reduce((s, c) => s + Number(c.payout_amount_inr), 0);

  const currentPolicy = activePolicies[0] ?? null;
  const currentPlan = currentPolicy?.plan_packages as { name?: string | null } | null | undefined;

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold';
      case 'pending':
        return 'rounded-full border-amber-500/25 bg-amber-500/10 text-amber-400 text-[10px] font-semibold';
      case 'rejected':
        return 'rounded-full border-red-500/25 bg-red-500/10 text-red-400 text-[10px] font-semibold';
      default:
        return 'rounded-full border-zinc-700 bg-zinc-800 text-zinc-500 text-[10px]';
    }
  };

  const joinedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ─── Breadcrumb ─── */}
      <Link
        href="/admin/riders"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors duration-150 -mb-2"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Riders
      </Link>

      {/* ─── Entity Header ─── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <Avatar seed={displayName} size={48} className="mt-0.5" />
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-semibold text-white tracking-tight truncate">
                  {displayName}
                </h1>
                {(profile as { role?: string }).role === 'admin' && (
                  <Badge className="rounded-full border-sky-400/25 bg-sky-400/10 text-sky-400 text-[10px] font-semibold">
                    Admin
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2.5 text-[13px] text-zinc-400 flex-wrap">
                <CopyableId value={profile.id} prefix="" length={12} label="Copy rider ID" />
                <Separator orientation="vertical" className="h-3.5 bg-zinc-700" />
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                  {geocodedAddress ?? zoneData?.zone_name ?? 'No zone configured'}
                </span>
                {joinedDate && (
                  <>
                    <Separator orientation="vertical" className="h-3.5 bg-zinc-700" />
                    <span className="text-zinc-500">Joined {joinedDate}</span>
                  </>
                )}
              </div>

              {/* Status badges row */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <PlatformLogo platform={profile.platform} size={18} showName />
                {governmentIdVerified && (
                  <Badge
                    variant="secondary"
                    className="rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold gap-1"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    KYC Verified
                  </Badge>
                )}
                {currentPolicy && (
                  <Badge
                    variant="secondary"
                    className="rounded-full border-zinc-700 bg-zinc-800 text-zinc-300 text-[10px] font-medium gap-1"
                  >
                    <Shield className="h-3 w-3" />
                    {currentPlan?.name ?? 'Active Policy'} · ₹
                    {Number(currentPolicy.weekly_premium_inr).toLocaleString('en-IN')}/wk
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 md:pt-1">
            <AdminRiderActions riderId={id} policies={policies} plans={plans} />
          </div>
        </div>
      </div>

      {/* ─── Metrics Row ─── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-1 h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-zinc-400 font-medium">Active Policies</span>
            <Shield className="h-4 w-4 text-zinc-600" />
          </div>
          <p className="text-3xl font-bold text-white tabular-nums tracking-tight">
            {activePolicies.length}
          </p>
          <p className="text-[11px] text-zinc-600">Current weekly coverage</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-1 h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-zinc-400 font-medium">Weekly Premium</span>
            <Wallet className="h-4 w-4 text-zinc-600" />
          </div>
          <p className="text-3xl font-bold text-white tabular-nums tracking-tight">
            ₹{modeledPremium.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-zinc-600">Sum of active premiums</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-1 h-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-zinc-400 font-medium">Lifetime Payout</span>
            <TrendingUp className="h-4 w-4 text-zinc-600" />
          </div>
          <p className="text-3xl font-bold text-white tabular-nums tracking-tight">
            ₹{paidPayoutTotal.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-zinc-600">
            {paidClaims.length} paid
            {flaggedClaims.length > 0 && ` · ${flaggedClaims.length} flagged`}
          </p>
        </div>
      </div>

      {/* ─── Main Content Grid ─── */}
      <div className="grid grid-cols-[1fr_380px] gap-6">
        {/* Left Column — Primary Content */}
        <div className="space-y-6 min-w-0">
          {/* Recent Claims */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden h-[380px] flex flex-col">
            <div className="border-b border-zinc-800 px-5 py-3.5 flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-white">Recent Claims</h2>
              <span className="ml-auto text-[11px] text-zinc-600 tabular-nums font-medium">
                {claims.length} {claims.length === 1 ? 'claim' : 'claims'}
              </span>
            </div>
            {claims?.length ? (
              <div className="overflow-y-auto flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-10">
                    <TableRow className="hover:bg-transparent border-zinc-800">
                      <TableHead className="w-[110px] text-zinc-500 text-[11px] font-medium uppercase tracking-wide">
                        Claim ID
                      </TableHead>
                      <TableHead className="w-[90px] text-right text-zinc-500 text-[11px] font-medium uppercase tracking-wide">
                        Amount
                      </TableHead>
                      <TableHead className="w-[100px] text-zinc-500 text-[11px] font-medium uppercase tracking-wide">
                        Date
                      </TableHead>
                      <TableHead className="w-[130px] text-zinc-500 text-[11px] font-medium uppercase tracking-wide">
                        Status
                      </TableHead>
                      <TableHead className="w-[140px] text-right text-zinc-500 text-[11px] font-medium uppercase tracking-wide">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((c) => {
                      const reviewStatus = (c as { admin_review_status?: string | null })
                        .admin_review_status;
                      return (
                        <TableRow
                          key={c.id}
                          className="border-zinc-800/60 hover:bg-white/[0.02] transition-colors duration-150"
                        >
                          <TableCell className="py-3">
                            <CopyableId value={c.id} prefix="" length={8} label="Copy claim ID" />
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-emerald-400 py-3">
                            +₹{Number(c.payout_amount_inr).toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-[13px] text-zinc-400 tabular-nums py-3">
                            {formatDate(c.created_at)}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="secondary" className={statusBadgeClass(c.status)}>
                                {c.status}
                              </Badge>
                              {c.is_flagged && (
                                <Badge
                                  variant="secondary"
                                  className="rounded-full border-amber-500/25 bg-amber-500/10 text-amber-400 text-[10px] font-semibold"
                                >
                                  Flagged
                                </Badge>
                              )}
                              {reviewStatus && (
                                <Badge
                                  variant="secondary"
                                  className="rounded-full border-zinc-700 bg-zinc-800 text-zinc-500 text-[10px]"
                                >
                                  {reviewStatus}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <ClaimReviewButtons
                              claimId={c.id}
                              currentStatus={
                                reviewStatus === 'approved' || reviewStatus === 'rejected'
                                  ? reviewStatus
                                  : null
                              }
                              claimStatus={(c as { status?: string | null }).status ?? undefined}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <div className="w-12 h-12 rounded-full bg-zinc-800/60 flex items-center justify-center mb-3">
                  <Inbox className="h-5 w-5 text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-400">No claims yet</p>
                <p className="text-xs text-zinc-600 mt-1 max-w-[240px]">
                  Claims will appear here when rain events trigger automatic payouts.
                </p>
              </div>
            )}
          </div>

          {/* Policies */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden h-[196px] flex flex-col">
            <div className="border-b border-zinc-800 px-5 py-3.5 flex items-center gap-2">
              <Shield className="h-4 w-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-white">Policy History</h2>
              <span className="ml-auto text-[11px] text-zinc-600 tabular-nums font-medium">
                {sortedPolicies.length} {sortedPolicies.length === 1 ? 'policy' : 'policies'}
              </span>
            </div>
            {sortedPolicies.length ? (
              <div className="overflow-y-auto flex-1">
                <Table>
                  <TableHeader className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-10">
                    <TableRow className="hover:bg-transparent border-zinc-800">
                      <TableHead className="text-zinc-500 text-[11px] font-medium uppercase tracking-wide">
                        Plan
                      </TableHead>
                      <TableHead className="w-[180px] text-zinc-500 text-[11px] font-medium uppercase tracking-wide">
                        Period
                      </TableHead>
                      <TableHead className="w-[90px] text-right text-zinc-500 text-[11px] font-medium uppercase tracking-wide">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPolicies.map((p) => {
                      const plan = p.plan_packages as {
                        name?: string;
                        payout_per_claim_inr?: number;
                      } | null;
                      return (
                        <TableRow
                          key={p.id}
                          className="border-zinc-800/60 hover:bg-white/[0.02] transition-colors duration-150"
                        >
                          <TableCell className="py-3">
                            <span className="font-medium text-white">{plan?.name ?? 'Legacy'}</span>
                            <span className="text-zinc-500 ml-1.5 text-[13px]">
                              ₹{Number(p.weekly_premium_inr).toLocaleString('en-IN')}/wk
                            </span>
                          </TableCell>
                          <TableCell className="text-[13px] text-zinc-400 tabular-nums py-3">
                            {formatDate(p.week_start_date)} – {formatDate(p.week_end_date)}
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <Badge
                              variant="secondary"
                              className={
                                p.is_active
                                  ? 'rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold'
                                  : 'rounded-full border-zinc-700 bg-zinc-800 text-zinc-500 text-[10px] font-medium'
                              }
                            >
                              {p.is_active ? 'Active' : 'Expired'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <div className="w-12 h-12 rounded-full bg-zinc-800/60 flex items-center justify-center mb-3">
                  <Shield className="h-5 w-5 text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-400">No policies</p>
                <p className="text-xs text-zinc-600 mt-1">Rider has no policy history yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Metadata */}
        <div className="space-y-6">
          {/* Rider Profile */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden h-[380px]">
            <div className="border-b border-zinc-800 px-5 py-3.5 flex items-center gap-2">
              <User className="h-4 w-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-white">Rider Profile</h2>
            </div>
            <div className="p-5 space-y-5">
              <dl className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <dt className="text-[12px] text-zinc-500">Full name</dt>
                  <dd className="text-[13px] text-zinc-200 font-medium text-right truncate max-w-[180px]">
                    {profile.full_name ?? '—'}
                  </dd>
                </div>
                <Separator className="bg-zinc-800/60" />
                <div className="flex items-center justify-between">
                  <dt className="text-[12px] text-zinc-500">Phone</dt>
                  <dd className="text-[13px] text-zinc-200 font-medium flex items-center gap-1.5">
                    {profile.phone_number ? (
                      <>
                        <Phone className="h-3 w-3 text-zinc-500" />
                        {profile.phone_number}
                      </>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </dd>
                </div>
                <Separator className="bg-zinc-800/60" />
                <div className="flex items-center justify-between">
                  <dt className="text-[12px] text-zinc-500">Platform</dt>
                  <dd className="text-[13px] text-zinc-200">
                    <PlatformLogo platform={profile.platform} size={18} showName />
                  </dd>
                </div>
                <Separator className="bg-zinc-800/60" />
                <div className="flex items-center justify-between">
                  <dt className="text-[12px] text-zinc-500">Zone</dt>
                  <dd className="text-[13px] text-zinc-200 flex items-center gap-1.5 truncate max-w-[180px]">
                    <MapPin className="h-3 w-3 text-zinc-500 shrink-0" />
                    {zoneData?.zone_name ?? '—'}
                  </dd>
                </div>
                {geocodedAddress && (
                  <>
                    <Separator className="bg-zinc-800/60" />
                    <div className="flex items-start justify-between">
                      <dt className="text-[12px] text-zinc-500">Locality</dt>
                      <dd className="text-[13px] text-zinc-300 text-right max-w-[200px] leading-snug">
                        {geocodedAddress}
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              {/* Role selector */}
              <div className="pt-2 border-t border-zinc-800/60">
                <RoleSelector
                  profileId={id}
                  currentRole={(profile as { role?: string }).role === 'admin' ? 'admin' : 'rider'}
                />
              </div>
            </div>
          </div>

          {/* KYC Verification */}
          <div className="h-[196px]">
            <AdminRiderGovIdCard
              riderId={id}
              riderName={displayName}
              hasGovId={!!govIdPath && typeof govIdPath === 'string'}
              imageUrl={governmentIdImageUrl}
              governmentIdVerified={governmentIdVerified}
            />
          </div>
        </div>
      </div>

      {/* ─── Full Width Section ─── */}
      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <div className="border-b border-zinc-800 px-5 py-3.5 flex items-center gap-2">
            <Globe className="h-4 w-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-white">Delivery Zone</h2>
          </div>
          {hasCoords ? (
            <div className="p-5 flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-[340px] shrink-0">
                <dl className="space-y-3">
                  <div>
                    <dt className="text-[12px] text-zinc-500 mb-1">Zone</dt>
                    <dd className="text-[13px] text-zinc-200">
                      {geocodedAddress ?? zoneData?.zone_name ?? 'Delivery Zone'}
                    </dd>
                  </div>
                  <Separator className="bg-zinc-800/60" />
                  <div className="flex items-center justify-between">
                    <dt className="text-[12px] text-zinc-500">Radius</dt>
                    <dd className="text-[13px] text-zinc-200">15 km</dd>
                  </div>
                  <Separator className="bg-zinc-800/60" />
                  <div>
                    <dt className="text-[12px] text-zinc-500 mb-1">Coordinates</dt>
                    <dd className="text-[13px] text-zinc-400 font-mono tabular-nums">
                      {profile.zone_latitude!.toFixed(4)}, {profile.zone_longitude!.toFixed(4)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="flex-1 min-w-0">
                <ZoneMapLazy
                  centerLat={profile.zone_latitude!}
                  centerLng={profile.zone_longitude!}
                  radiusKm={15}
                  zoneName={geocodedAddress ?? zoneData?.zone_name ?? 'Delivery Zone'}
                  className="h-44 md:h-full min-h-[176px] w-full rounded-lg border border-zinc-800"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center px-5">
              <div className="w-10 h-10 rounded-full bg-zinc-800/60 flex items-center justify-center mb-2.5">
                <Globe className="h-4 w-4 text-zinc-600" />
              </div>
              <p className="text-sm font-medium text-zinc-400">No zone configured</p>
              <p className="text-xs text-zinc-600 mt-1">Location will appear after onboarding.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
