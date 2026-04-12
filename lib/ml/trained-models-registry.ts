export const OASIS_TRAINED_BASELINES = [
  {
    id: 'geofence_circle' as const,
    artifact: 'geofence_circle.joblib',
    purpose: 'Circle zone membership (rider vs disruption/policy center)',
    productionUses: 'Turf haversine in isWithinCircle()',
    primaryMetric: 'Holdout accuracy 96.06%',
    cvMetric: '5-fold CV accuracy 96.08% ± 0.56%',
  },
  {
    id: 'impossible_travel' as const,
    artifact: 'impossible_travel.joblib',
    purpose: 'Suspect distance vs time between two GPS fixes',
    productionUses: 'FRAUD.IMPOSSIBLE_TRAVEL_* in checkImpossibleTravel()',
    primaryMetric: 'Holdout accuracy 95.80%',
    cvMetric: '5-fold CV accuracy 96.52% ± 1.16%',
  },
  {
    id: 'trigger_tabular' as const,
    artifact: 'trigger_tabular.joblib',
    purpose: 'Weather / AQI / traffic-style trigger firing (shadow mimic)',
    productionUses: 'Versioned TRIGGERS + APIs in adjudicator',
    primaryMetric: 'Holdout accuracy 96.13%',
    cvMetric: '5-fold CV accuracy 96.18% ± 0.36%',
  },
  {
    id: 'premium_weekly' as const,
    artifact: 'premium_weekly.joblib',
    purpose: 'Weekly INR premium from risk features (synthetic DGP)',
    productionUses: 'calculateDynamicPremium() weighted formula',
    primaryMetric: 'Holdout R² 0.908 · MAE ₹3.28',
    cvMetric: '5-fold CV R² 0.904 ± 0.004',
  },
] as const;
