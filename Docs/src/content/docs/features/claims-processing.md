---
title: Claims Processing
description: Automated parametric claims, geofence confirmation, real-time wallet
---

Oasis uses automated parametric claims. No claim form, adjuster handoff, or document chase is required. When a threshold is crossed, eligible riders receive a claim automatically and the payout is released after lightweight geofence confirmation.

## What Makes It "Parametric"

Traditional insurance requires the policyholder to:
1. Submit a claim form
2. Provide evidence (photos, reports)
3. Wait for an adjuster to verify
4. Receive payment after approval

Parametric insurance replaces all of this with **objective trigger thresholds**:
- The trigger condition (temperature ≥ 43°C for 3+ hours) is verified by a third-party API
- If the threshold is crossed, all eligible policyholders in the affected zone automatically receive a claim
- Oasis uses GPS confirmation plus fraud checks before releasing payout funds
- No manual claims form and no adjuster review in the normal flow

---

## Claim Lifecycle

```mermaid
flowchart LR
    A[Disruption] --> B[INSERT events]
    B --> C[For each policy]
    C --> D[Cap OK?]
    D --> E[Fraud checks]
    E --> F[INSERT pending_verification claim]
    F --> G[GPS confirmation]
    G --> H[Mark paid + wallet update]
```

**Flow:**

```
Disruption event detected by adjudicator
           ↓
INSERT live_disruption_events (event_type, severity, geofence, raw_api_data)
           ↓
For each active policy in affected geofence:
  ├── Check weekly claim cap (max_claims_per_week from plan_packages)
  ├── runAllFraudChecks() [parallel + sequential]
  │       ├── checkDuplicateClaim()   - same policy + same event?
  │       ├── checkRapidClaims()      - ≥ 5 claims in 24h?
  │       └── checkWeatherMismatch()  - raw data supports trigger?
  └── INSERT parametric_claims (status='pending_verification', payout_amount_inr)
           ↓
Mobile app auto-verifies GPS when possible; otherwise rider taps verify
           ↓
On successful verification → claim updated to status='paid'
           ↓
Supabase Realtime fires → wallet UI updates immediately
```

---

## Geofence Eligibility

A rider is eligible for a payout only if their delivery zone is inside the disruption event's geofence. The check uses geodesic distance (via Turf.js):

```typescript
// lib/utils/geo.ts
export function isWithinCircle(
  pointLat, pointLng,   // rider's zone
  centerLat, centerLng, // event center
  radiusKm              // event radius (15–50 km)
): boolean {
  return distanceKm(pointLat, pointLng, centerLat, centerLng) <= radiusKm;
}
```

Riders without a zone coordinate recorded are skipped.

---

## Weekly Claim Cap

Each plan has a maximum number of claims per week (`max_claims_per_week`). Before inserting a claim, the adjudicator counts the rider's claims since the current Monday:

```typescript
const { count: weekClaimCount } = await supabase
  .from("parametric_claims")
  .select("id", { count: "exact", head: true })
  .eq("policy_id", policy.id)
  .gte("created_at", weekStart);  // ISO of current Monday

if ((weekClaimCount ?? 0) >= maxClaimsPerWeek) continue;  // Skip
```

This prevents unlimited payouts in high-disruption weeks.

---

## Payout Amount

The payout is determined by the rider's plan (`payout_per_claim_inr` from `plan_packages`):

| Plan | Payout per claim |
|---|---|
| Basic | ₹300 |
| Standard | ₹400 |
| Premium | ₹600 |

The `gateway_transaction_id` field stores a deterministic ID in the format `oasis_payout_<timestamp>_<policyId[0:8]>_<random>` for audit traceability.

---

## Real-Time Wallet Update

After a verified claim is marked `paid`, Supabase Realtime pushes the change to connected clients subscribed to that policy's claims. The `RealtimeWallet` component accumulates the payout:

```typescript
// components/rider/RealtimeWallet.tsx
supabase
  .channel('wallet-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'parametric_claims',
    filter: `policy_id=eq.${policyId}`
  }, (payload) => {
    setBalance(prev => prev + payload.new.payout_amount_inr);
  })
  .subscribe();
```

Riders see their wallet balance increase in real time without refreshing the page.

---

## Manual Claim Review

Admins can manually review flagged claims in **Admin → Claims**. The admin can:
- View the fraud flag reason
- Override the flag (unflag a legitimate claim)
- Add a manual flag with a reason

This is accessible via `PATCH /api/admin/review-claim`:

```json
{
  "claimId": "uuid",
  "isFlagged": false,
  "reason": "Verified - GPS data confirmed rider was in zone"
}
```

---

## Location Confirmation

Claims are created in `pending_verification` state. Oasis then asks for GPS confirmation to ensure the rider was in the disruption zone before releasing funds. On mobile, this can happen automatically from the in-app notification flow; otherwise the rider can confirm manually from the dashboard.

The `ClaimVerificationPrompt` component:
1. Requests browser geolocation
2. POSTs to `/api/claims/verify-location`
3. The server checks `isWithinCircle()` against the event geofence
4. Records the result in `claim_verifications` as `inside_geofence` or `outside_geofence`
5. If inside the geofence, releases payout and marks the claim `paid`

If verification records `outside_geofence`, the claim is flagged and the fraud detector's `checkLocationVerification()` can flag future claims for that rider.

---

## Claims Dashboard (Rider View)

The rider's `/dashboard/claims` page shows:
- All claims for the current week
- Payout amounts and status
- Disruption event type and date
- Total accumulated payout (wallet balance)

Claims typically move through `pending_verification` to `paid`. Demo-mode claims may be auto-paid immediately so recordings and judge demos can show the full wallet-credit flow without waiting for device GPS.
