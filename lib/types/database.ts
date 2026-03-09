export type PlatformType = "zepto" | "blinkit";
export type DisruptionEventType = "weather" | "traffic" | "social";
export type ClaimStatus = "triggered" | "paid" | "pending_verification";

export interface Profile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  platform: PlatformType | null;
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
}

export interface WeeklyPolicy {
  id: string;
  profile_id: string;
  plan_id: string | null;
  week_start_date: string;
  week_end_date: string;
  weekly_premium_inr: number;
  is_active: boolean;
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
