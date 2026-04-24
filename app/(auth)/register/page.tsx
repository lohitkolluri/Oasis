import { hasSupabaseAuthCookie } from '@/lib/supabase/auth-cookies';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { RegisterClient } from './RegisterClient';

export default async function RegisterPage() {
  const cookieStore = await cookies();
  const hasAuthCookie = hasSupabaseAuthCookie(cookieStore);
  const session = hasAuthCookie ? (await (await createClient()).auth.getSession()).data.session : null;

  if (session) {
    redirect('/dashboard');
  }

  return <RegisterClient />;
}
