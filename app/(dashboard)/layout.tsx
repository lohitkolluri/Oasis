import { BottomNav } from '@/components/rider/BottomNav';
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
    <div className="min-h-screen bg-[#0b0e14]">
      {/* M3 Top App Bar */}
      <header className="sticky top-0 z-10 bg-[#0b0e14]/95 backdrop-blur-2xl">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-[15px] font-semibold text-white tracking-tight">Oasis</span>
          </Link>
          <div className="flex items-center gap-3">
            {showAdminLink && (
              <Link
                href="/admin"
                className="flex text-[11px] font-medium text-[#606880] hover:text-emerald-400 transition-colors px-3 py-1.5 rounded-full border border-[#1e2535] hover:border-emerald-500/30"
              >
                Admin
              </Link>
            )}
            <Avatar seed={user.id} size={30} className="ring-1 ring-[#1e2535]" />
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-[11px] font-medium text-[#606880] hover:text-white transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        {/* Hair-line divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#1e2535]/80 to-transparent" />
      </header>
      <main className="max-w-xl mx-auto px-4 py-5 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
