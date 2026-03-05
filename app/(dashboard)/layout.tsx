import { Avatar } from '@/components/ui/Avatar';
import { isAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
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
    <div className="min-h-screen bg-[#0f0f0f]">
      <header className="sticky top-0 z-10 border-b border-[#2d2d2d] bg-[#0f0f0f]/95 backdrop-blur-xl">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-white tracking-tight"
          >
            <span className="text-[#7dd3fc]">Oasis</span>
          </Link>
          <div className="flex items-center gap-3">
            {showAdminLink && (
              <>
                <Link
                  href="/admin"
                  className="hidden sm:flex items-center gap-1.5 text-xs text-[#666666] hover:text-[#7dd3fc] transition-colors"
                >
                  Admin
                </Link>
                <div className="w-px h-4 bg-[#2d2d2d] hidden sm:block" />
              </>
            )}
            <Avatar seed={user.id} size={28} className="ring-1 ring-[#2d2d2d]" />
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs text-[#666666] hover:text-white transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-xl mx-auto px-4 py-6 pb-24">{children}</main>
    </div>
  );
}
