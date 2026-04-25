import { PwaBackgroundSync } from '@/components/pwa/PwaBackgroundSync';
import { RiderAppBadgeSync } from '@/components/pwa/RiderAppBadgeSync';
import { BottomNav } from '@/components/rider/BottomNav';
import { RealtimeNotifications } from '@/components/rider/RealtimeNotifications';
import { RiderI18nProvider } from '@/components/rider/RiderI18nProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { RiderToaster } from '@/components/ui/RiderToaster';
import { DEFAULT_RIDER_LOCALE, getRiderMessages, normalizeRiderLocale } from '@/lib/i18n/rider';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/utils/auth';
import { HelpCircle } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, platform, full_name, role, government_id_verified, face_verified, deprovisioned_at, preferred_language',
    )
    .eq('id', user.id)
    .single();

  if ((profile as { deprovisioned_at?: string | null } | null)?.deprovisioned_at) {
    redirect('/login?deprovisioned=1');
  }

  if (!profile?.platform || !profile.government_id_verified || !profile.face_verified) {
    redirect('/onboarding');
  }

  const showAdminLink = isAdmin(user, profile);
  const cookieLocale = (await cookies()).get('oasis_rider_locale')?.value;
  const riderLocale = normalizeRiderLocale(
    (profile as { preferred_language?: string | null } | null)?.preferred_language ??
      cookieLocale ??
      DEFAULT_RIDER_LOCALE,
  );
  const messages = getRiderMessages(riderLocale);

  return (
    <RiderI18nProvider locale={riderLocale}>
      <div className="min-h-[100dvh] bg-black">
        <RiderToaster />
        <RiderAppBadgeSync profileId={user.id} />
        <PwaBackgroundSync />
        <RealtimeNotifications profileId={user.id} />
        {/* Top App Bar — Uber black, safe-area aware */}
        <header className="sticky top-0 z-10 bg-black/95 backdrop-blur-2xl safe-area-top will-change-transform">
          <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 active:opacity-70 transition-opacity"
            >
              <Logo size={30} />
              <span className="text-[15px] font-semibold text-white tracking-tight">Oasis</span>
            </Link>
            <div className="flex items-center gap-3">
              {showAdminLink && (
                <Link
                  href="/admin"
                  className="flex text-[11px] font-medium text-zinc-500 hover:text-uber-green active:text-uber-green transition-colors px-3 py-1.5 rounded-full border border-white/10 hover:border-uber-green/30 min-h-[36px] items-center"
                >
                  {messages.common.admin}
                </Link>
              )}
              <a
                href="mailto:lohitkolluri@gmail.com"
                className="flex items-center justify-center w-9 h-9 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5 active:bg-white/10 transition-colors"
                aria-label={messages.common.helpSupport}
              >
                <HelpCircle className="h-[18px] w-[18px]" />
              </a>
              <Link
                href="/dashboard/profile"
                className="rounded-full shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uber-green/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                aria-label={messages.common.profileSettings}
              >
                <Avatar seed={user.id} size={32} className="ring-1 ring-white/10" />
              </Link>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-[11px] font-medium text-zinc-500 hover:text-white active:text-white transition-colors min-h-[36px] px-1"
                >
                  {messages.common.signOut}
                </button>
              </form>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </header>
        <main className="max-w-xl mx-auto px-4 pt-4 pb-24">{children}</main>
        <BottomNav />
      </div>
    </RiderI18nProvider>
  );
}
