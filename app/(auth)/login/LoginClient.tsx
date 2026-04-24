'use client';

import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { createClient } from '@/lib/supabase/client';
import { gooeyToast } from 'goey-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  // Fallback for PWA edge-cases: if cookies were restored on the client, redirect without flashing the form.
  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getSession()
      .then((res) => {
        if (cancelled) return;
        if (res?.data?.session) window.location.replace('/dashboard');
        else setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const registered = searchParams.get('registered');
    if (registered !== '1') return;
    const key = 'oasis_registered_toast';
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
    gooeyToast.success('Account created! Check your email to confirm, then sign in.');
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const unverified = /email not confirmed|email.*confirm/i.test(error.message);
      setShowResend(unverified);
      gooeyToast.error(error.message);
      setLoading(false);
      return;
    }

    gooeyToast.success('Signed in successfully!');
    window.location.href = '/dashboard';
  }

  async function handleResendVerification() {
    if (!email) {
      gooeyToast.error('Enter your email first to resend verification.');
      return;
    }
    setResendLoading(true);
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
      },
    });
    setResendLoading(false);
    if (error) {
      gooeyToast.error(error.message);
      return;
    }
    gooeyToast.success('Verification email sent. Open it to complete sign-in.');
  }

  if (checkingSession) {
    return <LoginFallback />;
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
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-uber-green"
            />
          </div>
          <Button type="submit" disabled={loading} fullWidth size="lg">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          {showResend ? (
            <Button
              type="button"
              variant="secondary"
              disabled={resendLoading}
              onClick={handleResendVerification}
              fullWidth
              size="lg"
            >
              {resendLoading ? 'Sending verification…' : 'Resend verification email'}
            </Button>
          ) : null}
        </form>
        <p className="mt-6 text-sm text-zinc-400 text-center">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-uber-green hover:underline">
            Get started
          </Link>
        </p>
      </div>
    </main>
  );
}

function LoginFallback() {
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
        <div className="animate-pulse space-y-4">
          <div className="h-12 rounded-lg bg-zinc-800" />
          <div className="h-12 rounded-lg bg-zinc-800" />
          <div className="h-11 rounded-lg bg-zinc-800" />
        </div>
        <p className="mt-6 text-sm text-zinc-400 text-center">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-uber-green hover:underline">
            Get started
          </Link>
        </p>
      </div>
    </main>
  );
}

export function LoginClient() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
