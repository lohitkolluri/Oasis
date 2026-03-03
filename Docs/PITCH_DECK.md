# Oasis — Pitch Deck

**AI-powered parametric wage protection for India's Q-commerce delivery partners.**

---

## Slide 1: The Problem

- 20–30% monthly earnings lost by gig workers during extreme weather, curfews, strikes
- No income protection against uncontrollable disruptions
- Zomato/Swiggy cover health/accidents—**not** loss of income from external events

---

## Slide 2: Our Solution — Oasis

- **Parametric insurance** for loss of income only (extreme weather, zone lockdowns)
- **Weekly pricing** aligned with gig worker payout cycles
- **Zero-touch claims** — automated triggers, instant payouts
- **Q-commerce focus** — Zepto, Blinkit (10-min SLA, highest disruption impact)

---

## Slide 3: How It Works

1. Rider subscribes weekly (₹79–149 based on zone risk)
2. APIs monitor: Tomorrow.io (weather), Open-Meteo (AQI), NewsData.io (curfews, traffic)
3. When trigger fires → automatic claim → instant payout to wallet
4. LLM verifies social and traffic disruptions for accuracy

---

## Slide 4: Parametric Triggers

| Trigger        | Source        | Example threshold     |
|----------------|---------------|------------------------|
| Extreme heat   | Tomorrow.io   | >43°C for 3+ hours     |
| Heavy rain     | Tomorrow.io   | Precipitation >4 mm/hr |
| Severe AQI     | Open-Meteo    | AQI ≥ 300              |
| Curfew / strike| NewsData + LLM| LLM-verified impact   |
| Traffic gridlock| NewsData + LLM| LLM verifies headlines|

---

## Slide 5: AI & Fraud

- **Dynamic premium:** Zone risk + historical events → weekly price
- **Duplicate detection:** Same policy + same event = blocked
- **Anomaly pipeline:** Weather mismatch, location/geofence validation

---

## Slide 6: Business Model

- Weekly premium: ₹79–149
- Loss ratio tracked in admin dashboard
- Scalable: more zones → more data → better pricing

---

## Slide 7: Tech Stack

- Next.js 15, Supabase (PostgreSQL, Auth, Realtime)
- Razorpay (test mode) for payments
- OpenRouter for LLM verification
- Deploy: Vercel / Docker

---

## Slide 8: Call to Action

- **Phase 1–3 complete** — Foundation, automation, scale
- **Ready for demo** — Real APIs → instant parametric payout
- **Contact:** [Your contact]

---

*Export this as PDF for the final submission.*
