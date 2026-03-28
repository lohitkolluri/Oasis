export type PlatformType = "zepto" | "blinkit";
export type DisruptionEventType = "weather" | "traffic" | "social";
export type ClaimStatus = "triggered" | "paid" | "pending_verification";

export interface Profile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  platform: PlatformType | null;
  /** Razorpay Customer id when using subscriptions / mandates */
  razorpay_customer_id?: string | null;
  /** Active or last subscription id (cleared when auto-renew cancelled) */
  razorpay_subscription_id?: string | null;
  /** True after a successful subscription charge (weekly auto-renew) */
  auto_renew_enabled?: boolean | null;
  payment_routing_id: string | null;
  primary_zone_geofence: Record<string, unknown> | null;
  zone_latitude?: number | null;
  zone_longitude?: number | null;
  government_id_url?: string | null;
  government_id_verified?: boolean | null;
  government_id_verification_result?: Record<string, unknown> | null;
  face_photo_url?: string | null;
  face_verified?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface PlanPackage {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  weekly_premium_inr: number;
  payout_per_claim_inr: number;
  max_claims_per_week: number;
  is_active: boolean;
  sort_order: number;
  /** Razorpay Plan id for weekly subscription billing */
  razorpay_plan_id?: string | null;
}

export interface WeeklyPolicy {
  id: string;
  profile_id: string;
  plan_id: string | null;
  week_start_date: string;
  week_end_date: string;
  weekly_premium_inr: number;
  is_active: boolean;
  /** Razorpay payment method after successful checkout (e.g. card, upi). */
  razorpay_payment_method?: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_subscription_id?: string | null;
  /** Legacy import only (pre–Razorpay migration). */
  stripe_payment_method_type?: string | null;
  stripe_payment_intent_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiveDisruptionEvent {
  id: string;
  event_type: DisruptionEventType;
  severity_score: number;
  geofence_polygon: Record<string, unknown> | null;
  verified_by_llm: boolean;
  raw_api_data: Record<string, unknown> | null;
  created_at: string;
}

export interface ParametricClaim {
  id: string;
  policy_id: string;
  disruption_event_id: string;
  payout_amount_inr: number;
  status: ClaimStatus;
  gateway_transaction_id: string | null;
  is_flagged?: boolean;
  flag_reason?: string | null;
  created_at: string;
  updated_at: string;
}

/** Aggregated wallet view — computed by the rider_wallet DB view. */
export interface RiderWallet {
  rider_id: string;
  total_earned_inr: number;
  total_claims: number;
  flagged_claims: number;
  last_payout_at: string | null;
  this_week_earned_inr: number;
  this_week_claims: number;
}
