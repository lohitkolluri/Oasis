import { BottomNav } from '@/components/rider/BottomNav';
import { RealtimeNotifications } from '@/components/rider/RealtimeNotifications';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { RiderToaster } from '@/components/ui/RiderToaster';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/utils/auth';
import { HelpCircle } from 'lucide-react';
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
    .select('id, platform, full_name, role')
    .eq('id', user.id)
    .single();

  if (!profile?.platform) {
    redirect('/onboarding');
  }

  const showAdminLink = isAdmin(user, profile);

  return (
    <div className="min-h-[100dvh] bg-black">
      <RiderToaster />
      <RealtimeNotifications profileId={user.id} />
      {/* Top App Bar — Uber black, safe-area aware */}
      <header className="sticky top-0 z-10 bg-black/95 backdrop-blur-2xl safe-area-top will-change-transform">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 active:opacity-70 transition-opacity">
            <Logo size={30} />
            <span className="text-[15px] font-semibold text-white tracking-tight">Oasis</span>
          </Link>
          <div className="flex items-center gap-3">
            {showAdminLink && (
              <Link
                href="/admin"
                className="flex text-[11px] font-medium text-zinc-500 hover:text-uber-green active:text-uber-green transition-colors px-3 py-1.5 rounded-full border border-white/10 hover:border-uber-green/30 min-h-[36px] items-center"
              >
                Admin
              </Link>
            )}
            <a
              href="mailto:support@oasisprotocol.in"
              className="flex items-center justify-center w-9 h-9 rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5 active:bg-white/10 transition-colors"
              aria-label="Help & support"
            >
              <HelpCircle className="h-[18px] w-[18px]" />
            </a>
            <Link
              href="/dashboard/profile"
              className="rounded-full shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uber-green/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Profile and settings"
            >
              <Avatar seed={user.id} size={32} className="ring-1 ring-white/10" />
            </Link>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-[11px] font-medium text-zinc-500 hover:text-white active:text-white transition-colors min-h-[36px] px-1"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </header>
      <main className="max-w-xl mx-auto px-4 pt-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
