'use client';

import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { createClient } from '@/lib/supabase/client';
import { gooeyToast } from 'goey-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const registered = searchParams.get('registered');
    if (registered === '1') {
      gooeyToast.success('Account created! Check your email to confirm, then sign in.');
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      gooeyToast.error(error.message);
      setLoading(false);
      return;
    }

    gooeyToast.success('Signed in successfully!');
    window.location.href = '/dashboard';
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-400 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <Logo size={24} />
          Oasis
        </Link>
        <div className="flex justify-center mb-6">
          <Logo size={80} />
        </div>
        <h1 className="text-xl font-semibold mb-6 text-center">Sign in</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-zinc-400 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-zinc-400 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <Button type="submit" disabled={loading} fullWidth size="lg">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-6 text-sm text-zinc-400 text-center">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-emerald-400 hover:underline">
            Get started
          </Link>
        </p>
      </div>
    </main>
  );
}
