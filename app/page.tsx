import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold mb-2">Oasis</h1>
      <p className="text-zinc-400 mb-8 text-center max-w-md">
        AI-powered parametric wage protection for India's Q-commerce delivery
        partners.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors"
        >
          Get started
        </Link>
      </div>
    </main>
  );
}
