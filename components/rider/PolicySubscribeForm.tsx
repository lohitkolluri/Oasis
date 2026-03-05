'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';
import type { PlanPackage, WeeklyPolicy } from '@/lib/types/database';
import { Check, Shield } from 'lucide-react';
import { useCallback, useState } from 'react';

interface PolicySubscribeFormProps {
  profileId: string;
  activePolicy: WeeklyPolicy | null;
  existingPolicies: WeeklyPolicy[];
  plans: PlanPackage[];
  suggestedPremium?: number;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (res: Record<string, string>) => void) => void;
    };
  }
}

function getNextWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  return {
    start: nextMonday.toISOString().split('T')[0],
    end: nextSunday.toISOString().split('T')[0],
  };
}

export function PolicySubscribeForm({
  profileId,
  activePolicy,
  existingPolicies,
  plans,
  suggestedPremium = 99,
}: PolicySubscribeFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const defaultPlan =
    plans.length > 0 ? (plans.find((p) => p.slug === 'standard') ?? plans[0]) : null;
  const [selectedPlan, setSelectedPlan] = useState<PlanPackage | null>(defaultPlan);

  const supabase = createClient();
  const { start, end } = getNextWeekDates();
  const activePlan = selectedPlan ?? defaultPlan;
  const defaultPremium = activePlan?.weekly_premium_inr ?? suggestedPremium ?? 99;

  const hasPlans = plans.length > 0;

  const loadRazorpayScript = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }, []);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (activePolicy) {
      setLoading(false);
      return;
    }

    if (hasPlans && !activePlan) {
      setMessage({ type: 'error', text: 'Please select a plan.' });
      setLoading(false);
      return;
    }

    const premiumToPay = activePlan?.weekly_premium_inr ?? defaultPremium;
    const planIdToUse = activePlan?.id ?? undefined;

    try {
      const createRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountInr: premiumToPay,
          planId: planIdToUse,
          weekStart: start,
          weekEnd: end,
          receipt: `oasis_${profileId}_${Date.now()}`,
        }),
      });

      const orderData = await createRes.json();

      if (!createRes.ok) {
        if (createRes.status === 503) {
          setMessage({
            type: 'error',
            text:
              orderData.error ??
              'Payment not configured. Ask admin to set Razorpay keys or PAYMENT_DEMO_MODE.',
          });
          setLoading(false);
          return;
        }
        throw new Error(orderData.error ?? 'Failed to create order');
      }

      if (orderData.demoMode) {
        setMessage({ type: 'success', text: 'Policy activated (demo mode).' });
        window.location.reload();
        return;
      }

      const policyId = orderData.policyId;
      await loadRazorpayScript();

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'Oasis',
        description: `Weekly coverage ${start} – ${end}`,
        handler: async (res: Record<string, string>) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
              policy_id: policyId,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            setMessage({ type: 'error', text: verifyData.error ?? 'Payment verification failed' });
            setLoading(false);
            return;
          }

          setMessage({ type: 'success', text: 'Payment successful. Policy activated.' });
          window.location.reload();
        },
        prefill: { email: '' },
        theme: { color: '#059669' },
      });

      rzp.on('payment.failed', () => {
        setMessage({ type: 'error', text: 'Payment failed. Please try again.' });
        setLoading(false);
      });

      rzp.open();
      setLoading(false);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Something went wrong',
      });
      setLoading(false);
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (activePolicy) {
    return (
      <Card variant="elevated" padding="lg">
        <p className="text-zinc-300">
          You have active coverage for{' '}
          <strong>
            {formatDate(activePolicy.week_start_date)} – {formatDate(activePolicy.week_end_date)}
          </strong>
        </p>
        <p className="text-sm text-zinc-500">
          Weekly premium: ₹{Number(activePolicy.weekly_premium_inr).toLocaleString()}
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubscribe} className="space-y-6">
      {hasPlans && (
        <div className="space-y-3">
          <h2 className="font-semibold text-zinc-200">Choose your plan</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {plans.map((plan) => {
              const isSelected = selectedPlan?.id === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                      : 'border-zinc-700 bg-zinc-900/80 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-zinc-100">{plan.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
                  </div>
                  {plan.description && (
                    <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{plan.description}</p>
                  )}
                  <p className="text-lg font-bold tabular-nums text-zinc-100">
                    ₹{Number(plan.weekly_premium_inr).toLocaleString()}
                    <span className="text-xs font-normal text-zinc-500">/week</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    ₹{Number(plan.payout_per_claim_inr).toLocaleString()} per claim · up to{' '}
                    {plan.max_claims_per_week} claims/week
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <Card variant="elevated" padding="lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <h2 className="font-semibold">Subscribe for next week</h2>
        </div>
        <div className="space-y-2 text-sm">
          {hasPlans && (
            <div className="flex justify-between py-1.5">
              <span className="text-zinc-500">Plan</span>
              <span className="text-zinc-300 font-medium">{activePlan?.name ?? '—'}</span>
            </div>
          )}
          <div className="flex justify-between py-1.5">
            <span className="text-zinc-500">Coverage period</span>
            <span className="text-zinc-300 tabular-nums">
              {start} – {end}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-zinc-500">Weekly premium</span>
            <span className="font-medium tabular-nums">₹{defaultPremium}</span>
          </div>
        </div>
        {message && (
          <p
            className={`mt-4 text-sm ${
              message.type === 'success' ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {message.text}
          </p>
        )}
        <Button
          type="submit"
          disabled={loading || (hasPlans && !activePlan)}
          size="lg"
          className="mt-4"
        >
          {loading ? 'Opening payment...' : 'Pay & Activate'}
        </Button>
      </Card>
    </form>
  );
}
