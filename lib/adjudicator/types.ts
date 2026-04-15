/** Shared types for the parametric adjudicator. */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Circle geofence used by triggers and event/claim logic. */
export interface GeofenceCircle {
  lat: number;
  lng: number;
  radius_km?: number;
  type?: 'circle';
}

/** Arbitrary payload from external trigger APIs (weather, news, etc.). */
export type RawTriggerData = Record<string, unknown>;

export interface AdjudicatorResult {
  candidates_found: number;
  claims_created: number;
  zones_checked: number;
  payouts_initiated: number;
  message: string;
  error?: string;
  payout_failures?: number;
  log_failures?: number;
  /** Correlation ID for this run (set by runAdjudicator). */
  run_id?: string;
}

export interface DemoTriggerOptions {
  eventSubtype:
    | 'extreme_heat'
    | 'heavy_rain'
    | 'severe_aqi'
    | 'traffic_gridlock'
    | 'zone_curfew';
  lat: number;
  lng: number;
  radiusKm?: number;
  severity?: number;
  /** When set, only this rider (profile_id) gets the claim/payout; zone check is skipped for them. */
  riderId?: string;
}

/** Options for `runAdjudicator` when not using the legacy positional demo payload. */
export interface RunAdjudicatorCallOptions {
  demoTrigger: DemoTriggerOptions;
  /** Skip `system_logs` row (batch runner logs one aggregate). */
  suppressSystemLog?: boolean;
  /** Merged into `system_logs.metadata` for demo analytics. */
  demoLogExtras?: Record<string, unknown>;
}

export interface TriggerCandidate {
  type: 'weather' | 'traffic' | 'social';
  subtype: string;
  severity: number;
  geofence?: GeofenceCircle;
  raw: RawTriggerData;
}

export interface ProcessTriggerResult {
  claimsCreated: number;
  payoutsInitiated: number;
  payoutFailures?: number;
  eventId?: string;
}

export type SupabaseAdmin = SupabaseClient;

/** Outcome of a single trigger adjudication row in the parametric ledger. */
export type ParametricLedgerOutcome = 'pay' | 'no_pay' | 'deferred';

/** Optional DB instrumentation passed into trigger collectors for source health. */
export interface AdjudicatorInstrumentationContext {
  supabase: SupabaseAdmin;
}
