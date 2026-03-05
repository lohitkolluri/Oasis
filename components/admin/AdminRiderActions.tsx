'use client';

import { Card } from '@/components/ui/Card';
import { gooeyToast } from 'goey-toast';
import { Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Policy {
  id: string;
  plan_id: string | null;
  is_active: boolean;
  week_start_date: string;
  week_end_date: string;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  weekly_premium_inr: number;
  payout_per_claim_inr: number;
}

interface AdminRiderActionsProps {
  riderId: string;
  policies: Policy[];
  plans: Plan[];
}

export function AdminRiderActions({ riderId, policies, plans }: AdminRiderActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function deactivatePolicy(policyId: string) {
    setLoading(policyId);
    setError(null);
    try {
      const res = await fetch('/api/admin/update-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId, isActive: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update');
      gooeyToast.success('Policy deactivated');
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(msg);
      gooeyToast.error('Failed to update policy', { description: msg });
    } finally {
      setLoading(null);
    }
  }

  async function changePlan(policyId: string, planId: string) {
    setLoading(`${policyId}-${planId}`);
    setError(null);
    try {
      const res = await fetch('/api/admin/update-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyId, planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update');
      gooeyToast.success('Plan updated');
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(msg);
      gooeyToast.error('Failed to update plan', { description: msg });
    } finally {
      setLoading(null);
    }
  }

  const activePolicy = policies.find((p) => p.is_active);

  return (
    <Card variant="outline" padding="md" className="w-full sm:max-w-xs">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
        Quick actions
      </p>
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
      {activePolicy ? (
        <div className="space-y-3">
          {plans.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-2">Change plan</p>
              <div className="flex flex-wrap gap-1.5">
                {plans.map((plan) => {
                  const isCurrent = activePolicy.plan_id === plan.id;
                  const key = `${activePolicy.id}-${plan.id}`;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => !isCurrent && changePlan(activePolicy.id, plan.id)}
                      disabled={!!loading || isCurrent}
                      className={`text-xs py-1.5 px-2.5 rounded-lg border transition-colors disabled:opacity-50 flex items-center gap-1 ${
                        isCurrent
                          ? 'bg-zinc-700 border-zinc-600 text-zinc-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400'
                      }`}
                    >
                      {loading === key ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {plan.name} (₹{plan.weekly_premium_inr})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => deactivatePolicy(activePolicy.id)}
            disabled={!!loading}
            className="w-full text-sm py-2 px-3 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading === activePolicy.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Deactivate policy
          </button>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No active policy</p>
      )}
    </Card>
  );
}
