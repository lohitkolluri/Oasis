'use client';

import { Avatar } from '@/components/ui/Avatar';
import type { PlatformType } from '@/lib/types/database';
import { cn } from '@/lib/utils';
import {
  BadgeCheck,
  ChevronRight,
  CircleHelp,
  FileText,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

export interface ProfileSettingsInitial {
  full_name: string | null;
  phone_number: string | null;
  platform: PlatformType | null;
  primary_zone_geofence: Record<string, unknown> | null;
  government_id_verified?: boolean | null;
  face_verified?: boolean | null;
  auto_renew_enabled?: boolean | null;
}

function zoneDisplayName(geofence: Record<string, unknown> | null): string | null {
  if (!geofence || typeof geofence !== 'object') return null;
  const z = geofence.zone_name;
  return typeof z === 'string' && z.trim() ? z.trim() : null;
}

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="px-1">
        <h2 className="text-[13px] font-semibold text-zinc-200 tracking-tight">{title}</h2>
        {description ? (
          <p className="text-[12px] text-zinc-600 mt-0.5 leading-relaxed max-w-md">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Grouped list container (iOS-style inset group). */
function Group({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function StatusPill({ ok, title }: { ok: boolean; title: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        ok
          ? 'border-uber-green/25 bg-uber-green/10 text-uber-green'
          : 'border-white/10 bg-zinc-900/80 text-zinc-500',
      )}
    >
      <span className="text-zinc-400">{title}</span>
      <span className={ok ? 'text-uber-green' : 'text-zinc-600'}>
        {ok ? 'Verified' : 'Pending'}
      </span>
    </span>
  );
}

export function ProfileSettingsForm({
  initial,
  email,
  userId,
}: {
  initial: ProfileSettingsInitial;
  email: string | null;
  userId: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.full_name ?? '');
  const [phone, setPhone] = useState(initial.phone_number ?? '');
  const [platform, setPlatform] = useState<PlatformType | null>(initial.platform);
  const [saving, setSaving] = useState(false);

  const displayName = fullName.trim() || 'Rider';

  const dirty =
    fullName !== (initial.full_name ?? '') ||
    phone !== (initial.phone_number ?? '') ||
    platform !== initial.platform;

  const onSave = useCallback(async () => {
    if (!dirty) return;
    const trimmedName = fullName.trim();
    if (trimmedName.length < 1) {
      toast.error('Please enter your name');
      return;
    }
    setSaving(true);
    try {
      const payload: {
        full_name?: string;
        phone_number?: string | null;
        platform?: PlatformType;
      } = {};
      if (fullName !== (initial.full_name ?? '')) payload.full_name = trimmedName;
      if (phone !== (initial.phone_number ?? '')) payload.phone_number = phone.trim() || null;
      if (platform !== initial.platform && platform) payload.platform = platform;

      const res = await fetch('/api/rider/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Could not save');
        return;
      }
      toast.success('Profile updated');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }, [dirty, fullName, phone, platform, initial, router]);

  const zoneLabel = zoneDisplayName(initial.primary_zone_geofence);

  return (
    <div className="space-y-8">
      {/* Identity hero — focal point; hierarchy: avatar → name → email */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-black px-5 py-6 sm:px-6">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-uber-green/[0.07] blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:gap-5">
          <div className="relative shrink-0">
            <div
              className="absolute inset-0 scale-110 rounded-full bg-uber-green/25 blur-2xl opacity-60"
              aria-hidden
            />
            <Avatar
              seed={userId}
              size={88}
              className="relative ring-2 ring-white/15 ring-offset-4 ring-offset-black"
            />
          </div>
          <div className="mt-5 min-w-0 flex-1 sm:mt-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-1">
              Your profile
            </p>
            <h2 className="text-[22px] font-bold text-white tracking-tight truncate">
              {displayName}
            </h2>
            <p className="text-[14px] text-zinc-500 mt-1 truncate" title={email ?? undefined}>
              {email ?? 'No email on file'}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {platform ? (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold capitalize text-zinc-300">
                  {platform}
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-[11px] text-zinc-500">
                  Platform not set
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-600 mt-2 max-w-sm mx-auto sm:mx-0">
              Sign-in email is managed by your account provider and cannot be edited here.
            </p>
          </div>
        </div>
      </div>

      {/* Editable fields — one visual group, primary action */}
      <Section
        title="Contact & platform"
        description="Used for payouts and zone matching. Save when you change something."
      >
        <Group>
          <div className="px-4 pt-4 pb-1 space-y-4">
            <div>
              <label
                htmlFor="profile-full-name"
                className="text-[11px] font-medium text-zinc-500 block mb-2"
              >
                Full name
              </label>
              <input
                id="profile-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-uber-green/30 focus:border-uber-green/30 min-h-[48px] transition-shadow"
                placeholder="Name as on ID"
              />
            </div>
            <div>
              <label
                htmlFor="profile-phone"
                className="text-[11px] font-medium text-zinc-500 block mb-2"
              >
                Phone
              </label>
              <input
                id="profile-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[15px] text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-uber-green/30 focus:border-uber-green/30 min-h-[48px] transition-shadow"
                placeholder="+91"
              />
            </div>
            <div className="pb-2">
              <span className="text-[11px] font-medium text-zinc-500 block mb-2">
                Delivery platform
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(['zepto', 'blinkit'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={cn(
                      'rounded-xl border px-4 py-3 text-[14px] font-semibold capitalize min-h-[48px] transition-all',
                      platform === p
                        ? 'border-uber-green/45 bg-uber-green/12 text-uber-green shadow-[0_0_0_1px_rgba(58,167,109,0.2)]'
                        : 'border-white/10 bg-white/[0.02] text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06] p-3 bg-black/20">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={onSave}
              className="w-full rounded-xl bg-uber-green text-black font-semibold text-[15px] py-3.5 min-h-[52px] disabled:opacity-35 disabled:pointer-events-none flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              Save changes
            </button>
          </div>
        </Group>
      </Section>

      {/* Read-only account status — scannable rows */}
      <Section title="Account status" description="Managed during onboarding or from Policy.">
        <Group>
          <div className="divide-y divide-white/[0.06]">
            <div className="flex items-start gap-3 px-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] font-medium text-zinc-200">Primary zone</p>
                <p className="text-[13px] text-zinc-500 mt-1 leading-snug">
                  {zoneLabel ?? 'Not set'}
                </p>
                <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed">
                  Changes via{' '}
                  <a
                    href="mailto:lohitkolluri@gmail.com"
                    className="text-uber-green hover:underline"
                  >
                    support
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 px-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-uber-green/10 text-uber-green">
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                <p className="text-[13px] font-medium text-zinc-200">Verification</p>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill ok={!!initial.government_id_verified} title="Gov ID" />
                  <StatusPill ok={!!initial.face_verified} title="Face check" />
                </div>
                <p className="text-[11px] text-zinc-600">
                  {initial.government_id_verified && initial.face_verified
                    ? 'You are fully verified.'
                    : 'Complete onboarding if anything is missing.'}
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/policy"
              className="flex items-center gap-3 px-4 py-4 min-h-[56px] hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-zinc-200">Weekly renewal</p>
                <p className="text-[12px] text-zinc-500 mt-0.5">
                  {initial.auto_renew_enabled ? 'Auto-renew is on' : 'Auto-renew is off'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-600 shrink-0" />
            </Link>
          </div>
        </Group>
      </Section>

      {/* Navigation rows — chevrons, single group */}
      <Section title="Help & legal" description="Documents and coverage overview.">
        <Group>
          <Link
            href="/dashboard/policy/docs"
            className="flex items-center gap-3 px-4 py-4 min-h-[56px] border-b border-white/[0.06] hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
          >
            <FileText className="h-5 w-5 text-zinc-500 shrink-0" />
            <span className="flex-1 text-[15px] font-medium text-zinc-200">Policy wording</span>
            <ChevronRight className="h-5 w-5 text-zinc-600 shrink-0" />
          </Link>
          <Link
            href="/policy-summary"
            className="flex items-center gap-3 px-4 py-4 min-h-[56px] border-b border-white/[0.06] hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
          >
            <BadgeCheck className="h-5 w-5 text-zinc-500 shrink-0" />
            <span className="flex-1 text-[15px] font-medium text-zinc-200">Coverage summary</span>
            <ChevronRight className="h-5 w-5 text-zinc-600 shrink-0" />
          </Link>
          <a
            href="mailto:lohitkolluri@gmail.com"
            className="flex items-center gap-3 px-4 py-4 min-h-[56px] hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
          >
            <CircleHelp className="h-5 w-5 text-zinc-500 shrink-0" />
            <span className="flex-1 text-[15px] font-medium text-zinc-200">Contact support</span>
            <ChevronRight className="h-5 w-5 text-zinc-600 shrink-0" />
          </a>
        </Group>
      </Section>

      {/* Destructive — separated, visual weight distinct */}
      <form action="/api/auth/signout" method="post" className="pt-1">
        <button
          type="submit"
          className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/[0.06] py-4 text-[14px] font-semibold text-red-400/95 hover:bg-red-500/10 hover:text-red-300 min-h-[52px] transition-colors"
        >
          <LogOut className="h-4 w-4 opacity-80 group-hover:opacity-100" />
          Sign out
        </button>
      </form>
    </div>
  );
}
