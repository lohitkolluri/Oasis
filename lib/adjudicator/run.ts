/**
 * Parametric adjudicator: ingest real APIs (weather, AQI, news), create disruption
 * events, run fraud checks, and auto-pay eligible policyholders.
 * Shared between the cron handler and the admin on-demand endpoint.
 *
 * Improvements:
 *  - Dynamic zone discovery: queries active rider zones instead of hardcoded Bangalore
 *  - Zone clustering: groups riders within ~10 km to avoid duplicate API calls
 *  - Demo mode: accepts a pre-built candidate for admin demo scenarios
 *  - System logging: writes each run result to system_logs table
 *  - AQI threshold: 201 (US EPA "Very Unhealthy")
 *  - Plan cap: enforces max_claims_per_week per plan
 */

import { runAllFraudChecks } from '@/lib/fraud/detector';
import { currentWeekMonday, isWithinCircle } from '@/lib/utils/geo';
import { createClient } from '@supabase/supabase-js';

export interface AdjudicatorResult {
  candidates_found: number;
  claims_created: number;
  zones_checked: number;
  message: string;
}

export interface DemoTriggerOptions {
  eventSubtype: 'extreme_heat' | 'heavy_rain' | 'severe_aqi' | 'traffic_gridlock' | 'zone_curfew';
  lat: number;
  lng: number;
  radiusKm?: number;
  severity?: number;
}

interface TriggerCandidate {
  type: 'weather' | 'traffic' | 'social';
  severity: number;
  geofence?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

/** Round to 1 decimal (~11 km grid) to cluster nearby zones */
function clusterKey(lat: number, lng: number): string {
  return `${Math.round(lat * 10) / 10},${Math.round(lng * 10) / 10}`;
}

/** Get distinct active zone clusters from profiles with active policies this week */
async function getActiveZones(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<Array<{ lat: number; lng: number }>> {
  const today = new Date().toISOString().split('T')[0];

  const { data: activePolicies } = await supabase
    .from('weekly_policies')
    .select('profile_id')
    .eq('is_active', true)
    .lte('week_start_date', today)
    .gte('week_end_date', today);

  if (!activePolicies || activePolicies.length === 0) {
    return [{ lat: 12.9716, lng: 77.5946 }]; // Default Bangalore
  }

  const profileIds = [
    ...new Set((activePolicies as Array<{ profile_id: string }>).map((p) => p.profile_id)),
  ];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('zone_latitude, zone_longitude')
    .in('id', profileIds)
    .not('zone_latitude', 'is', null)
    .not('zone_longitude', 'is', null);

  if (!profiles || profiles.length === 0) {
    return [{ lat: 12.9716, lng: 77.5946 }];
  }

  // Deduplicate by ~10 km grid cell
  const seen = new Map<string, { lat: number; lng: number }>();
  for (const p of profiles as Array<{ zone_latitude: number; zone_longitude: number }>) {
    if (p.zone_latitude == null || p.zone_longitude == null) continue;
    const key = clusterKey(p.zone_latitude, p.zone_longitude);
    if (!seen.has(key)) {
      seen.set(key, { lat: p.zone_latitude, lng: p.zone_longitude });
    }
  }

  return seen.size > 0 ? Array.from(seen.values()) : [{ lat: 12.9716, lng: 77.5946 }];
}

/**
 * Fetch current AQI for a coordinate.
 * 1. WAQI ground-station API (most accurate, uses nearest monitoring station)
 * 2. Open-Meteo satellite-based (free fallback, no key required)
 */
async function fetchCurrentAqi(
  lat: number,
  lng: number,
  waqiKey: string | undefined,
): Promise<number> {
  if (waqiKey) {
    try {
      const res = await fetch(`https://api.waqi.info/feed/geo:${lat};${lng}/?token=${waqiKey}`);
      if (res.ok) {
        const data = (await res.json()) as { status?: string; data?: { aqi?: number | string } };
        if (data.status === 'ok' && data.data?.aqi != null) {
          const aqi = Number(data.data.aqi);
          if (!isNaN(aqi) && aqi >= 0) return aqi;
        }
      }
    } catch {
      // Fall through to Open-Meteo
    }
  }
  // Fallback: Open-Meteo satellite AQI (no key required)
  try {
    const res = await fetch(
      `https://air-quality.api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi&hourly=us_aqi`,
    );
    if (res.ok) {
      const data = (await res.json()) as {
        current?: { us_aqi?: number | null };
        hourly?: { us_aqi?: (number | null)[] };
      };
      const aqi = data.current?.us_aqi ?? (data.hourly?.us_aqi ?? []).find((v) => v != null) ?? 0;
      return Number(aqi);
    }
  } catch {
    // Skip
  }
  return 0;
}

/** Run all trigger checks for a single geographic zone */
async function checkZoneTriggers(
  zone: { lat: number; lng: number },
  tomorrowKey: string | undefined,
  openRouterKey: string | undefined,
  newsDataKey: string | undefined,
  waqiKey: string | undefined,
): Promise<TriggerCandidate[]> {
  const { lat, lng } = zone;
  const candidates: TriggerCandidate[] = [];

  // ── 1. Extreme heat (Open-Meteo forecast → Tomorrow.io fallback) ─────────
  let heatSustained3h = false;
  let heatRawData: Record<string, unknown> = {};
  let precip = 0;
  let precipRawData: Record<string, unknown> = {};

  try {
    const forecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m&past_hours=24&forecast_hours=0&timeformat=iso8601`,
    );
    if (forecastRes.ok) {
      const forecast = (await forecastRes.json()) as {
        hourly?: { time?: string[]; temperature_2m?: (number | null)[] };
      };
      const times = forecast.hourly?.time ?? [];
      const temps = forecast.hourly?.temperature_2m ?? [];
      const now = new Date();
      const last3: number[] = [];
      for (let i = times.length - 1; i >= 0 && last3.length < 3; i--) {
        const t = new Date(times[i]);
        if (t <= now) {
          const v = temps[i];
          if (v != null && typeof v === 'number') last3.push(v);
        }
      }
      if (last3.length >= 3 && last3.every((v) => v >= 43)) {
        heatSustained3h = true;
        heatRawData = { ...forecast, trigger: 'extreme_heat', source: 'openmeteo_forecast' };
      }
    }
  } catch {
    // Fall through to Tomorrow.io
  }

  if (!heatSustained3h && tomorrowKey) {
    try {
      const [res, forecastRes] = await Promise.all([
        fetch(
          `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&apikey=${tomorrowKey}`,
        ),
        fetch(
          `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lng}&timesteps=1h&apikey=${tomorrowKey}`,
        ),
      ]);
      if (res.ok) {
        const data = (await res.json()) as {
          data?: { values?: { temperature?: number; precipitationIntensity?: number } };
        };
        heatRawData = data;
        precipRawData = data;
        const vals = data.data?.values ?? {};
        const temp = vals.temperature ?? 0;
        precip = vals.precipitationIntensity ?? 0;

        if (temp >= 43 && forecastRes.ok) {
          try {
            const f = (await forecastRes.json()) as {
              timelines?: { hourly?: Array<{ values?: { temperature?: number } }> };
            };
            const hourly = f.timelines?.hourly ?? [];
            let streak = 0;
            for (const interval of hourly) {
              const t = interval.values?.temperature ?? 0;
              streak = t >= 43 ? streak + 1 : 0;
              if (streak >= 3) break;
            }
            heatSustained3h = streak >= 3;
          } catch {
            heatSustained3h = temp >= 43;
          }
        }
      }
    } catch {
      // Skip
    }
  }

  if (heatSustained3h) {
    candidates.push({
      type: 'weather',
      severity: 8,
      geofence: { type: 'circle', lat, lng, radius_km: 15 },
      raw: { ...heatRawData, trigger: 'extreme_heat' },
    });
  }

  if (tomorrowKey && precip >= 4) {
    candidates.push({
      type: 'weather',
      severity: 7,
      geofence: { type: 'circle', lat, lng, radius_km: 15 },
      raw: { ...precipRawData, trigger: 'heavy_rain' },
    });
  }

  // ── 2. AQI — Adaptive threshold (WAQI primary + Open-Meteo fallback) ───
  //
  //  Current reading: WAQI ground-station API (nearest monitoring station,
  //  most accurate for city-level AQI) → Open-Meteo satellite as fallback.
  //
  //  Historical baseline: Open-Meteo 30-day hourly (WAQI free tier has no
  //  historical endpoint). Compare today against the zone's own p75 baseline
  //  so Delhi (baseline ~250) and Bangalore (baseline ~60) both get fair
  //  adaptive thresholds.
  //
  //  Algorithm:
  //    1. Fetch current AQI via WAQI (or Open-Meteo fallback)
  //    2. Fetch 30-day hourly AQI from Open-Meteo for baseline
  //    3. Adaptive threshold = max(150, p75 × 1.40)  [40% above normal]
  //    4. Cap at 400 (WHO hazardous) so cities never become immune
  //    5. Trigger if current AQI ≥ adaptive threshold
  //    6. Severity scales with excess ratio (worse = higher)
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Fetch current AQI (WAQI ground-station preferred) and historical baseline in parallel
    const [currentAqi, historicalRes] = await Promise.all([
      fetchCurrentAqi(lat, lng, waqiKey),
      fetch(
        `https://air-quality.api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=us_aqi&start_date=${startDate}&end_date=${endDate}`,
      ),
    ]);

    if (historicalRes.ok) {
      const historical = (await historicalRes.json()) as {
        hourly?: { us_aqi?: (number | null)[] };
      };

      const historicalValues = (historical.hourly?.us_aqi ?? []).filter(
        (v): v is number => v != null && v > 0,
      );

      let adaptiveThreshold = 201; // safe fallback
      let baseline75 = 0;
      let baselineMean = 0;

      if (historicalValues.length >= 48) {
        const sorted = [...historicalValues].sort((a, b) => a - b);
        baseline75 = sorted[Math.floor(sorted.length * 0.75)];
        baselineMean = Math.round(
          historicalValues.reduce((s, v) => s + v, 0) / historicalValues.length,
        );
        adaptiveThreshold = Math.min(400, Math.max(150, Math.round(baseline75 * 1.4)));
      }

      if (currentAqi >= adaptiveThreshold) {
        const excessRatio = baseline75 > 0 ? (currentAqi - baseline75) / baseline75 : 0;
        const severity = Math.min(10, Math.max(6, Math.round(6 + excessRatio * 8)));

        candidates.push({
          type: 'weather',
          severity,
          geofence: { type: 'circle', lat, lng, radius_km: 15 },
          raw: {
            trigger: 'severe_aqi',
            current_aqi: currentAqi,
            adaptive_threshold: adaptiveThreshold,
            baseline_p75: baseline75,
            baseline_mean: baselineMean,
            historical_days: Math.round(historicalValues.length / 24),
            excess_percent: Math.round(((currentAqi - baseline75) / Math.max(1, baseline75)) * 100),
            source: waqiKey ? 'waqi_ground_station' : 'openmeteo_satellite',
          },
        });
      }
    }
  } catch {
    // Skip AQI check on API failure
  }

  // ── 3. Traffic gridlock (NewsData + LLM) — checked once per adjudicator run
  // News is global/India-wide so we only need one zone to check it
  if (newsDataKey && openRouterKey) {
    try {
      const trafficRes = await fetch(
        `https://newsdata.io/api/1/news?apikey=${newsDataKey}&q=traffic%20OR%20gridlock%20OR%20road%20closure%20OR%20congestion&country=in&language=en&limit=3`,
      );
      if (trafficRes.ok) {
        const trafficData = (await trafficRes.json()) as {
          results?: Array<{ title?: string }>;
        };
        const trafficArticles = trafficData.results ?? [];
        if (trafficArticles.length > 0) {
          const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openRouterKey}`,
            },
            body: JSON.stringify({
              model: 'arcee-ai/trinity-large-preview:free:free',
              messages: [
                {
                  role: 'user',
                  content: `Do any of these headlines indicate severe traffic gridlock or road closures affecting delivery work in India? Reply JSON only: {"qualifies":true/false,"severity":0-10}. Headlines: ${trafficArticles.map((a) => a.title).join('; ')}`,
                },
              ],
            }),
          });
          if (llmRes.ok) {
            const llmData = (await llmRes.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            const content = llmData.choices?.[0]?.message?.content ?? '{}';
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]) as {
                  qualifies?: boolean;
                  severity?: number;
                };
                if (parsed.qualifies && (parsed.severity ?? 0) >= 6) {
                  candidates.push({
                    type: 'traffic',
                    severity: parsed.severity ?? 7,
                    geofence: { type: 'circle', lat, lng, radius_km: 20 },
                    raw: {
                      articles: trafficArticles,
                      llm: parsed,
                      trigger: 'traffic_gridlock',
                    },
                  });
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      }
    } catch {
      // Skip
    }

    // ── 4. Zone curfew / strike / lockdown (NewsData + LLM + geocoding) ────
    try {
      const newsRes = await fetch(
        `https://newsdata.io/api/1/news?apikey=${newsDataKey}&q=curfew%20OR%20strike%20OR%20lockdown&country=in&language=en&limit=3`,
      );
      if (newsRes.ok) {
        const newsData = (await newsRes.json()) as { results?: Array<{ title?: string }> };
        const articles = newsData.results ?? [];
        if (articles.length > 0) {
          const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openRouterKey}`,
            },
            body: JSON.stringify({
              model: 'arcee-ai/trinity-large-preview:free:free',
              messages: [
                {
                  role: 'user',
                  content: `Do any of these headlines indicate a zone lockdown/curfew/strike preventing delivery work in India? Reply JSON only: {"qualifies":true/false,"severity":0-10,"zone":"city or region name if identifiable, else empty string"}. Headlines: ${articles.map((a) => a.title).join('; ')}`,
                },
              ],
            }),
          });
          if (llmRes.ok) {
            const llmData = (await llmRes.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
            };
            const content = llmData.choices?.[0]?.message?.content ?? '{}';
            const match = content.match(/\{[\s\S]*\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]) as {
                  qualifies?: boolean;
                  severity?: number;
                  zone?: string;
                };
                if (parsed.qualifies && (parsed.severity ?? 0) >= 6) {
                  const zone = typeof parsed.zone === 'string' ? parsed.zone.trim() : '';
                  const toGeocode = zone || 'India';
                  let geofence: Record<string, unknown> = {};
                  try {
                    const geoRes = await fetch(
                      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(toGeocode)}&count=1`,
                    );
                    if (geoRes.ok) {
                      const geo = (await geoRes.json()) as {
                        results?: Array<{ latitude: number; longitude: number }>;
                      };
                      if (geo.results?.[0]) {
                        geofence = {
                          type: 'circle',
                          lat: geo.results[0].latitude,
                          lng: geo.results[0].longitude,
                          radius_km: zone ? 20 : 50,
                        };
                      }
                    }
                  } catch {
                    // Fallback to zone's own coordinates
                    geofence = { type: 'circle', lat, lng, radius_km: 20 };
                  }
                  if (geofence.lat != null && geofence.lng != null) {
                    candidates.push({
                      type: 'social',
                      severity: parsed.severity ?? 7,
                      geofence,
                      raw: { articles, llm: parsed },
                    });
                  }
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      }
    } catch {
      // Skip
    }
  }

  return candidates;
}

/** Log adjudicator run to system_logs table */
async function logRun(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  result: AdjudicatorResult & { duration_ms: number; error?: string; is_demo?: boolean },
) {
  try {
    await supabase.from('system_logs').insert({
      event_type: result.is_demo ? 'adjudicator_demo' : 'adjudicator_run',
      metadata: {
        candidates_found: result.candidates_found,
        claims_created: result.claims_created,
        zones_checked: result.zones_checked,
        duration_ms: result.duration_ms,
        error: result.error ?? null,
      },
    });
  } catch {
    // Log table may not exist yet; ignore
  }
}

export async function runAdjudicator(demoTrigger?: DemoTriggerOptions): Promise<AdjudicatorResult> {
  const startMs = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase not configured');

  // Use `any` cast to avoid DB-type conflicts when system_logs isn't in generated types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient(supabaseUrl, supabaseKey) as any;
  const tomorrowKey = process.env.TOMORROW_IO_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const newsDataKey = process.env.NEWSDATA_IO_API_KEY;
  const waqiKey = process.env.WAQI_API_KEY;

  let allCandidates: TriggerCandidate[] = [];
  let zonesChecked = 0;

  if (demoTrigger) {
    // Demo mode: inject a synthetic event directly
    const typeMap: Record<string, 'weather' | 'traffic' | 'social'> = {
      extreme_heat: 'weather',
      heavy_rain: 'weather',
      severe_aqi: 'weather',
      traffic_gridlock: 'traffic',
      zone_curfew: 'social',
    };
    allCandidates = [
      {
        type: typeMap[demoTrigger.eventSubtype] ?? 'weather',
        severity: demoTrigger.severity ?? 8,
        geofence: {
          type: 'circle',
          lat: demoTrigger.lat,
          lng: demoTrigger.lng,
          radius_km: demoTrigger.radiusKm ?? 15,
        },
        raw: {
          trigger: demoTrigger.eventSubtype,
          demo: true,
          source: 'admin_demo_mode',
        },
      },
    ];
    zonesChecked = 1;
  } else {
    // Production mode: discover zones from active riders
    const zones = await getActiveZones(supabase);
    zonesChecked = zones.length;

    // Check triggers for all zones in parallel (up to 5 at a time)
    const BATCH = 5;
    for (let i = 0; i < zones.length; i += BATCH) {
      const batch = zones.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map((z) => checkZoneTriggers(z, tomorrowKey, openRouterKey, newsDataKey, waqiKey)),
      );
      // Deduplicate: if same trigger type already in candidates from a previous zone, skip
      for (const zoneCandidates of results) {
        for (const c of zoneCandidates) {
          const geofenceLat = (c.geofence as { lat?: number } | undefined)?.lat;
          const geofenceLng = (c.geofence as { lng?: number } | undefined)?.lng;
          const rawTrigger = c.raw.trigger as string | undefined;
          const isDuplicate = allCandidates.some((existing) => {
            const existingLat = (existing.geofence as { lat?: number } | undefined)?.lat;
            const existingLng = (existing.geofence as { lng?: number } | undefined)?.lng;
            const existingTrigger = existing.raw.trigger as string | undefined;
            return (
              existingTrigger === rawTrigger &&
              existingLat != null &&
              existingLng != null &&
              geofenceLat != null &&
              geofenceLng != null &&
              isWithinCircle(existingLat, existingLng, geofenceLat, geofenceLng, 30)
            );
          });
          if (!isDuplicate) allCandidates.push(c);
        }
      }
    }
  }

  // ── Process each candidate: insert event, find eligible policies, pay ───
  let claimsCreated = 0;
  const today = new Date().toISOString().split('T')[0];

  for (const candidate of allCandidates) {
    const { data: event, error: eventErr } = await supabase
      .from('live_disruption_events')
      .insert({
        event_type: candidate.type,
        severity_score: candidate.severity,
        geofence_polygon: candidate.geofence ?? {},
        verified_by_llm: candidate.type === 'social',
        raw_api_data: candidate.raw,
      })
      .select('id')
      .single();

    if (eventErr || !event?.id) continue;

    const geofence = candidate.geofence as
      | { type?: string; lat?: number; lng?: number; radius_km?: number }
      | undefined;
    const eventLat = geofence?.lat ?? 12.9716;
    const eventLng = geofence?.lng ?? 77.5946;
    const radiusKm = geofence?.radius_km ?? 15;

    const { data: policies } = await supabase
      .from('weekly_policies')
      .select('id, profile_id, plan_id, plan_packages(payout_per_claim_inr, max_claims_per_week)')
      .eq('is_active', true)
      .lte('week_start_date', today)
      .gte('week_end_date', today);

    const weekStart = currentWeekMonday().toISOString();

    for (const policy of policies ?? []) {
      const plan = policy.plan_packages as {
        payout_per_claim_inr?: number;
        max_claims_per_week?: number;
      } | null;
      const payoutAmount =
        plan?.payout_per_claim_inr != null ? Number(plan.payout_per_claim_inr) : 400;
      const maxClaimsPerWeek = plan?.max_claims_per_week ?? 3;

      const { data: profile } = await supabase
        .from('profiles')
        .select('zone_latitude, zone_longitude')
        .eq('id', policy.profile_id)
        .single();

      const pLat = profile?.zone_latitude;
      const pLng = profile?.zone_longitude;
      if (pLat != null && pLng != null) {
        if (!isWithinCircle(pLat, pLng, eventLat, eventLng, radiusKm)) continue;
      }

      const { count: weekClaimCount } = await supabase
        .from('parametric_claims')
        .select('id', { count: 'exact', head: true })
        .eq('policy_id', policy.id)
        .gte('created_at', weekStart);
      if ((weekClaimCount ?? 0) >= maxClaimsPerWeek) continue;

      const { isFlagged } = await runAllFraudChecks(
        supabase,
        policy.id,
        event.id,
        candidate.type === 'weather' ? candidate.raw : undefined,
      );
      if (isFlagged) continue;

      const txId = `oasis_payout_${Date.now()}_${policy.id.slice(0, 8)}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;

      const { error: claimErr } = await supabase.from('parametric_claims').insert({
        policy_id: policy.id,
        disruption_event_id: event.id,
        payout_amount_inr: payoutAmount,
        status: 'paid',
        gateway_transaction_id: txId,
        is_flagged: false,
      });
      if (!claimErr) claimsCreated++;
    }
  }

  const result: AdjudicatorResult = {
    message: demoTrigger ? 'Demo adjudicator run complete' : 'Adjudicator run complete',
    candidates_found: allCandidates.length,
    claims_created: claimsCreated,
    zones_checked: zonesChecked,
  };

  await logRun(supabase, {
    ...result,
    duration_ms: Date.now() - startMs,
    is_demo: !!demoTrigger,
  });

  return result;
}
