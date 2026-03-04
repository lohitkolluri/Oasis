import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TriggersList } from "@/components/admin/TriggersList";

export default async function TriggersPage() {
  const supabase = createAdminClient();

  const { data: events } = await supabase
    .from("live_disruption_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Live Trigger Feed
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Parametric events from weather, traffic, and news APIs
        </p>
      </div>
      <TriggersList events={events ?? []} />
    </div>
  );
}
