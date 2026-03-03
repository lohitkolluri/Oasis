# 5-Minute Demo Script

## Setup (before recording)
1. Ensure Supabase project is set up with migrations applied
2. Set PAYMENT_DEMO_MODE=true or Razorpay test keys for policy subscription
3. Create a test user (register → onboarding with Zepto/Blinkit)
4. Subscribe to a weekly policy (Pay & Activate)
5. Open admin dashboard in another tab

## Recording Flow (~5 min)

### 0:00 – 0:30 — Intro
- Show landing page: "Oasis — AI-powered parametric wage protection"
- Click "Get started" → Register → Onboarding (select Blinkit, enter zone)
- Land on dashboard with Policy documents link, Wallet, Risk Radar

### 0:30 – 1:30 — Policy & Payment
- Click "Get coverage" or "Manage policy"
- Show dynamic premium (₹79–149 based on risk)
- Click "Pay & Activate" — Razorpay checkout (or instant activation if PAYMENT_DEMO_MODE)
- Return to dashboard — active policy visible

### 1:30 – 2:30 — Parametric Triggers
- In Admin dashboard, click **Run now** (Run Adjudicator)
- Or cron: `GET /api/cron/adjudicator` with `Authorization: Bearer {CRON_SECRET}`
- Real weather/AQI/news APIs create events when thresholds met
- Show Risk Radar updating with disruption events; wallet updates (Realtime) when claims created

### 2:30 – 3:30 — Admin Dashboard
- Navigate to Admin
- Show: Weekly premiums, Total payouts, Loss ratio, Flagged claims
- **Run adjudicator** to check APIs and process payouts
- Open Live Trigger Feed — show disruption events
- Open Fraud Queue (duplicate/rapid-claims detection)

### 3:30 – 4:30 — Predictive Alert
- If a high-severity event exists: show "High disruption risk" banner
- Explain: Rider can log off to qualify for automatic payout

### 4:30 – 5:00 — Summary
- Recap: Weekly model, parametric triggers, instant payouts, fraud detection
- End with: "Oasis — Your income, weather-proofed."
