import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

const RIDER_SEEDS = ["rahul-zepto", "priya-blinkit", "vijay-delivery", "anita-qcommerce", "suresh-riders"];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0c0f12]">
      <Logo size={96} className="mb-6" priority />
      <div className="flex items-center gap-3 mb-4">
        {RIDER_SEEDS.map((seed) => (
          <Avatar key={seed} seed={seed} size={40} className="ring-2 ring-uber-green/20" />
        ))}
      </div>
      <h1 className="text-4xl font-bold mb-2 text-white">
        <span className="text-uber-green">Oasis</span>
      </h1>
      <p className="text-zinc-500 mb-8 text-center max-w-md">
        AI-powered parametric wage protection for India's Q-commerce delivery
        partners.
      </p>
      <div className="flex gap-4">
        <ButtonLink href="/login" variant="secondary" size="lg">
          Sign in
        </ButtonLink>
        <ButtonLink href="/register" variant="primary" size="lg">
          Get started
        </ButtonLink>
      </div>
    </main>
  );
}
