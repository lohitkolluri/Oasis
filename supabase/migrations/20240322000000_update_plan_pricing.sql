-- Update plan_packages with researched, actuarially-grounded pricing
-- Based on Indian Q-commerce rider earnings (₹6K–₹8K/week net),
-- existing micro-insurance precedents (Digit parametric, Bharatsure),
-- and IRDAI micro-insurance guidelines (premium ≤ 3% of target income).

UPDATE plan_packages SET
  description = 'Covers fuel & food costs on disrupted days — your minimum safety net',
  weekly_premium_inr = 49,
  payout_per_claim_inr = 300,
  max_claims_per_week = 1,
  updated_at = NOW()
WHERE slug = 'basic';

UPDATE plan_packages SET
  description = 'Replaces ~70% of a lost day''s income — the most popular plan',
  weekly_premium_inr = 99,
  payout_per_claim_inr = 700,
  max_claims_per_week = 2,
  updated_at = NOW()
WHERE slug = 'standard';

UPDATE plan_packages SET
  description = 'Full income replacement + expenses for high-risk zones',
  weekly_premium_inr = 199,
  payout_per_claim_inr = 1500,
  max_claims_per_week = 3,
  updated_at = NOW()
WHERE slug = 'premium';
