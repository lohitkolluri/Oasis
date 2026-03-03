import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Cloud, Car, Megaphone } from "lucide-react";
import { Card } from "@/components/ui/Card";

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
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
        ← Back
      </Link>
      <h1 className="text-xl font-bold">Live Trigger Feed</h1>
      <p className="text-zinc-500 text-sm">
        Parametric events from weather, traffic, and news APIs
      </p>
      <ul className="space-y-2">
        {(events ?? []).map((e) => (
          <Card key={e.id} variant="default" padding="md">
            <div className="flex items-center gap-4">
              <span className="text-amber-400">
                {typeIcons[e.event_type] ?? <Cloud className="h-4 w-4" />}
              </span>
              <span className="capitalize font-medium text-zinc-200">{e.event_type}</span>
              <span className="text-zinc-500 tabular-nums">Severity {e.severity_score}/10</span>
              {e.verified_by_llm && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                  LLM verified
                </span>
              )}
              <span className="ml-auto text-xs text-zinc-500 tabular-nums">
                {new Date(e.created_at).toLocaleString()}
              </span>
            </div>
          </Card>
        ))}
        {(!events || events.length === 0) && (
          <Card variant="default" padding="lg">
            <p className="text-zinc-500 text-center py-4">No events yet. Run adjudicator from dashboard or wait for cron.</p>
          </Card>
        )}
      </ul>
    </div>
  );
}
