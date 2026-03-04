import Link from "next/link";
import { ArrowLeft, ChevronRight, User } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";

export default async function AdminRidersPage() {
  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      phone_number,
      platform,
      primary_zone_geofence,
      zone_latitude,
      zone_longitude,
      created_at
    `)
    .order("created_at", { ascending: false });

  const zoneName = (gf: unknown) => {
    const z = gf as { zone_name?: string } | null;
    return z?.zone_name ?? "—";
  };

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
          Riders
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          View and manage delivery partner profiles
        </p>
      </div>

      <div className="space-y-3">
        {profiles?.map((p) => (
          <Link key={p.id} href={`/admin/riders/${p.id}`}>
            <Card
              variant="default"
              padding="md"
              className="hover:border-zinc-600 transition-colors group"
            >
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-100 truncate">
                    {p.full_name ?? "Unnamed rider"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {p.platform ?? "—"} · {zoneName(p.primary_zone_geofence)}
                  </p>
                </div>
                <p className="text-xs text-zinc-500 font-mono truncate max-w-[120px]">
                  {p.id.slice(0, 8)}…
                </p>
                <ChevronRight className="h-5 w-5 text-zinc-500 group-hover:text-zinc-400 transition-colors shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
        {(!profiles || profiles.length === 0) && (
          <Card variant="default" padding="lg">
            <p className="text-zinc-500 text-center py-8">No riders yet</p>
          </Card>
        )}
      </div>
    </div>
  );
}
