"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PlatformType } from "@/lib/types/database";

export default function OnboardingPage() {
  const [platform, setPlatform] = useState<PlatformType | null>(null);
  const [phone, setPhone] = useState("");
  const [zone, setZone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!platform) return;
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in");
      setLoading(false);
      return;
    }

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: user.user_metadata?.full_name ?? user.email,
          phone_number: phone || null,
          platform,
          primary_zone_geofence: zone
            ? { zone_name: zone, coordinates: null }
            : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      setError(upsertError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">Complete your profile</h1>
        <p className="text-zinc-400 mb-8">
          Q-commerce delivery partner setup for Zepto / Blinkit
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-zinc-400 mb-3">
              Which platform do you deliver for?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPlatform("zepto")}
                className={`flex-1 py-3 px-4 rounded-lg border transition-colors ${
                  platform === "zepto"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                Zepto
              </button>
              <button
                type="button"
                onClick={() => setPlatform("blinkit")}
                className={`flex-1 py-3 px-4 rounded-lg border transition-colors ${
                  platform === "blinkit"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                Blinkit
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm text-zinc-400 mb-1">
              Phone number (optional)
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label htmlFor="zone" className="block text-sm text-zinc-400 mb-1">
              Primary delivery zone (optional)
            </label>
            <input
              id="zone"
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Koramangala, Bangalore"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={!platform || loading}
            className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
