import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";

const RIDER_SEEDS = ["rahul-zepto", "priya-blinkit", "vijay-delivery", "anita-qcommerce", "suresh-riders"];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-zinc-950 to-zinc-900">
      <div className="flex items-center gap-3 mb-6">
        {RIDER_SEEDS.map((seed) => (
          <Avatar key={seed} seed={seed} size={48} className="border-zinc-600 ring-emerald-500/10" />
        ))}
      </div>
      <h1 className="text-4xl font-bold mb-2">Oasis</h1>
      <p className="text-zinc-400 mb-8 text-center max-w-md">
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
