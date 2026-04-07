'use client';

import { Button } from '@/components/ui/Button';
import { gooeyToast } from 'goey-toast';
import { ArrowRightLeft, Loader2, RefreshCw, UserX } from 'lucide-react';
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

function DeprovisionDialog({
  open,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !busy && onClose()}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-2xl">
          <div className="p-4 border-b border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              Rider access control
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">Deprovision rider</h3>
            <p className="mt-1 text-sm text-white/60 leading-relaxed">
              This will disable access, scrub PII/payment identifiers, and deactivate active
              policies. Claims and policies remain for audit.
            </p>
          </div>

          <div className="p-4 space-y-3">
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-sm font-medium text-red-300">This action is hard to undo.</p>
              <p className="text-xs text-red-200/70 mt-1">
                Use for offboarding, fraud, or compliance removal. Historical rows are retained.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60">Reason (optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Duplicate account, compliance request, offboarded…"
                className="w-full min-h-[84px] rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/20 focus:ring-2 focus:ring-white/10"
                disabled={busy}
              />
            </div>
          </div>

          <div className="p-4 pt-0 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onConfirm(reason)}
              disabled={busy}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white border-transparent"
            >
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deprovisioning…
                </>
              ) : (
                <>
                  <UserX className="h-3.5 w-3.5" />
                  Confirm deprovision
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminRiderActions({ riderId, policies, plans }: AdminRiderActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPlans, setShowPlans] = useState(false);
  const [showDeprovision, setShowDeprovision] = useState(false);
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

  return (
    <div className="flex items-center gap-2 flex-wrap relative">
      {error && <span className="text-xs text-[#ef4444]">{error}</span>}

      {/* Deprovision rider (soft delete) */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowDeprovision(true)}
        disabled={!!loading}
        className="gap-1.5 border-[#ef4444]/30 bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/15 hover:border-[#ef4444]/40 transition-colors duration-150"
        title="Deprovision rider (soft delete)"
      >
        {loading === 'deprovision' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <UserX className="h-3 w-3" />
        )}
        Deprovision
      </Button>

      <DeprovisionDialog
        open={showDeprovision}
        busy={loading === 'deprovision'}
        onClose={() => setShowDeprovision(false)}
        onConfirm={async (reason) => {
          setLoading('deprovision');
          setError(null);
          try {
            const res = await fetch(`/api/admin/rider/${riderId}/deprovision`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason: reason.trim() || null }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Failed to deprovision');
            gooeyToast.success('Rider deprovisioned');
            setShowDeprovision(false);
            router.refresh();
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Something went wrong';
            setError(msg);
            gooeyToast.error('Failed to deprovision rider', { description: msg });
          } finally {
            setLoading(null);
          }
        }}
      />

      {/* Change Plan */}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPlans((v) => !v)}
          disabled={!!loading || !activePolicy || plans.length === 0}
          className="gap-1.5 border-[#2d2d2d] text-[#ccc] hover:bg-muted/50 hover:text-white transition-colors duration-150"
        >
          <ArrowRightLeft className="h-3 w-3" />
          Change Plan
        </Button>

        {showPlans && activePolicy && (
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
                    {plan.name} <span className="text-[#666]">₹{plan.weekly_premium_inr}/wk</span>
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
        onClick={() => activePolicy && deactivatePolicy(activePolicy.id)}
        disabled={!!loading || !activePolicy}
        className="gap-1.5 border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/15 hover:border-[#f59e0b]/40 transition-colors duration-150"
      >
        {loading === (activePolicy?.id ?? '') ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
        Deactivate
      </Button>
    </div>
  );
}
