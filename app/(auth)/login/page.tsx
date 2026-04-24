import { hasSupabaseAuthCookie } from '@/lib/supabase/auth-cookies';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LoginClient } from './LoginClient';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const hasAuthCookie = hasSupabaseAuthCookie(cookieStore);
  const session = hasAuthCookie ? (await (await createClient()).auth.getSession()).data.session : null;

  if (session) {
    redirect('/dashboard');
  }

  return <LoginClient />;
}
