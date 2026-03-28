'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { PlanPackage, WeeklyPolicy } from '@/lib/types/database';
import { Check, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SubscriptionDetails } from './SubscriptionDetails';

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay Checkout'));
    document.body.appendChild(s);
  });
}

type CreateCheckoutResponse = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  policyId: string;
  prefill?: { email?: string; name?: string };
};

interface PolicySubscribeFormProps {
  profileId: string;
  activePolicy: WeeklyPolicy | null;
  planName?: string;
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
  planName: planNameProp = 'Weekly plan',
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

      const data = (await createRes.json()) as CreateCheckoutResponse & { error?: string };

      if (!createRes.ok) {
        if (createRes.status === 503) {
          setMessage({
            type: 'error',
            text:
              data.error ??
              'Payment not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (test mode).',
          });
          setLoading(false);
          return;
        }
        throw new Error(data.error ?? 'Failed to create checkout');
      }

      if (!data.keyId || !data.orderId || data.amount == null) {
        setMessage({ type: 'error', text: 'Invalid checkout response.' });
        setLoading(false);
        return;
      }

      await loadRazorpayScript();
      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) {
        setMessage({ type: 'error', text: 'Razorpay failed to load.' });
        setLoading(false);
        return;
      }

      const rzp = new RazorpayCtor({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: data.name,
        description: data.description,
        order_id: data.orderId,
        prefill: data.prefill,
        theme: { color: '#16a34a' },
        modal: {
          ondismiss: () => setLoading(false),
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyJson = (await verifyRes.json()) as { ok?: boolean; error?: string };
            if (!verifyRes.ok || !verifyJson.ok) {
              throw new Error(verifyJson.error ?? 'Payment verification failed');
            }
            window.location.href = '/dashboard/policy?success=1';
          } catch (e) {
            setMessage({
              type: 'error',
              text: e instanceof Error ? e.message : 'Verification failed',
            });
            setLoading(false);
          }
        },
      });

      rzp.open();
      return;
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
      <SubscriptionDetails
        policy={activePolicy}
        planName={planNameProp}
      />
    );
  }

  return (
    <form onSubmit={handleSubscribe} className="space-y-6">
      {hasPlans && (
        <div className="space-y-3">
          <h2 className="font-semibold text-zinc-200">Choose your plan</h2>
          <div className="space-y-2.5">
            {plans.map((plan) => {
              const isSelected = selectedPlan?.id === plan.id;
              const premium = Number(plan.weekly_premium_inr);
              const dailyCost = Math.round(premium / 7);
              const isPopular = plan.slug === 'standard';
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`relative w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
                    isSelected
                      ? 'border-uber-green bg-uber-green/10 ring-1 ring-uber-green/30'
                      : 'border-zinc-700/80 bg-zinc-900/80 hover:border-zinc-600'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-2.5 right-4 rounded-full bg-uber-green px-2.5 py-0.5 text-[10px] font-bold text-black uppercase tracking-wider">
                      Most popular
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[15px] text-zinc-100">{plan.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-uber-green shrink-0" />}
                      </div>
                      {plan.description && (
                        <p className="text-[12px] text-zinc-400 leading-relaxed">{plan.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold tabular-nums text-white">
                        ₹{premium.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">per week</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]">
                    <span className="text-[12px] text-zinc-400">
                      ₹{Number(plan.payout_per_claim_inr).toLocaleString('en-IN')}/claim
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-[12px] text-zinc-400">
                      up to {plan.max_claims_per_week} {plan.max_claims_per_week === 1 ? 'claim' : 'claims'}/week
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-[12px] text-zinc-500">
                      ₹{dailyCost}/day
                    </span>
                  </div>
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
        {!activePolicy && (
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
            By paying, you confirm you have read the{' '}
            <Link href="/dashboard/policy/docs" className="text-uber-green hover:text-uber-green/90 underline-offset-2">
              Policy Wording
            </Link>
            , including program exclusions (health, life, accident, vehicle repair) and all other terms. Weekly
            parametric income protection only.
          </p>
        )}
        <Button
          type="submit"
          disabled={loading || (hasPlans && !activePlan)}
          size="lg"
          className="mt-4"
        >
          {loading ? 'Opening Razorpay…' : 'Pay & Activate'}
        </Button>
      </Card>
    </form>
  );
}
