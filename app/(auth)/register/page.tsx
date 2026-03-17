import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RegisterClient } from './RegisterClient';

export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return <RegisterClient />;
}
