# 5-Minute Demo Script

## Setup (before recording)
1. Ensure Supabase project is set up with migrations applied
2. Create a test user (register → onboarding with Zepto/Blinkit)
3. Subscribe to a weekly policy (Pay & Activate — demo mode if no Razorpay keys)
4. Open admin dashboard in another tab

## Recording Flow (~5 min)

### 0:00 – 0:30 — Intro
- Show landing page: "Oasis — AI-powered parametric wage protection"
- Click "Get started" → Register → Onboarding (select Blinkit, enter zone)
- Land on dashboard with Scope Disclaimer, Wallet, Risk Radar

### 0:30 – 1:30 — Policy & Payment
- Click "Get coverage" or "Manage policy"
- Show dynamic premium (₹79–149 based on risk)
- Click "Pay & Activate" — show Razorpay checkout (or demo mode message)
- Return to dashboard — active policy visible

### 1:30 – 2:30 — Trigger Simulation
- Open new tab: `GET /api/cron/adjudicator`
  - Or set `TRIGGER_TRAFFIC_DEMO=true` and hit the endpoint
- Show Risk Radar updating in real time with new disruption event
- Show wallet balance updating (Realtime) when claim is created

### 2:30 – 3:30 — Admin Dashboard
- Navigate to Admin
- Show: Weekly premiums, Total payouts, Loss ratio, Flagged claims
- Open Live Trigger Feed — show disruption events
- Open Fraud Queue (if any flagged)

### 3:30 – 4:30 — Predictive Alert
- If a high-severity event exists: show "High disruption risk" banner
- Explain: Rider can log off to qualify for automatic payout

### 4:30 – 5:00 — Summary
- Recap: Weekly model, parametric triggers, instant payouts, fraud detection
- End with: "Oasis — Your income, weather-proofed."
