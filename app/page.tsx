import { AuthBackground } from '@/components/auth/AuthBackground';
import { ButtonLink } from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#0f0f0f] bg-gradient-to-b from-zinc-950 to-zinc-900">
      <AuthBackground />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start pt-[64vh] sm:pt-[60vh] px-6 pb-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <ButtonLink href="/login" variant="primary" size="lg">
            Sign in
          </ButtonLink>
          <ButtonLink href="/register" variant="secondary" size="lg">
            Get started
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
