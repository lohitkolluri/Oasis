'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Auth Error]', error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <Logo size={64} className="mx-auto mb-6 opacity-50" />
        <h1 className="text-xl font-semibold text-zinc-200 mb-2">Something went wrong</h1>
        <p className="text-sm text-zinc-500 mb-6">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="outline">Back to home</ButtonLink>
        </div>
      </div>
    </main>
  );
}
