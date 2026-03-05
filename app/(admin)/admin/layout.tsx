import { AdminNav } from '@/components/admin/AdminNav';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { Logo } from '@/components/ui/Logo';
import { isAdmin } from '@/lib/utils/auth';
import { createClient } from '@/lib/supabase/server';
import { Smartphone } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!isAdmin(user, profile)) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-[260px] bg-[#161616] border-r border-[#2d2d2d] flex flex-col z-20 hidden md:flex">
        {/* Brand */}
        <div className="h-[64px] px-6 flex items-center shrink-0">
          <Link href="/admin" className="flex items-center gap-3 group">
            <Logo size={32} className="shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white leading-tight tracking-tight">Oasis</p>
              <p className="text-[10px] text-[#666666] leading-tight">Admin Console</p>
            </div>
          </Link>
        </div>

        <div className="h-px bg-[#2d2d2d] mx-4" />

        <AdminNav />

        <div className="h-px bg-[#2d2d2d] mx-4" />

        {/* Footer */}
        <div className="p-3 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#666666] hover:text-white hover:bg-[#1e1e1e] transition-all duration-150"
          >
            <Smartphone className="h-4 w-4 shrink-0" />
            Rider App
          </Link>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 md:ml-[260px] flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-10 h-[56px] border-b border-[#2d2d2d] bg-[#0f0f0f]/90 backdrop-blur-xl px-6 lg:px-8 flex items-center justify-between shrink-0">
          {/* Mobile brand */}
          <Link href="/admin" className="md:hidden flex items-center gap-2 text-sm font-semibold text-white">
            <Logo size={28} />
            Oasis Admin
          </Link>

          {/* Desktop search */}
          <div className="hidden md:flex items-center">
            <AdminSearch />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 ml-auto md:ml-0">
            {/* Status dot */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e1e1e] border border-[#2d2d2d]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7dd3fc] animate-neon-pulse" />
              <span className="text-[10px] text-[#666666] font-medium">Live</span>
            </div>

            {/* Rider app link */}
            <Link
              href="/dashboard"
              className="hidden md:flex items-center gap-1.5 text-xs text-[#666666] hover:text-white transition-colors"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Rider App
            </Link>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 lg:px-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
