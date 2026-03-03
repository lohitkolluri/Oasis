"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WeeklyPolicy } from "@/lib/types/database";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

interface PolicySubscribeFormProps {
  profileId: string;
  activePolicy: WeeklyPolicy | null;
  existingPolicies: WeeklyPolicy[];
  premium?: number;
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
    start: nextMonday.toISOString().split("T")[0],
    end: nextSunday.toISOString().split("T")[0],
  };
}

export function PolicySubscribeForm({
  profileId,
  activePolicy,
  existingPolicies,
  premium = 99,
}: PolicySubscribeFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const supabase = createClient();
  const { start, end } = getNextWeekDates();
  const defaultPremium = premium ?? 99;

  const loadRazorpayScript = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (typeof window !== "undefined" && window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
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

    try {
      const createRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountInr: defaultPremium,
          weekStart: start,
          weekEnd: end,
          receipt: `oasis_${profileId}_${Date.now()}`,
        }),
      });

      const orderData = await createRes.json();

      if (!createRes.ok) {
        if (createRes.status === 503) {
          await subscribeWithoutPayment();
          return;
        }
        throw new Error(orderData.error ?? "Failed to create order");
      }

      const policyId = orderData.policyId;
      await loadRazorpayScript();

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "Oasis",
        description: `Weekly coverage ${start} – ${end}`,
        handler: async (res: Record<string, string>) => {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
              policy_id: policyId,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            setMessage({ type: "error", text: verifyData.error ?? "Payment verification failed" });
            setLoading(false);
            return;
          }

          setMessage({ type: "success", text: "Payment successful. Policy activated." });
          window.location.reload();
        },
        prefill: { email: "" },
        theme: { color: "#059669" },
      });

      rzp.on("payment.failed", () => {
        setMessage({ type: "error", text: "Payment failed. Please try again." });
        setLoading(false);
      });

      rzp.open();
      setLoading(false);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
      setLoading(false);
    }
  }

  async function subscribeWithoutPayment() {
    if (activePolicy) return;

    const { error } = await supabase.from("weekly_policies").insert({
      profile_id: profileId,
      week_start_date: start,
      week_end_date: end,
      weekly_premium_inr: defaultPremium,
      is_active: true,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    setMessage({
      type: "success",
      text: "Policy activated (demo mode—add Razorpay keys for payments).",
    });
    window.location.reload();
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  if (activePolicy) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/80 border border-zinc-700/50 p-6 space-y-4 shadow-xl shadow-black/20">
        <p className="text-zinc-300">
          You have active coverage for{" "}
          <strong>
            {formatDate(activePolicy.week_start_date)} – {formatDate(activePolicy.week_end_date)}
          </strong>
        </p>
        <p className="text-sm text-zinc-500">
          Weekly premium: ₹{Number(activePolicy.weekly_premium_inr).toLocaleString()}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubscribe} className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-900/80 border border-zinc-700/50 p-6 shadow-xl shadow-black/20">
        <div className="flex items-center gap-3 mb-4">
          <Avatar seed={profileId} size={44} />
          <h2 className="font-semibold">Subscribe for next week</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Coverage period</span>
            <span>{start} – {end}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Weekly premium</span>
            <span className="font-medium">₹{defaultPremium}</span>
          </div>
        </div>
        {message && (
          <p
            className={`mt-4 text-sm ${
              message.type === "success" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {message.text}
          </p>
        )}
        <Button type="submit" disabled={loading} fullWidth size="lg" className="mt-4">
          {loading ? "Opening payment..." : "Pay & Activate"}
        </Button>
      </div>
    </form>
  );
}
