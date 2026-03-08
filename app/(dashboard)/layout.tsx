import { BottomNav } from '@/components/rider/BottomNav';
import { RealtimeNotifications } from '@/components/rider/RealtimeNotifications';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/utils/auth';
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
    <div className="min-h-screen bg-black">
      <RealtimeNotifications profileId={user.id} />
      {/* Top App Bar — Uber black */}
      <header className="sticky top-0 z-10 bg-black/95 backdrop-blur-2xl">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-[15px] font-semibold text-white tracking-tight">Oasis</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {showAdminLink && (
              <Link
                href="/admin"
                className="flex text-[11px] font-medium text-zinc-500 hover:text-uber-green transition-colors px-3 py-1.5 rounded-full border border-white/10 hover:border-uber-green/30"
              >
                Admin
              </Link>
            )}
            <Avatar seed={user.id} size={30} className="ring-1 ring-white/10" />
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-[11px] font-medium text-zinc-500 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        {/* Hair-line divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </header>
      <main className="max-w-xl mx-auto px-4 py-5 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
