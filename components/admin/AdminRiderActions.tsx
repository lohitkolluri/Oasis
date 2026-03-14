'use client';

import { Button } from '@/components/ui/Button';
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
    <Card variant="outline" padding="md" className="w-full sm:max-w-xs border-[#2d2d2d]">
      <p className="text-[10px] font-medium text-[#555] uppercase tracking-wider mb-3">
        Quick actions
      </p>
      {error && <p className="text-sm text-[#ef4444] mb-3">{error}</p>}
      {activePolicy ? (
        <div className="space-y-3">
          {plans.length > 0 && (
            <div>
              <p className="text-[10px] text-[#555] mb-2">Change plan</p>
              <div className="flex flex-wrap gap-1.5">
                {plans.map((plan) => {
                  const isCurrent = activePolicy.plan_id === plan.id;
                  const key = `${activePolicy.id}-${plan.id}`;
                  return (
                    <Button
                      key={plan.id}
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => !isCurrent && changePlan(activePolicy.id, plan.id)}
                      disabled={!!loading || isCurrent}
                      className={
                        isCurrent
                          ? 'border-[#2d2d2d] bg-[#1e1e1e] text-[#555]'
                          : 'border-[#2d2d2d] bg-transparent text-[#9ca3af] hover:border-[#22c55e]/40 hover:text-[#22c55e]'
                      }
                    >
                      {loading === key ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {plan.name} (₹{plan.weekly_premium_inr})
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => deactivatePolicy(activePolicy.id)}
            disabled={!!loading}
            className="w-full gap-2 border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/15 hover:border-[#f59e0b]/40"
          >
            {loading === activePolicy.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Deactivate policy
          </Button>
        </div>
      ) : (
        <p className="text-sm text-[#555]">No active policy</p>
      )}
    </Card>
  );
}
