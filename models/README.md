# Machine learning — Oasis `models/`

**Research, training, and reproducibility** package for tabular models aligned with Oasis product constants. Training data is **synthetic** and generated from the same thresholds and zones mirrored in [`oasis_constants.json`](oasis_constants.json) and [`lib/config/constants.ts`](../lib/config/constants.ts).

## Stack layout

| Layer              | Responsibility                                                                                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js app**    | Live parametric stack: Turf geodesics, `FRAUD` / `TRIGGERS`, `calculateDynamicPremium()`. See [`lib/ml/trained-models-registry.ts`](../lib/ml/trained-models-registry.ts). |
| **This directory** | Trained sklearn pipelines (`.joblib`), CSV exports, metrics, and notebooks—trained to mirror the live rules and thresholds above.                                          |

Use this tree for **retraining**, **regression checks**, **documentation**, and **shadow scoring** experiments. Extending to real-world labels or a separate inference service is a normal next step when you add ONNX, a Python sidecar, or hosted batch scoring.

## Trained baselines (current metrics)

Metrics are produced by `scripts/train_all.py` and written to [`artifacts/training_metrics.json`](artifacts/training_metrics.json). After retraining, update the numeric strings in [`lib/ml/trained-models-registry.ts`](../lib/ml/trained-models-registry.ts) if you want the app docs to match.

| Artifact                   | Purpose                                                      | Holdout             | 5-fold CV          |
| -------------------------- | ------------------------------------------------------------ | ------------------- | ------------------ |
| `geofence_circle.joblib`   | Circle zone membership (rider vs disruption / policy center) | Acc 96.06%          | Acc 96.08% ± 0.56% |
| `impossible_travel.joblib` | Suspicious distance vs time between two GPS fixes            | Acc 95.80%          | Acc 96.52% ± 1.16% |
| `trigger_tabular.joblib`   | Weather / AQI / traffic-style composite trigger mimic        | Acc 96.13%          | Acc 96.18% ± 0.36% |
| `premium_weekly.joblib`    | Weekly INR premium from risk features (synthetic DGP)        | R² 0.908, MAE ₹3.28 | R² 0.904 ± 0.004   |

**Live implementations:** `isWithinCircle()` (Turf), `checkImpossibleTravel()`, versioned `TRIGGERS` plus live APIs, `calculateDynamicPremium()`.

## Synthetic data design

Generators live in [`scripts/synthetic_data.py`](scripts/synthetic_data.py).

- **Geofence:** India hub centers, radii from product constants, rider points with GPS-like noise; labels from haversine vs radius. Training features are coordinates and radius only (no precomputed distance column).
- **Impossible travel:** Labels use the true second fix; exported coordinates include observation noise; the model uses raw fixes and elapsed time only.
- **Triggers:** Labels from latent draws evaluated with Oasis threshold rules; feature rows add sensor-style noise so the task is learned from noisy inputs.
- **Premium:** Smooth synthetic DGP with seasonal and risk factors, clipped to `PREMIUM.BASE`–`MAX`.

## Prerequisites

- Python **3.10+** recommended (3.9+ supported).
- [`requirements.txt`](requirements.txt): `numpy`, `pandas`, `scikit-learn`, `joblib`, `jupyter`, `matplotlib`.

## Setup

```bash
cd models
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Train (datasets + models + metrics)

```bash
cd models/scripts
python train_all.py
```

**Outputs**

| Path                              | Contents                                               |
| --------------------------------- | ------------------------------------------------------ |
| `data/synthetic/*.csv`            | Generated training tables                              |
| `artifacts/*.joblib`              | Fitted sklearn `Pipeline` objects                      |
| `artifacts/training_metrics.json` | Per-model holdout metrics, CV summaries, dataset paths |

## Notebooks

Jupyter notebooks under [`notebooks/`](notebooks/) walk through each task. Start Jupyter from `models/` (`jupyter lab`), open a notebook under `notebooks/`, and run cells top to bottom (`Path.parent` resolves to the `models/` root).

## Optional external data (not vendored)

Use these to enrich or replace synthetic marginals when you move toward production-style datasets. They do not provide parametric payout labels.

| Dataset                 | Use case                                                 | Link                                                                                                          |
| ----------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Geolife GPS (Microsoft) | Realistic trajectories; relabel with your geofence rules | [User guide](https://www.microsoft.com/en-us/research/publication/geolife-gps-trajectory-dataset-user-guide/) |
| Open-Meteo              | Weather feature distributions (e.g. India grid cells)    | [open-meteo.com](https://open-meteo.com/)                                                                     |
| Government / open AQI   | Air-quality series (verify license per source)           | Various APIs                                                                                                  |

Shipping only in-repo generators keeps the default workflow **offline** and **license-simple**.

## Artifact index

| File                       | Role                                   |
| -------------------------- | -------------------------------------- |
| `geofence_circle.joblib`   | Random forest — zone inside / outside  |
| `impossible_travel.joblib` | Random forest — impossible travel flag |
| `trigger_tabular.joblib`   | Gradient boosting — any trigger fired  |
| `premium_weekly.joblib`    | Gradient boosting — weekly premium INR |
