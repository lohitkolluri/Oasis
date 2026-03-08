# Zepto / Q-commerce zone context

Reference for aligning Oasis (parametric insurance for delivery partners) with how Zepto and similar Q-commerce platforms operate.

## Zone strategy (Zepto)

- **Per dark store**: ~1.5–1.8 km radius (up to ~3 km in some areas).
- **Purpose**: 10-minute delivery; minimal travel between micro-warehouse and customer.
- **Scale**: 250+ dark stores across 10 major Indian cities.
- **Cities**: Bangalore, Chennai, Delhi, Ghaziabad, Gurgaon, Hyderabad, Kolkata, Mumbai, Noida, Pune.
- **Examples (Bangalore)**: Hebbal, Koramangala, Peenya, Malleswaram, Jayanagar, Indiranagar, Whitefield, HSR Layout, etc. — each is a hyper-local delivery zone.

*Sources: Zepto delivery areas (web), The Product Folks, Wikipedia, Scribd.*

## Implications for Oasis

1. **Rider zone**
   - Onboarding “zone” should map to these hyper-local areas where possible (e.g. “Koramangala”, “HSR Layout”) so risk and triggers are scoped correctly.

2. **Geofence radius**
   - For **parametric triggers** (weather, AQI, traffic), “affected zone” can reasonably match a single dark-store area: **~1.5–3 km**.
   - Current defaults (e.g. 15 km) are suitable for **city-level or multi-zone** events (e.g. “Heavy rain in Bangalore”). For **per-zone** or **per-dark-store** disruption, consider **2–3 km** so only riders in that micro-zone are in scope.

3. **Premium / risk**
   - Risk is highly local: one area flooded, adjacent area fine. Our premium and triggers already use lat/lng; keeping zone granularity (1.5–3 km) in mind improves fairness and accuracy.

4. **Demo / testing**
   - Demo triggers use a preset lat/lng and radius (e.g. 50 km). For more realistic “single Zepto zone” demos, use a smaller radius (e.g. 2–3 km) and a lat/lng inside a real delivery area (e.g. Koramangala, Hebbal).

## Suggested defaults (optional)

- **Single-zone / dark-store disruption**: `radius_km = 2` or `3`.
- **City-wide or multi-zone**: keep larger radius (10–15 km) or multiple trigger circles.

Use this context when tuning `TRIGGERS.DEFAULT_GEOFENCE_RADIUS_KM`, demo preset radii, and any UI copy about “affected zone” or “delivery zone”.
