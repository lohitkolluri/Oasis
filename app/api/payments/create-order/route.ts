import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Razorpay from "razorpay";

/** When true and Razorpay keys not set: activate policy without payment (dev/demo). */
const PAYMENT_DEMO_MODE = process.env.PAYMENT_DEMO_MODE === "true";

export async function POST(request: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const razorpayConfigured = !!(keyId && keySecret);
  const demoModeAllowed = PAYMENT_DEMO_MODE && !razorpayConfigured;

  if (!razorpayConfigured && !demoModeAllowed) {
    return NextResponse.json(
      { error: "Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or PAYMENT_DEMO_MODE=true for dev." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { amountInr, planId, weekStart, weekEnd, receipt } = body as {
    amountInr: number;
    planId?: string;
    weekStart?: string;
    weekEnd?: string;
    receipt?: string;
  };

  if (!amountInr || amountInr <= 0) {
    return NextResponse.json(
      { error: "Invalid amount" },
      { status: 400 }
    );
  }

  if (!weekStart || !weekEnd) {
    return NextResponse.json(
      { error: "Week dates required" },
      { status: 400 }
    );
  }

  try {
    const { data: policy, error: policyError } = await supabase
      .from("weekly_policies")
      .insert({
        profile_id: user.id,
        plan_id: planId || null,
        week_start_date: weekStart,
        week_end_date: weekEnd,
        weekly_premium_inr: amountInr,
        is_active: !razorpayConfigured,
      })
      .select("id")
      .single();

    if (policyError || !policy) {
      return NextResponse.json(
        { error: policyError?.message ?? "Failed to create policy" },
        { status: 500 }
      );
    }

    if (demoModeAllowed) {
      return NextResponse.json({
        demoMode: true,
        policyId: policy.id,
        message: "Policy activated (demo mode).",
      });
    }

    const razorpay = new Razorpay({ key_id: keyId!, key_secret: keySecret! });
    const amountPaise = Math.round(amountInr * 100);

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: receipt ?? `oasis_${user.id}_${Date.now()}`,
      notes: { profile_id: user.id, policy_id: policy.id },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      policyId: policy.id,
    });
  } catch (err) {
    console.error("Payment error:", err);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
