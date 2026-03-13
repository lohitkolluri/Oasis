export interface SelfReportResponse {
  id: string;
  created_at: string;
  verified: boolean;
  reason: string;
  claim_created: boolean;
  claim_accepted: boolean;
  fraud_blocked: boolean;
  payout_initiated: boolean;
  corroboration?: Record<string, unknown>;
}

