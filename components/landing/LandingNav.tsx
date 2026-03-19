import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export function LandingNav() {
  return (
    <div className="fixed top-6 inset-x-0 z-50 flex justify-center px-4 md:px-6 pointer-events-none reveal-in-up" style={{ ['--d' as any]: '20ms' }}>
      <header className="pointer-events-auto flex w-full max-w-5xl items-center justify-between rounded-full border border-white/10 bg-black/40 px-4 py-3 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-1 ring-white/5 transition-all hover:bg-black/60 hover:border-white/20">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80 active:opacity-60">
          <Logo size={24} priority />
          <span className="text-[14px] font-bold tracking-tight text-white">Oasis</span>
        </Link>

        <div className="flex items-center gap-3">
          <ButtonLink
            href="/login"
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex rounded-full border-transparent text-white/70 hover:text-white hover:bg-white/5 transition-colors px-4"
          >
            Sign in
          </ButtonLink>
          <ButtonLink
            href="/register"
            variant="landingPrimary"
            size="sm"
            className="rounded-full bg-white text-black font-semibold hover:scale-105 active:scale-95 transition-all duration-300 px-5"
          >
            Get started
          </ButtonLink>
        </div>
      </header>
    </div>
  );
}

