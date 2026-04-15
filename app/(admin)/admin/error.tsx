'use client';

import { Button, ButtonLink } from '@/components/ui/Button';
import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined' && error) {
      console.error('[Admin Error]', error);
    }
  }, [error]);

  return (
    <div className="min-h-[60dvh] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg
            className="h-6 w-6 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-zinc-200 mb-2">Admin panel error</h1>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/admin" variant="outline">
            Back to overview
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
