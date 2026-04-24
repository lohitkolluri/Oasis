'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { DynamicPlanQuote } from '@/lib/ml/resolve-dynamic-plan-quotes';
import type { PlanPackage, WeeklyPolicy } from '@/lib/types/database';
import { cn } from '@/lib/utils';
import {
  getCoverageWeekRange,
  getRemainingCoverageDaysInWeek,
  prorateWeeklyPremium,
} from '@/lib/utils/policy-week';
import { Check, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SubscriptionDetails } from './SubscriptionDetails';

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  const SRC = 'https://checkout.razorpay.com/v1/checkout.js';

  const waitForGlobal = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        if ((window as any).Razorpay) return resolve();
        if (Date.now() - start > ms)
          return reject(new Error('Razorpay script loaded but global was not available.'));
        setTimeout(tick, 50);
      };
      tick();
    });

  const injectOnce = () =>
    new Promise<void>((resolve, reject) => {
      // Reuse an existing script tag if present (prevents duplicate injection on retries).
      const existing = Array.from(document.getElementsByTagName('script')).find(
        (el) => el.src === SRC,
      ) as HTMLScriptElement | undefined;

      const s = existing ?? document.createElement('script');
      if (!existing) {
        s.src = SRC;
        s.async = true;
        s.crossOrigin = 'anonymous';
        document.body.appendChild(s);
      }

      const cleanup = () => {
        s.removeEventListener('load', onLoad);
        s.removeEventListener('error', onError);
      };
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(
          new Error(
            'Failed to load Razorpay Checkout. It may be blocked by an ad blocker or network policy.',
          ),
        );
      };

      // If it already loaded but global isn't set yet, just wait briefly.
      if (existing && (existing as any).readyState === 'complete') {
        resolve();
        return;
      }

      s.addEventListener('load', onLoad);
      s.addEventListener('error', onError);

      // Timeout to avoid hanging forever.
      setTimeout(() => {
        cleanup();
        reject(
          new Error(
            'Timed out loading Razorpay Checkout. Check ad blockers or corporate network filtering.',
          ),
        );
      }, 8000);
    });

  // Try twice: transient CDN errors happen.
  return injectOnce()
    .then(() => waitForGlobal(1500))
    .catch(async (e) => {
      await new Promise((r) => setTimeout(r, 400));
      await injectOnce();
      await waitForGlobal(1500);
      throw e;
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
  prefill?: { email?: string; name?: string; contact?: string };
};

type CreateSubscriptionResponse = {
  keyId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  policyId: string;
  prefill?: { email?: string; name?: string; contact?: string };
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
  /** Profile flag: subscription mandate is active after first successful charge */
  autoRenewEnabled?: boolean;
  /** Engine-priced weekly amounts per `plan.slug` (basic | standard | premium) */
  dynamicQuotesBySlug?: Record<string, DynamicPlanQuote>;
}

function quoteForPlan(
  plan: PlanPackage,
  dynamicQuotesBySlug?: Record<string, DynamicPlanQuote>,
): DynamicPlanQuote {
  const q = dynamicQuotesBySlug?.[plan.slug];
  if (q) return q;
  return {
    weekly_premium_inr: Number(plan.weekly_premium_inr),
    payout_per_claim_inr: Number(plan.payout_per_claim_inr),
    max_claims_per_week: plan.max_claims_per_week,
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
  autoRenewEnabled = false,
  dynamicQuotesBySlug,
}: PolicySubscribeFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // If a mandate already exists, don't let the rider attempt to create a new one.
  // They can still pay for the current week via one-time checkout.
  const [weeklyAutoRenew, setWeeklyAutoRenew] = useState(false);
  const defaultPlan =
    plans.length > 0 ? (plans.find((p) => p.slug === 'standard') ?? plans[0]) : null;
  const [selectedPlan, setSelectedPlan] = useState<PlanPackage | null>(defaultPlan);

  const { start, end } = getCoverageWeekRange();
  const activePlan = selectedPlan ?? defaultPlan;
  const activeQuote = activePlan ? quoteForPlan(activePlan, dynamicQuotesBySlug) : null;
  const defaultPremium = activeQuote?.weekly_premium_inr ?? suggestedPremium ?? 99;
  const coveredDays = getRemainingCoverageDaysInWeek(end);
  const premiumDueNow =
    weeklyAutoRenew && !autoRenewEnabled
      ? defaultPremium
      : prorateWeeklyPremium(defaultPremium, coveredDays);

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

    const planIdToUse = activePlan?.id ?? undefined;

    try {
      const wantsMandate = weeklyAutoRenew && !autoRenewEnabled;
      const endpoint = wantsMandate
        ? '/api/payments/create-subscription'
        : '/api/payments/create-checkout';
      const createRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planIdToUse,
          weekStart: start,
          weekEnd: end,
        }),
      });

      const raw = (await createRes.json()) as Record<string, unknown>;
      const err = typeof raw.error === 'string' ? raw.error : undefined;

      if (!createRes.ok) {
        if (createRes.status === 503) {
          const looksLikeMissingKeys =
            typeof err === 'string' &&
            (err.includes('NEXT_PUBLIC_RAZORPAY_KEY_ID') || err.includes('Payment not configured'));
          setMessage({
            type: 'error',
            text: looksLikeMissingKeys
              ? (err ??
                'Payment not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (test mode).')
              : (err ?? 'Service temporarily unavailable. Try again.'),
          });
          setLoading(false);
          return;
        }
        throw new Error(err ?? 'Failed to create checkout');
      }

      if (raw.ok === true && raw.policyActivated === true) {
        window.location.href = '/dashboard/policy?success=1';
        setLoading(false);
        return;
      }

      await loadRazorpayScript();
      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) {
        setMessage({
          type: 'error',
          text: 'Razorpay failed to load. Disable ad blockers / tracking protection for this site and try again.',
        });
        setLoading(false);
        return;
      }

      if (wantsMandate) {
        const data = raw as CreateSubscriptionResponse;
        if (!data.keyId || !data.subscriptionId) {
          setMessage({ type: 'error', text: 'Invalid subscription response.' });
          setLoading(false);
          return;
        }

        const rzp = new RazorpayCtor({
          key: data.keyId,
          subscription_id: data.subscriptionId,
          name: data.name,
          description: data.description,
          prefill: data.prefill,
          theme: { color: '#16a34a' },
          modal: {
            ondismiss: () => setLoading(false),
          },
          handler: async (response: Record<string, string>) => {
            try {
              const verifyRes = await fetch('/api/payments/verify-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_subscription_id: response.razorpay_subscription_id,
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
        } as never);

        rzp.open();
        return;
      }

      const data = raw as CreateCheckoutResponse;
      if (!data.keyId || !data.orderId || data.amount == null) {
        setMessage({ type: 'error', text: 'Invalid checkout response.' });
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
        handler: async (response: Record<string, string>) => {
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
        autoRenewEnabled={autoRenewEnabled}
      />
    );
  }

  return (
    <form onSubmit={handleSubscribe} className="space-y-6">
      {hasPlans && (
        <div className="space-y-3">
          <h2 className="font-semibold text-zinc-200">Choose your plan</h2>
          <div className="space-y-3.5">
            {plans.map((plan) => {
              const isSelected = selectedPlan?.id === plan.id;
              const quote = quoteForPlan(plan, dynamicQuotesBySlug);
              const premium = quote.weekly_premium_inr;
              const dailyCost = Math.round(premium / 7);
              const isPopular = plan.slug === 'standard';
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`relative w-full rounded-2xl border p-4 text-left transition-all duration-300 ${
                    isSelected
                      ? 'border-uber-green/60 bg-gradient-to-br from-uber-green/15 to-uber-green/5 shadow-[0_0_15px_rgba(58,167,109,0.15)] ring-1 ring-uber-green/30 relative z-10 scale-[1.02]'
                      : 'border-white/10 bg-[#0c0c0c] hover:border-white/20 hover:bg-white/[0.03] opacity-80 hover:opacity-100'
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-2.5 right-4 flex items-center">
                      <span className="relative z-10 rounded-full bg-uber-green px-2.5 py-0.5 text-[10px] font-bold text-black uppercase tracking-wider">
                        Most popular
                      </span>
                      {isSelected && (
                        <span className="absolute inset-0 rounded-full bg-uber-green/40 shadow-[0_0_10px_rgba(58,167,109,0.8)] animate-pulse-slow"></span>
                      )}
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-bold text-[15px] ${isSelected ? 'text-white' : 'text-zinc-200'}`}
                        >
                          {plan.name}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-uber-green shrink-0" />}
                      </div>
                      {plan.description && (
                        <p
                          className={`text-[12px] leading-relaxed ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}
                        >
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-xl font-bold tabular-nums tracking-tight ${isSelected ? 'text-uber-green' : 'text-white'}`}
                      >
                        ₹{premium.toLocaleString('en-IN')}
                      </p>
                      <p
                        className={`text-[11px] mt-0.5 ${isSelected ? 'text-uber-green/70' : 'text-zinc-500'}`}
                      >
                        per week
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]">
                    <span
                      className={`text-[12px] font-medium tabular-nums ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}
                    >
                      ₹{quote.payout_per_claim_inr.toLocaleString('en-IN')}/payout
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span
                      className={`text-[12px] font-medium tabular-nums ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}
                    >
                      up to {quote.max_claims_per_week}{' '}
                      {quote.max_claims_per_week === 1 ? 'payout' : 'payouts'}/week
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span
                      className={`text-[12px] font-medium tabular-nums ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}
                    >
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
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              This week
            </p>
            <p className="mt-1 text-sm text-zinc-300 tabular-nums font-medium">
              {formatDate(start)} – {formatDate(end)}
              {hasPlans && activePlan ? (
                <span className="text-zinc-500">
                  {' '}
                  · <span className="text-white">{activePlan.name}</span>
                </span>
              ) : null}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Due</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-white">₹{premiumDueNow}</p>
            {coveredDays < 7 && !(weeklyAutoRenew && !autoRenewEnabled) ? (
              <p className="text-[11px] mt-0.5 text-zinc-500">
                {coveredDays} day{coveredDays === 1 ? '' : 's'} left this week
              </p>
            ) : null}
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || (hasPlans && !activePlan)}
          size="lg"
          fullWidth
          className="mt-5"
        >
          {loading
            ? 'Opening Razorpay…'
            : weeklyAutoRenew && !autoRenewEnabled
              ? 'Authorise & pay'
              : 'Pay now'}
        </Button>

        {autoRenewEnabled ? (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-zinc-300 flex items-center gap-2 min-w-0 pr-2">
                <RefreshCw className="h-3.5 w-3.5 text-uber-green shrink-0" aria-hidden />
                <span>
                  <span className="font-medium text-white">Auto-renew is already enabled</span>
                  <span className="text-zinc-500"> · future weeks renew automatically</span>
                </span>
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={loading}
                onClick={async () => {
                  try {
                    setLoading(true);
                    setMessage(null);
                    const res = await fetch('/api/payments/cancel-subscription', {
                      method: 'POST',
                    });
                    const j = (await res.json()) as { ok?: boolean; error?: string };
                    if (!res.ok || !j.ok) {
                      throw new Error(j.error ?? 'Could not cancel auto-renewal');
                    }
                    window.location.reload();
                  } catch (e) {
                    setMessage({
                      type: 'error',
                      text: e instanceof Error ? e.message : 'Could not cancel auto-renewal',
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Cancel
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              To start a new mandate (e.g. switch payment method), cancel this one first.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
            <span className="text-[13px] text-zinc-300 flex items-center gap-2 min-w-0 pr-2">
              <RefreshCw className="h-3.5 w-3.5 text-uber-green shrink-0" aria-hidden />
              <span id="auto-renew-label">
                <span className="font-medium text-white">Auto-renew</span>
                <span className="text-zinc-500"> · UPI or card mandate</span>
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={weeklyAutoRenew}
              aria-labelledby="auto-renew-label"
              onClick={() => setWeeklyAutoRenew((v) => !v)}
              className={cn(
                'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uber-green focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
                weeklyAutoRenew ? 'bg-uber-green' : 'bg-zinc-600',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-out',
                  weeklyAutoRenew ? 'translate-x-6' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        )}

        {message && (
          <p
            className={`mt-3 text-sm font-medium ${
              message.type === 'success' ? 'text-uber-green' : 'text-uber-red'
            }`}
          >
            {message.text}
          </p>
        )}

        {!activePolicy && (
          <p className="mt-4 text-center text-[10px] leading-relaxed text-zinc-600">
            <Link
              href="/dashboard/policy/docs"
              className="text-zinc-500 hover:text-uber-green underline-offset-2"
            >
              Policy terms
            </Link>{' '}
            apply. Income protection only (not health, life, accident, or vehicle cover).
          </p>
        )}
      </Card>
    </form>
  );
}
