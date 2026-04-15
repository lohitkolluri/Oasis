import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
      <div className="w-full max-w-sm text-center">
        <Logo size={48} className="mx-auto mb-5 opacity-40" />
        <h1 className="text-5xl font-bold text-zinc-200 mb-2 tabular-nums">404</h1>
        <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
          This page doesn&apos;t exist. It may have been moved or the URL is incorrect.
        </p>
        <ButtonLink href="/" variant="outline">
          Back to home
        </ButtonLink>
      </div>
    </main>
  );
}
