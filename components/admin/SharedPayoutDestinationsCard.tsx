import { Card } from '@/components/ui/Card';
import { CopyableId } from '@/components/ui/CopyableId';
import type { SharedPayoutDestinationRow } from '@/lib/admin/fraud-connections-summary';
import { Link2 } from 'lucide-react';

export function SharedPayoutDestinationsCard({ rows }: { rows: SharedPayoutDestinationRow[] }) {
  if (rows.length === 0) {
    return (
      <Card variant="default" className="p-5">
        <p className="text-xs font-medium text-white">Shared payout destinations</p>
        <p className="text-[12px] text-zinc-500 mt-1">
          No two profiles share the same payout destination in sampled data.
        </p>
      </Card>
    );
  }

  return (
    <Card variant="default" className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-zinc-500" aria-hidden />
        <div>
          <p className="text-xs font-medium text-white">Shared payout destinations</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Same UPI/VPA or routing id on multiple rider profiles — review for multi-account abuse.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-white/10 bg-black/30 text-zinc-500 uppercase tracking-wider text-[10px]">
              <th className="px-5 py-2 font-semibold">Routing id</th>
              <th className="px-3 py-2 font-semibold text-right">Profiles</th>
              <th className="px-5 py-2 font-semibold">Sample IDs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {rows.map((r) => (
              <tr key={r.payment_routing_id} className="hover:bg-white/[0.02]">
                <td className="px-5 py-2.5 font-mono text-zinc-300 max-w-[200px] truncate">
                  {r.payment_routing_id}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-white">
                  {r.profile_count}
                </td>
                <td className="px-5 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {r.profile_ids.slice(0, 5).map((id) => (
                      <CopyableId key={id} value={id} prefix="" length={8} label="Copy rider id" />
                    ))}
                    {r.profile_ids.length > 5 ? (
                      <span className="text-zinc-600">+{r.profile_ids.length - 5}</span>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
