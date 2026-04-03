'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className="min-h-[60dvh] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <Logo size={48} className="mx-auto mb-5 opacity-40" />
        <h1 className="text-lg font-semibold text-zinc-200 mb-2">Something went wrong</h1>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/dashboard" variant="outline">Back to dashboard</ButtonLink>
        </div>
      </div>
    </div>
  );
}
