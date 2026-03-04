"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    setMessage({
      type: "success",
      text: "Account created. Check your email to confirm, or sign in if already confirmed.",
    });
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-400 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Oasis
        </Link>
        <div className="flex justify-center mb-6">
          <Avatar seed={fullName || "oasis-new-rider"} size={72} />
        </div>
        <h1 className="text-xl font-semibold mb-6 text-center">Get started</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm text-zinc-400 mb-1">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Rahul Kumar"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm text-zinc-400 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-zinc-400 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Min 6 characters"
            />
          </div>
          {message && (
            <p
              className={`text-sm ${
                message.type === "success" ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {message.text}
            </p>
          )}
          <Button type="submit" disabled={loading} fullWidth size="lg">
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-zinc-400 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
