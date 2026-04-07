import { AdminShell } from '@/components/admin/AdminShell';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/utils/auth';
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
    <AdminShell
      userName={(user.user_metadata as any)?.full_name ?? user.email ?? 'Oasis Admin'}
      userEmail={user.email ?? null}
      role={profile?.role}
    >
      {children}
    </AdminShell>
  );
}
