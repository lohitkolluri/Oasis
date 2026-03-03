export type PlatformType = "zepto" | "blinkit";
export type DisruptionEventType = "weather" | "traffic" | "social";
export type ClaimStatus = "triggered" | "paid";

export interface Profile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  platform: PlatformType | null;
  payment_routing_id: string | null;
  primary_zone_geofence: Record<string, unknown> | null;
  zone_latitude?: number | null;
  zone_longitude?: number | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyPolicy {
  id: string;
  profile_id: string;
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
