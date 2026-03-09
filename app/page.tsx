import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

const RIDER_SEEDS = ["rahul-zepto", "priya-blinkit", "vijay-delivery", "anita-qcommerce", "suresh-riders"];
const HIGHLIGHTS = ["Weekly pricing", "Trigger-based cover", "Fast wallet payouts"];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0c0f12]">
      <Logo size={96} className="mb-6" priority />
      <div className="flex items-center gap-3 mb-4">
        {RIDER_SEEDS.map((seed) => (
          <Avatar key={seed} seed={seed} size={40} className="ring-2 ring-uber-green/20" />
        ))}
      </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white text-center max-w-4xl text-balance">
        <span className="text-uber-green">Oasis</span>
      </h1>
      <p className="text-white text-center max-w-3xl text-xl md:text-2xl font-semibold text-balance">
        Weekly income protection for India&apos;s q-commerce delivery riders.
      </p>
      <p className="text-zinc-400 mb-6 mt-3 text-center max-w-2xl">
        Oasis detects extreme heat, heavy rain, AQI spikes, traffic gridlock, and zone lockdowns,
        then creates trigger-based claims automatically so eligible riders can get paid faster.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        {HIGHLIGHTS.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300"
          >
            {item}
          </span>
        ))}
      </div>
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
