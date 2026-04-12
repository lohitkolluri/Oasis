"""
Synthetic datasets aligned with Oasis parametric + fraud constants (see ../oasis_constants.json).
Used to train simple models that approximate production geometry and rule structure.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]


def load_constants() -> dict:
    with open(ROOT / "oasis_constants.json", encoding="utf-8") as f:
        return json.load(f)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


def generate_geofence_rows(
    n: int = 8000,
    rng: np.random.Generator | None = None,
) -> pd.DataFrame:
    """Rider point vs circular disruption/policy zone; label = inside geofence (with GPS noise)."""
    rng = rng or np.random.default_rng(42)
    const = load_constants()
    hubs = const["INDIA_HUBS"]
    rows = []
    for _ in range(n):
        hub = hubs[rng.integers(0, len(hubs))]
        center_lat, center_lng = hub["lat"], hub["lng"]
        radius_km = float(
            rng.choice(
                [
                    const["TRIGGERS"]["SINGLE_ZONE_RADIUS_KM"],
                    const["TRIGGERS"]["DEFAULT_GEOFENCE_RADIUS_KM"],
                    5.0,
                    10.0,
                ]
            )
        )
        # Uniform random bearing and distance: mix inside/outside
        inside = rng.random() < 0.5
        if inside:
            dist_km = rng.uniform(0, max(0.05, radius_km * 0.92))
        else:
            dist_km = rng.uniform(radius_km * 1.05, radius_km + 25)
        bearing = rng.uniform(0, 2 * math.pi)
        # Approx offset degrees from center
        dlat = (dist_km / 111.0) * math.cos(bearing)
        dlng = (dist_km / (111.0 * max(0.2, math.cos(math.radians(center_lat))))) * math.sin(
            bearing
        )
        # ~25–40m equivalent noise: harder boundary, less "perfect" separation
        rider_lat = center_lat + dlat + rng.normal(0, 0.00035)
        rider_lng = center_lng + dlng + rng.normal(0, 0.00035)
        dist_actual = haversine_km(rider_lat, rider_lng, center_lat, center_lng)
        label = int(dist_actual <= radius_km)
        # Do not export dist_km / deltas for training — they trivially encode the label.
        rows.append(
            {
                "center_lat": center_lat,
                "center_lng": center_lng,
                "radius_km": radius_km,
                "rider_lat": rider_lat,
                "rider_lng": rider_lng,
                "inside_zone": label,
            }
        )
    return pd.DataFrame(rows)


def generate_impossible_travel_rows(
    n: int = 10000,
    rng: np.random.Generator | None = None,
) -> pd.DataFrame:
    """
    Two fixes (minutes apart); label if Oasis-style impossible travel:
    distance > IMPOSSIBLE_TRAVEL_KM while elapsed <= IMPOSSIBLE_TRAVEL_MINUTES.
    """
    rng = rng or np.random.default_rng(43)
    const = load_constants()
    max_km = const["FRAUD"]["IMPOSSIBLE_TRAVEL_KM"]
    max_min = const["FRAUD"]["IMPOSSIBLE_TRAVEL_MINUTES"]
    hubs = const["INDIA_HUBS"]
    rows = []
    for _ in range(n):
        h = hubs[rng.integers(0, len(hubs))]
        lat1, lng1 = h["lat"] + rng.normal(0, 0.02), h["lng"] + rng.normal(0, 0.02)
        minutes = float(rng.uniform(2, 90))
        impossible = rng.random() < 0.35
        if impossible:
            # Need speed implied > max_km in max_min -> pick large distance short time
            dist_km = float(rng.uniform(max_km + 2, max_km + 180))
            minutes = float(rng.uniform(5, max_min))
        else:
            dist_km = float(
                rng.choice(
                    [
                        rng.uniform(0.5, 8),
                        rng.uniform(8, 35),
                        rng.uniform(35, max_km * 0.85),
                    ]
                )
            )
            if dist_km > max_km:
                minutes = float(rng.uniform(max_min + 1, 240))
        # Second point along rough bearing
        bearing = rng.uniform(0, 2 * math.pi)
        dlat = (dist_km / 111.0) * math.cos(bearing)
        dlng = (dist_km / (111.0 * max(0.2, math.cos(math.radians(lat1))))) * math.sin(bearing)
        lat2_true, lng2_true = lat1 + dlat, lng1 + dlng
        dist_true = haversine_km(lat1, lng1, lat2_true, lng2_true)
        label = int(dist_true > max_km and minutes <= max_min)
        # Observed second fix: GPS noise — model must not see true distance/implied speed (would leak the rule).
        lat2_obs = lat2_true + rng.normal(0, 0.00055)
        lng2_obs = lng2_true + rng.normal(0, 0.00055)
        dist_obs = haversine_km(lat1, lng1, lat2_obs, lng2_obs)
        implied_kmh_obs = (dist_obs / max(minutes / 60.0, 1e-3)) if minutes > 0 else 0.0
        rows.append(
            {
                "lat1": lat1,
                "lng1": lng1,
                "lat2": lat2_obs,
                "lng2": lng2_obs,
                "elapsed_minutes": minutes,
                "distance_obs_km": dist_obs,
                "implied_speed_kmh_obs": implied_kmh_obs,
                "impossible_travel": label,
            }
        )
    return pd.DataFrame(rows)


def _trigger_label(row: pd.Series, T: dict) -> int:
    """Binary: any single-type trigger fires (simplified composite for ML demo)."""
    heat = int(row["temp_c"] >= T["HEAT_THRESHOLD_C"] and row["heat_hours"] >= T["HEAT_SUSTAINED_HOURS"])
    rain = int(row["rain_mm_h"] >= T["RAIN_THRESHOLD_MM_H"])
    aqi = int(T["AQI_MIN_THRESHOLD"] <= row["aqi"] <= T["AQI_MAX_THRESHOLD"])
    traffic = int(
        row["traffic_confidence"] >= T["TRAFFIC_MIN_CONFIDENCE"]
        and row["traffic_speed_ratio"] < T["TRAFFIC_CONGESTION_RATIO_THRESHOLD"]
    )
    return int(bool(heat or rain or aqi or traffic))


def generate_trigger_tabular_rows(
    n: int = 12000,
    rng: np.random.Generator | None = None,
) -> pd.DataFrame:
    """
    Latent weather/traffic draws → label from true values (Oasis TRIGGERS).
    Model sees **noisy observations** only; otherwise GBM hits ~100% by copying step functions.
    """
    rng = rng or np.random.default_rng(44)
    const = load_constants()
    T = const["TRIGGERS"]
    rows = []
    for _ in range(n):
        temp_true = float(rng.uniform(28, 48))
        heat_hours_true = float(rng.uniform(0, 6))
        rain_true = float(rng.exponential(1.2))
        aqi_true = float(rng.uniform(80, 450))
        traffic_ratio_true = float(rng.uniform(0.15, 1.0))
        traffic_conf_true = float(rng.uniform(0, 1))
        s_true = pd.Series(
            {
                "temp_c": temp_true,
                "heat_hours": heat_hours_true,
                "rain_mm_h": rain_true,
                "aqi": aqi_true,
                "traffic_speed_ratio": traffic_ratio_true,
                "traffic_confidence": traffic_conf_true,
            }
        )
        label = int(_trigger_label(s_true, T))
        # Sensor/API noise: label stays on latent truth; features are what a model would see.
        temp_c = float(temp_true + rng.normal(0, 0.85))
        heat_hours = float(np.clip(heat_hours_true + rng.normal(0, 0.2), 0, 8))
        rain_mm_h = float(max(0.0, rain_true + rng.normal(0, 0.35)))
        aqi = float(np.clip(aqi_true + rng.normal(0, 14), 0, 550))
        traffic_speed_ratio = float(np.clip(traffic_ratio_true + rng.normal(0, 0.05), 0.08, 1.0))
        traffic_confidence = float(np.clip(traffic_conf_true + rng.normal(0, 0.08), 0, 1))
        rows.append(
            {
                "temp_c": temp_c,
                "heat_hours": heat_hours,
                "rain_mm_h": rain_mm_h,
                "aqi": aqi,
                "traffic_speed_ratio": traffic_speed_ratio,
                "traffic_confidence": traffic_confidence,
                "trigger_any": label,
            }
        )
    return pd.DataFrame(rows)


def generate_premium_factor_rows(
    n: int = 8000,
    rng: np.random.Generator | None = None,
) -> pd.DataFrame:
    """
    Synthetic weekly risk features -> target weekly premium INR (bounded like PREMIUM.BASE/MAX).
    DGP loosely mirrors lib/ml/premium-calc.ts multi-factor idea without copying every line.
    """
    rng = rng or np.random.default_rng(45)
    const = load_constants()
    p = const["PREMIUM"]
    base, mx = p["BASE"], p["MAX"]
    rows = []
    for _ in range(n):
        month = int(rng.integers(0, 12))
        seasonal = 0.85 + 0.45 * math.sin((month - 3) * math.pi / 6) ** 2
        hist_events = float(rng.poisson(2.5))
        forecast_risk = float(rng.uniform(0, 1))
        aqi_risk = float(rng.uniform(0, 1))
        social_risk = float(rng.uniform(0, 1))
        deliveries = float(rng.uniform(15, 120))
        # Synthetic premium
        raw = (
            base
            + p["RISK_PER_EVENT"] * hist_events * 0.15
            + p["FORECAST_WEIGHT"] * forecast_risk * 0.08
            + 25 * aqi_risk * 0.1
            + 18 * social_risk * 0.12
            + (deliveries / 120) * 22
        ) * seasonal
        premium = float(np.clip(raw + rng.normal(0, 4), base, mx))
        rows.append(
            {
                "month": month,
                "hist_events_4w": hist_events,
                "forecast_risk": forecast_risk,
                "aqi_risk": aqi_risk,
                "social_risk": social_risk,
                "avg_daily_deliveries": deliveries,
                "weekly_premium_inr": premium,
            }
        )
    return pd.DataFrame(rows)


def write_datasets(out_dir: Path | None = None) -> dict[str, Path]:
    out_dir = out_dir or ROOT / "data" / "synthetic"
    os.makedirs(out_dir, exist_ok=True)
    paths = {}
    df_g = generate_geofence_rows()
    paths["geofence"] = out_dir / "geofence_circle.csv"
    df_g.to_csv(paths["geofence"], index=False)
    df_i = generate_impossible_travel_rows()
    paths["impossible_travel"] = out_dir / "impossible_travel.csv"
    df_i.to_csv(paths["impossible_travel"], index=False)
    df_t = generate_trigger_tabular_rows()
    paths["triggers"] = out_dir / "trigger_tabular.csv"
    df_t.to_csv(paths["triggers"], index=False)
    df_p = generate_premium_factor_rows()
    paths["premium"] = out_dir / "premium_weekly.csv"
    df_p.to_csv(paths["premium"], index=False)
    return paths
