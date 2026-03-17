'use client';

import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { createClient } from '@/lib/supabase/client';
import { gooeyToast } from 'goey-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function RegisterClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const router = useRouter();
  const supabase = createClient();

  // Fallback for PWA edge-cases: avoid flashing signup if the session is restored client-side.
  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        if (session) window.location.replace('/dashboard');
        else setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setLoading(false);

    if (error) {
      gooeyToast.error(error.message);
      return;
    }

    router.push('/login?registered=1');
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <Logo size={80} />
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-12 rounded-lg bg-zinc-800" />
            <div className="h-12 rounded-lg bg-zinc-800" />
            <div className="h-12 rounded-lg bg-zinc-800" />
            <div className="h-11 rounded-lg bg-zinc-800" />
          </div>
        </div>
      </main>
    );
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
        <h1 className="text-xl font-semibold mb-6 text-center">Get started</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm text-zinc-400 mb-1">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-uber-green"
              placeholder="Rahul Kumar"
            />
          </div>
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
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-uber-green"
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
              minLength={6}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-uber-green"
              placeholder="Min 6 characters"
            />
          </div>
          <Button type="submit" disabled={loading} size="lg" fullWidth>
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-6 text-sm text-zinc-400 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-uber-green hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

