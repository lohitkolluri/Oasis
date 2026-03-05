-- Payment audit trail for subscription transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weekly_policy_id UUID REFERENCES weekly_policies(id) ON DELETE SET NULL,
  amount_inr NUMERIC(10, 2) NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_profile ON payment_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_policy ON payment_transactions(weekly_policy_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at DESC);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment transactions" ON payment_transactions;
CREATE POLICY "Users can view own payment transactions"
  ON payment_transactions FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own payment transactions" ON payment_transactions;
CREATE POLICY "Users can insert own payment transactions"
  ON payment_transactions FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own payment transactions" ON payment_transactions;
CREATE POLICY "Users can update own payment transactions"
  ON payment_transactions FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Service role full access payment_transactions" ON payment_transactions;
CREATE POLICY "Service role full access payment_transactions"
  ON payment_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE payment_transactions IS 'Audit log of subscription payments via Razorpay';
