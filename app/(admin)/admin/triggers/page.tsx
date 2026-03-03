import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Cloud, Car, Megaphone } from "lucide-react";

const typeIcons: Record<string, React.ReactNode> = {
  weather: <Cloud className="h-4 w-4" />,
  traffic: <Car className="h-4 w-4" />,
  social: <Megaphone className="h-4 w-4" />,
};

export default async function TriggersPage() {
  const supabase = createAdminClient();

  const { data: events } = await supabase
    .from("live_disruption_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Back
      </Link>
      <h1 className="text-xl font-bold">Live Trigger Feed</h1>
      <p className="text-zinc-400 text-sm">
        Parametric events from weather, traffic, and news APIs
      </p>
      <ul className="space-y-2">
        {(events ?? []).map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-4 rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3"
          >
            <span className="text-amber-400">
              {typeIcons[e.event_type] ?? <Cloud className="h-4 w-4" />}
            </span>
            <span className="capitalize font-medium">{e.event_type}</span>
            <span className="text-zinc-500">Severity {e.severity_score}/10</span>
            {e.verified_by_llm && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                LLM verified
              </span>
            )}
            <span className="ml-auto text-xs text-zinc-600">
              {new Date(e.created_at).toLocaleString()}
            </span>
          </li>
        ))}
        {(!events || events.length === 0) && (
          <li className="text-zinc-500 italic">No events yet</li>
        )}
      </ul>
    </div>
  );
}
