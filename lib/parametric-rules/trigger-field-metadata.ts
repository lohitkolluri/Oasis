import type { TriggersConfig } from '@/lib/config/constants';

export type TriggerFieldKey = keyof TriggersConfig;

export type TriggerFieldMeta = {
  key: TriggerFieldKey;
  label: string;
  description: string;
  unit?: string;
  step?: number;
};

export type TriggerFieldGroup = {
  id: string;
  title: string;
  subtitle: string;
  fields: TriggerFieldMeta[];
};

/** Grouped metadata for interactive threshold editors (labels match DB JSON keys). */
export const TRIGGER_FIELD_GROUPS: TriggerFieldGroup[] = [
  {
    id: 'heat_rain',
    title: 'Heat & precipitation',
    subtitle: 'Open-Meteo / Tomorrow.io weather triggers',
    fields: [
      {
        key: 'HEAT_THRESHOLD_C',
        label: 'Heat threshold',
        description: 'Celsius at or above which heat rules evaluate sustained or instant fire.',
        unit: '°C',
        step: 0.5,
      },
      {
        key: 'HEAT_SUSTAINED_HOURS',
        label: 'Sustained hours',
        description: 'Consecutive hours at/above threshold required for sustained heat trigger.',
        unit: 'h',
        step: 1,
      },
      {
        key: 'RAIN_THRESHOLD_MM_H',
        label: 'Rain intensity',
        description: 'Minimum precipitation rate (mm/h) for heavy rain trigger.',
        unit: 'mm/h',
        step: 0.5,
      },
    ],
  },
  {
    id: 'aqi',
    title: 'AQI adaptive logic',
    subtitle: 'Chronic vs normal zones (p75 / p90 baselines)',
    fields: [
      {
        key: 'AQI_MIN_THRESHOLD',
        label: 'AQI floor (normal)',
        description: 'Lower bound when computing adaptive threshold in non-chronic zones.',
        unit: 'AQI',
        step: 1,
      },
      {
        key: 'AQI_MAX_THRESHOLD',
        label: 'AQI ceiling',
        description: 'Upper cap for any adaptive AQI threshold.',
        unit: 'AQI',
        step: 1,
      },
      {
        key: 'AQI_EXCESS_MULTIPLIER',
        label: 'Normal zone multiplier',
        description: 'p75 × this for spike detection in cleaner cities.',
        step: 0.05,
      },
      {
        key: 'AQI_CHRONIC_P75_FLOOR',
        label: 'Chronic zone p75 floor',
        description: 'If historical p75 ≥ this, treat zone as chronically polluted.',
        unit: 'AQI',
        step: 1,
      },
      {
        key: 'AQI_CHRONIC_MULTIPLIER',
        label: 'Chronic multiplier',
        description: 'p90 × this for chronic zones (tighter bar).',
        step: 0.05,
      },
      {
        key: 'AQI_CHRONIC_MIN_THRESHOLD',
        label: 'Chronic min threshold',
        description: 'Floor for adaptive threshold in chronic zones.',
        unit: 'AQI',
        step: 1,
      },
    ],
  },
  {
    id: 'traffic',
    title: 'Traffic (TomTom)',
    subtitle: 'Flow segment sampling and gridlock detection',
    fields: [
      {
        key: 'TRAFFIC_CONGESTION_RATIO_THRESHOLD',
        label: 'Congestion ratio max',
        description: 'currentSpeed/freeFlowSpeed below this counts as congested.',
        step: 0.05,
      },
      {
        key: 'TRAFFIC_MIN_CONFIDENCE',
        label: 'Min confidence',
        description: 'Ignore segments with TomTom confidence below this (0–1).',
        step: 0.05,
      },
    ],
  },
  {
    id: 'news_llm',
    title: 'News & LLM',
    subtitle: 'NewsData + classifier severity',
    fields: [
      {
        key: 'LLM_SEVERITY_THRESHOLD',
        label: 'LLM severity minimum',
        description: 'Minimum 0–10 severity from classifier to qualify traffic/curfew.',
        step: 1,
      },
    ],
  },
  {
    id: 'zones',
    title: 'Zones & dedupe',
    subtitle: 'Geofences, news radii, duplicate windows',
    fields: [
      {
        key: 'DEFAULT_GEOFENCE_RADIUS_KM',
        label: 'Default geofence',
        description: 'Standard circle radius for weather triggers (km).',
        unit: 'km',
        step: 1,
      },
      {
        key: 'SINGLE_ZONE_RADIUS_KM',
        label: 'Single-zone radius',
        description: 'Hyper-local dark-store style radius (km).',
        unit: 'km',
        step: 0.5,
      },
      {
        key: 'DUPLICATE_EVENT_RADIUS_KM',
        label: 'Duplicate event radius',
        description: 'Same-type events within this distance dedupe within the hour.',
        unit: 'km',
        step: 1,
      },
      {
        key: 'CANDIDATE_DEDUPE_RADIUS_KM',
        label: 'Candidate dedupe radius',
        description: 'In-run dedupe for same subtype across zones (km).',
        unit: 'km',
        step: 1,
      },
      {
        key: 'NEWS_GEOFENCE_RADIUS_KM',
        label: 'News (city) radius',
        description: 'Geofence when LLM returns a city/region (km).',
        unit: 'km',
        step: 1,
      },
      {
        key: 'NEWS_GEOFENCE_RADIUS_KM_COUNTRY',
        label: 'News (country) radius',
        description: 'Fallback radius when zone is country-wide (km).',
        unit: 'km',
        step: 1,
      },
    ],
  },
];

export const EXCLUDABLE_SUBTYPES = [
  { id: 'extreme_heat', label: 'Extreme heat', hint: 'Weather' },
  { id: 'heavy_rain', label: 'Heavy rain', hint: 'Weather' },
  { id: 'severe_aqi', label: 'Severe AQI', hint: 'Weather' },
  { id: 'traffic_gridlock', label: 'Traffic gridlock', hint: 'Traffic / news' },
  { id: 'zone_curfew', label: 'Zone curfew', hint: 'News / social' },
] as const;
