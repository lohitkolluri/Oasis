#!/usr/bin/env python3
"""Generate synthetic CSVs and train baseline sklearn models into ../artifacts/."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, mean_absolute_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from synthetic_data import ROOT, write_datasets

ARTIFACTS = ROOT / "artifacts"
METRICS = ARTIFACTS / "training_metrics.json"


def train_geofence(df: pd.DataFrame) -> tuple[Pipeline, dict]:
    # No dist_km / deltas: those equal the label by construction (leakage).
    features = ["center_lat", "center_lng", "radius_km", "rider_lat", "rider_lng"]
    X = df[features]
    y = df["inside_zone"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    pipe = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("clf", RandomForestClassifier(n_estimators=80, max_depth=10, random_state=42, class_weight="balanced")),
        ]
    )
    cv = cross_val_score(pipe, X, y, cv=5, scoring="accuracy")
    pipe.fit(X_train, y_train)
    pred = pipe.predict(X_test)
    metrics = {
        "task": "geofence_circle",
        "accuracy_holdout": float(accuracy_score(y_test, pred)),
        "cv_accuracy_mean": float(cv.mean()),
        "cv_accuracy_std": float(cv.std()),
        "report": classification_report(y_test, pred, output_dict=True),
    }
    return pipe, metrics


def train_impossible_travel(df: pd.DataFrame) -> tuple[Pipeline, dict]:
    # Label uses true endpoint in generator; only raw fixes + time — no precomputed distance (avoids rule leakage).
    features = ["lat1", "lng1", "lat2", "lng2", "elapsed_minutes"]
    X = df[features]
    y = df["impossible_travel"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    pipe = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("clf", RandomForestClassifier(n_estimators=120, max_depth=12, random_state=42, class_weight="balanced")),
        ]
    )
    cv = cross_val_score(pipe, X, y, cv=5, scoring="accuracy")
    pipe.fit(X_train, y_train)
    pred = pipe.predict(X_test)
    metrics = {
        "task": "impossible_travel",
        "accuracy_holdout": float(accuracy_score(y_test, pred)),
        "cv_accuracy_mean": float(cv.mean()),
        "cv_accuracy_std": float(cv.std()),
        "report": classification_report(y_test, pred, output_dict=True),
    }
    return pipe, metrics


def train_triggers(df: pd.DataFrame) -> tuple[Pipeline, dict]:
    features = [
        "temp_c",
        "heat_hours",
        "rain_mm_h",
        "aqi",
        "traffic_speed_ratio",
        "traffic_confidence",
    ]
    X = df[features]
    y = df["trigger_any"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    pipe = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("clf", GradientBoostingClassifier(random_state=42, max_depth=4, n_estimators=120, learning_rate=0.08)),
        ]
    )
    cv = cross_val_score(pipe, X, y, cv=5, scoring="accuracy")
    pipe.fit(X_train, y_train)
    pred = pipe.predict(X_test)
    metrics = {
        "task": "trigger_tabular",
        "accuracy_holdout": float(accuracy_score(y_test, pred)),
        "cv_accuracy_mean": float(cv.mean()),
        "cv_accuracy_std": float(cv.std()),
        "report": classification_report(y_test, pred, output_dict=True),
    }
    return pipe, metrics


def train_premium(df: pd.DataFrame) -> tuple[Pipeline, dict]:
    features = ["month", "hist_events_4w", "forecast_risk", "aqi_risk", "social_risk", "avg_daily_deliveries"]
    X = df[features]
    y = df["weekly_premium_inr"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    pipe = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("reg", GradientBoostingRegressor(random_state=42, max_depth=4, n_estimators=150, learning_rate=0.06)),
        ]
    )
    cv_r2 = cross_val_score(pipe, X, y, cv=5, scoring="r2")
    pipe.fit(X_train, y_train)
    pred = pipe.predict(X_test)
    metrics = {
        "task": "weekly_premium_inr",
        "r2_holdout": float(r2_score(y_test, pred)),
        "mae_inr_holdout": float(mean_absolute_error(y_test, pred)),
        "cv_r2_mean": float(cv_r2.mean()),
        "cv_r2_std": float(cv_r2.std()),
    }
    return pipe, metrics


def main() -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    paths = write_datasets()
    all_metrics: dict = {
        "datasets": {k: str(v.relative_to(ROOT)) for k, v in paths.items()},
        "methodology": {
            "why_scores_were_near_perfect_before": (
                "Labels were deterministic functions of features in the training CSV "
                "(e.g. dist_km for geofence, exact distance/time for impossible travel, noise-free triggers). "
                "That is label leakage, not proof of a good model."
            ),
            "current_setup": (
                "Geofence: no dist/delta columns. Impossible travel: label from true endpoint; "
                "model sees noisy lat2/lng2 and elapsed only. Triggers: label from latent truth; "
                "model sees noisy observations. Premium unchanged (stochastic DGP). "
                "5-fold CV + 20% holdout for classifiers; 5-fold CV R2 + holdout for premium."
            ),
        },
        "models": {},
    }

    df_g = pd.read_csv(paths["geofence"])
    m_g, met_g = train_geofence(df_g)
    joblib.dump(m_g, ARTIFACTS / "geofence_circle.joblib")
    all_metrics["models"]["geofence_circle"] = met_g

    df_i = pd.read_csv(paths["impossible_travel"])
    m_i, met_i = train_impossible_travel(df_i)
    joblib.dump(m_i, ARTIFACTS / "impossible_travel.joblib")
    all_metrics["models"]["impossible_travel"] = met_i

    df_t = pd.read_csv(paths["triggers"])
    m_t, met_t = train_triggers(df_t)
    joblib.dump(m_t, ARTIFACTS / "trigger_tabular.joblib")
    all_metrics["models"]["trigger_tabular"] = met_t

    df_p = pd.read_csv(paths["premium"])
    m_p, met_p = train_premium(df_p)
    joblib.dump(m_p, ARTIFACTS / "premium_weekly.joblib")
    all_metrics["models"]["premium_weekly"] = met_p

    with open(METRICS, "w", encoding="utf-8") as f:
        json.dump(all_metrics, f, indent=2)
    print("Wrote artifacts to", ARTIFACTS)
    print(json.dumps(all_metrics["models"], indent=2))


if __name__ == "__main__":
    main()
