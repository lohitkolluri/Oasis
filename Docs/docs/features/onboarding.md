---
id: onboarding
title: Onboarding
sidebar_position: 1
---

# Onboarding

The onboarding flow collects the information needed to personalize a rider's weekly premium and connect them to the parametric monitoring system.

---

## Flow Overview

```
/register → /login → /onboarding → /dashboard
```

1. **Register** (`/register`) — Email + password signup via Supabase Auth.
2. **Login** (`/login`) — Email + password sign-in.
3. **Onboarding** (`/onboarding`) — Collect platform, name, phone, zone, and government ID (all required).
4. **Dashboard** (`/dashboard`) — Rider's home screen.

The root `/` page checks for an active session and active policy:
- Authenticated + has active policy → `/dashboard`
- Authenticated + no policy → `/onboarding`
- Unauthenticated → `/login`

---

## Registration

Standard Supabase email/password authentication. On successful registration, Supabase creates an `auth.users` row. The `profiles` row is **not** created at registration — it is created during the onboarding step.

---

## Onboarding Step

The onboarding page at `/onboarding` renders a form that collects (all required):

1. **Delivery platform** — `zepto` or `blinkit` (persisted to `profiles.platform`)
2. **Full name** — As on government ID (persisted to `profiles.full_name`)
3. **Phone number** — For payout routing to UPI (`profiles.phone_number`)
4. **Delivery zone** — Rider pins their primary area on a MapLibre map. Coordinates stored in `profiles.zone_latitude` and `profiles.zone_longitude`.
5. **Government ID** — Upload of Aadhaar, PAN, Voter ID, or Driving License. Verified by LLM for authenticity before profile save.

On submission, the app:
1. Uploads the government ID to Supabase Storage and runs LLM verification.
2. If verification passes, upserts the `profiles` row with all data including `government_id_url` and `government_id_verified`.
3. Fetches a premium recommendation from `lib/ml/premium-calc.ts`.
4. Redirects to `/dashboard`.

---

## Zone Selection

The `ZoneMap` component renders an interactive MapLibre map using OpenStreetMap tiles. The rider can drag a marker to their primary delivery area. The coordinates are reverse-geocoded via the Nominatim API (no API key required, 1 req/s policy respected) to show a human-readable locality name.

```typescript
// lib/utils/geo.ts
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
    { next: { revalidate: 3600 } }  // Next.js cache for 1h
  );
  // Returns "Koramangala, Bengaluru" style string
}
```

---

## Premium Recommendation

After zone selection, the app calculates a recommended weekly premium:

```typescript
// lib/ml/premium-calc.ts
const historicalCount = await getHistoricalEventCount(supabase, lat, lng);
const forecastFactor  = await getForecastRiskFactor(supabase, lat, lng);
const premium         = calculateWeeklyPremium({ historicalEventCount, forecastRiskFactor });
```

The result is shown to the rider before they choose a plan, along with a risk explanation ("Your zone has seen N disruptions in the past 4 weeks").

---

## Profile Data Model

```typescript
interface Profile {
  id: string;                    // matches auth.users.id
  full_name: string | null;
  phone_number: string | null;
  platform: 'zepto' | 'blinkit' | null;
  zone_latitude: number | null;
  zone_longitude: number | null;
  primary_zone_geofence: object | null;
  role: 'rider' | 'admin';
  created_at: string;
  updated_at: string;
}
```

---

## Auth Callback

The Supabase OAuth callback route lives at `/auth/callback` (inside the `(auth)` route group). It exchanges the Supabase authorization code for a session and redirects to `/dashboard` (or the `next` query param if specified):

```typescript
// app/(auth)/auth/callback/route.ts
export async function GET(request: Request) {
  const code = searchParams.get("code");
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
```

---

## Admin Onboarding

Admins are not a separate user type — they are regular riders whose email appears in `ADMIN_EMAILS` (env var) or whose `profiles.role` is `'admin'`. An existing admin can promote another user via **Admin → Riders → [Rider] → Update Role**.
