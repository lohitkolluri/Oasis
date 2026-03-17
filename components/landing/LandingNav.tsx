import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#2d2d2d] bg-[#0f0f0f]/85 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.55)]">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={28} priority />
          <span className="text-[15px] font-semibold tracking-tight text-white">Oasis</span>
        </Link>

        <div className="flex items-center gap-2">
          <ButtonLink
            href="/login"
            variant="landingSecondary"
            size="sm"
            className="border-transparent px-4"
          >
            Sign in
          </ButtonLink>
          <ButtonLink
            href="/register"
            variant="landingPrimary"
            size="sm"
            className="px-4"
          >
            Get started
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

