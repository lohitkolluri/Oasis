-- ============================================================================
-- ENABLE REALTIME ON TABLES + ADMIN READ POLICIES
-- ============================================================================
-- Previously only rider_notifications was in the Realtime publication,
-- leaving RealtimeWallet, WalletBalanceCard, PredictiveAlert, and RiskRadar
-- silently broken (subscribing but never receiving events).
-- Also adds admin SELECT policies so the admin live feed works through RLS.
-- ============================================================================

-- 1. Enable Realtime on tables with client subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE parametric_claims;
ALTER PUBLICATION supabase_realtime ADD TABLE live_disruption_events;
ALTER PUBLICATION supabase_realtime ADD TABLE weekly_policies;
ALTER PUBLICATION supabase_realtime ADD TABLE payout_ledger;

-- 2. Admin read policies for Realtime
CREATE POLICY "Admins can view all claims"
  ON parametric_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all policies"
  ON weekly_policies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all payouts"
  ON payout_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );
