import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    policy_id,
  } = body as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    policy_id?: string;
  };

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json(
      { error: "Razorpay not configured" },
      { status: 503 }
    );
  }

  const signBody = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSign = crypto
    .createHmac("sha256", keySecret)
    .update(signBody)
    .digest("hex");

  if (expectedSign !== razorpay_signature) {
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 400 }
    );
  }

  if (policy_id) {
    const { error } = await supabase
      .from("weekly_policies")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", policy_id)
      .eq("profile_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to activate policy" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    payment_id: razorpay_payment_id,
    message: "Payment verified. Policy activated.",
  });
}
