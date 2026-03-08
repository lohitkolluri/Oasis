'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/client';
import type { PlanPackage, WeeklyPolicy } from '@/lib/types/database';
import { Check, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PolicySubscribeFormProps {
  profileId: string;
  activePolicy: WeeklyPolicy | null;
  existingPolicies: WeeklyPolicy[];
  plans: PlanPackage[];
  suggestedPremium?: number;
  paymentSuccess?: boolean;
  paymentCanceled?: boolean;
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
  paymentSuccess = false,
  paymentCanceled = false,
}: PolicySubscribeFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const defaultPlan =
    plans.length > 0 ? (plans.find((p) => p.slug === 'standard') ?? plans[0]) : null;
  const [selectedPlan, setSelectedPlan] = useState<PlanPackage | null>(defaultPlan);

  const { start, end } = getNextWeekDates();
  const activePlan = selectedPlan ?? defaultPlan;
  const defaultPremium = activePlan?.weekly_premium_inr ?? suggestedPremium ?? 99;

  const hasPlans = plans.length > 0;

  useEffect(() => {
    if (paymentSuccess) {
      setMessage({ type: 'success', text: 'Payment successful. Policy activated.' });
      window.history.replaceState({}, '', '/dashboard/policy');
    } else if (paymentCanceled) {
      setMessage({ type: 'error', text: 'Payment was canceled.' });
      window.history.replaceState({}, '', '/dashboard/policy');
    }
  }, [paymentSuccess, paymentCanceled]);

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
      const createRes = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planIdToUse,
          weekStart: start,
          weekEnd: end,
        }),
      });

      const data = await createRes.json();

      if (!createRes.ok) {
        if (createRes.status === 503) {
          setMessage({
            type: 'error',
            text:
              data.error ??
              'Payment not configured. Add STRIPE_SECRET_KEY for Stripe Checkout.',
          });
          setLoading(false);
          return;
        }
        throw new Error(data.error ?? 'Failed to create checkout');
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setMessage({ type: 'error', text: 'No checkout URL returned.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Something went wrong',
      });
    } finally {
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
                      ? 'border-uber-green bg-uber-green/10 ring-1 ring-uber-green/30'
                      : 'border-zinc-700 bg-zinc-900/80 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-zinc-100">{plan.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-uber-green shrink-0" />}
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
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-uber-green/10">
            <Shield className="h-5 w-5 text-uber-green" />
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
              message.type === 'success' ? 'text-uber-green' : 'text-uber-red'
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
          {loading ? 'Redirecting to Stripe...' : 'Pay & Activate'}
        </Button>
      </Card>
    </form>
  );
}
