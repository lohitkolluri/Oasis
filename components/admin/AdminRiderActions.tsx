'use client';

import { Button } from '@/components/ui/Button';
import { gooeyToast } from 'goey-toast';
import { Loader2, RefreshCw, ArrowRightLeft } from 'lucide-react';
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
  const [showPlans, setShowPlans] = useState(false);
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
      setShowPlans(false);
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

  if (!activePolicy) {
    return (
      <span className="text-xs text-[#555]">No active policy</span>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap relative">
      {error && <span className="text-xs text-[#ef4444]">{error}</span>}

      {/* Change Plan */}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPlans((v) => !v)}
          disabled={!!loading || plans.length === 0}
          className="gap-1.5 border-[#2d2d2d] text-[#ccc] hover:bg-muted/50 hover:text-white transition-colors duration-150"
        >
          <ArrowRightLeft className="h-3 w-3" />
          Change Plan
        </Button>

        {showPlans && (
          <div className="absolute top-full right-0 mt-1.5 z-30 min-w-[180px] rounded-lg border border-[#2d2d2d] bg-[#161616] shadow-xl py-1">
            {plans.map((plan) => {
              const isCurrent = activePolicy.plan_id === plan.id;
              const key = `${activePolicy.id}-${plan.id}`;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => !isCurrent && changePlan(activePolicy.id, plan.id)}
                  disabled={!!loading || isCurrent}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors duration-150 flex items-center justify-between gap-2 ${
                    isCurrent
                      ? 'text-[#555] bg-[#1a1a1a]'
                      : 'text-[#ccc] hover:bg-muted/50 hover:text-white'
                  }`}
                >
                  <span>
                    {plan.name}{' '}
                    <span className="text-[#666]">₹{plan.weekly_premium_inr}/wk</span>
                  </span>
                  {loading === key && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                  {isCurrent && (
                    <span className="text-[10px] text-[#555] font-medium">Current</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Deactivate */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => deactivatePolicy(activePolicy.id)}
        disabled={!!loading}
        className="gap-1.5 border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/15 hover:border-[#f59e0b]/40 transition-colors duration-150"
      >
        {loading === activePolicy.id ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
        Deactivate
      </Button>
    </div>
  );
}
