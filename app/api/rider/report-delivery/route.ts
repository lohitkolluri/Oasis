/**
 * Rider self-report: "I can't deliver" when disruption wasn't detected.
 * Requires a live photo (camera only). LLM verifies; on success we create claim + payout.
 * GPS / zone data only accepted from mobile user-agents for precise location.
 * POST /api/rider/report-delivery
 */
import { createClaimFromTrigger } from '@/lib/claims/engine';
import { callOpenRouterChat } from '@/lib/clients/openrouter';
import {
  DEFAULT_ZONE,
  EXTERNAL_APIS,
  FRAUD,
  PAYOUT_FALLBACK_INR,
  TRIGGERS,
} from '@/lib/config/constants';
import { getOpenRouterApiKey, getTomorrowApiKey, getTomTomApiKey } from '@/lib/config/env';
import { checkRapidClaims } from '@/lib/fraud/detector';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { toDateString } from '@/lib/utils/date';
import { isMobileForGps } from '@/lib/utils/device';
import { currentWeekMonday } from '@/lib/utils/geo';
import { fetchWithRetry } from '@/lib/utils/retry';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BUCKET = 'rider-reports';
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VISION_MODEL = 'mistralai/mistral-small-3.1-24b-instruct:free';

// Simple in-memory cooldowns so we don't hammer external APIs once they start
// returning rate limits. This is per server instance and resets on deploy.
let tomorrowRateLimitedUntilMs: number | null = null;
let tomtomRateLimitedUntilMs: number | null = null;

/**
 * Cross-check a self-report against real-time weather and traffic data.
 * Returns { corroborated, details } — if external data clearly contradicts the
 * report, corroborated is false.
 */
async function corroborateSelfReport(
  lat: number,
  lng: number,
): Promise<{ corroborated: boolean; details: Record<string, unknown> }> {
  const details: Record<string, unknown> = {};
  let weatherSevere = false;
  let trafficSevere = false;

  // Check weather at report location
  const tomorrowKey = getTomorrowApiKey();
  if (tomorrowKey && (!tomorrowRateLimitedUntilMs || Date.now() > tomorrowRateLimitedUntilMs)) {
    try {
      const weatherData = await fetchWithRetry<{
        data?: { values?: { temperature?: number; precipitationIntensity?: number } };
      }>(
        `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&apikey=${tomorrowKey}`,
        undefined,
        { cacheTtlMs: EXTERNAL_APIS.CACHE_WEATHER_TTL_MS },
      );
      const vals = weatherData.data?.values;
      details.temperature = vals?.temperature;
      details.precipitation = vals?.precipitationIntensity;
      if (
        (vals?.temperature != null && vals.temperature >= TRIGGERS.HEAT_THRESHOLD_C) ||
        (vals?.precipitationIntensity != null &&
          vals.precipitationIntensity >= TRIGGERS.RAIN_THRESHOLD_MM_H)
      ) {
        weatherSevere = true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('Corroboration: weather check failed:', message);
      // If Tomorrow.io is rate limiting us, back off for a few minutes instead of
      // repeatedly hitting the API on every self-report.
      if (message.includes('HTTP 429')) {
        tomorrowRateLimitedUntilMs = Date.now() + 5 * 60 * 1000;
      }
    }
  }

  // Check traffic at report location
  const tomtomKey = getTomTomApiKey();
  if (tomtomKey && (!tomtomRateLimitedUntilMs || Date.now() > tomtomRateLimitedUntilMs)) {
    try {
      const trafficData = await fetchWithRetry<{
        flowSegmentData?: { currentSpeed?: number; freeFlowSpeed?: number; roadClosure?: boolean };
      }>(
        `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${encodeURIComponent(tomtomKey)}&point=${lat},${lng}&unit=kmph`,
        undefined,
        { cacheTtlMs: EXTERNAL_APIS.CACHE_TRAFFIC_TTL_MS },
      );
      const seg = trafficData.flowSegmentData;
      details.currentSpeed = seg?.currentSpeed;
      details.freeFlowSpeed = seg?.freeFlowSpeed;
      details.roadClosure = seg?.roadClosure;
      if (seg?.roadClosure) {
        trafficSevere = true;
      } else if (
        seg?.currentSpeed != null &&
        seg?.freeFlowSpeed != null &&
        seg.freeFlowSpeed > 0 &&
        seg.currentSpeed / seg.freeFlowSpeed < TRIGGERS.TRAFFIC_CONGESTION_RATIO_THRESHOLD
      ) {
        trafficSevere = true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('Corroboration: traffic check failed:', message);
      if (message.includes('HTTP 429')) {
        tomtomRateLimitedUntilMs = Date.now() + 5 * 60 * 1000;
      }
    }
  }

  details.weather_severe = weatherSevere;
  details.traffic_severe = trafficSevere;

  // Corroborated if at least one external source shows disruption,
  // or if we couldn't reach any source (benefit of doubt)
  const hasAnyData = details.temperature != null || details.currentSpeed != null;
  const corroborated = !hasAnyData || weatherSevere || trafficSevere;
  return { corroborated, details };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userAgent = request.headers.get('user-agent') ?? '';
  if (!isMobileForGps(userAgent)) {
    return NextResponse.json(
      { error: 'Use a mobile device for precise location when reporting delivery issues.' },
      { status: 403 },
    );
  }

  // Per-rider rate limit: max N self-reports per 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentReportCount } = await supabase
    .from('rider_delivery_reports')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .gte('created_at', twentyFourHoursAgo);

  if ((recentReportCount ?? 0) >= FRAUD.SELF_REPORT_DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `Daily report limit reached (max ${FRAUD.SELF_REPORT_DAILY_LIMIT} reports per 24 hours).`,
      },
      { status: 429 },
    );
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Multipart form with photo required' }, { status: 400 });
  }

  const formData = await request.formData();
  const type = (formData.get('type') as string) ?? null;
  const categoryRaw = (formData.get('category') as string | null) ?? null;
  const message = (formData.get('message') as string)?.trim() ?? null;
  const photo = formData.get('photo') as File | null;
  const gpsLatRaw = formData.get('gps_lat');
  const gpsLngRaw = formData.get('gps_lng');
  const gpsLat = gpsLatRaw != null ? Number(gpsLatRaw) : null;
  const gpsLng = gpsLngRaw != null ? Number(gpsLngRaw) : null;

  if (!type || type !== 'cant_deliver') {
    return NextResponse.json({ error: "Invalid type. Use 'cant_deliver'" }, { status: 400 });
  }

  type SelfReportCategory = 'bad_weather' | 'traffic' | 'curfew' | 'unsafe_crowd' | 'other';
  const allowedCategories: SelfReportCategory[] = [
    'bad_weather',
    'traffic',
    'curfew',
    'unsafe_crowd',
    'other',
  ];
  const category: SelfReportCategory = allowedCategories.includes(categoryRaw as SelfReportCategory)
    ? (categoryRaw as SelfReportCategory)
    : 'other';

  if (!photo || photo.size === 0) {
    return NextResponse.json({ error: 'Live photo is required (camera only).' }, { status: 400 });
  }

  if (!message || message.length < 10) {
    return NextResponse.json(
      { error: 'Add a short description with enough detail for strict AI review.' },
      { status: 400 },
    );
  }

  if (photo.size > MAX_PHOTO_SIZE) {
    return NextResponse.json({ error: 'Photo must be under 5MB' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(photo.type)) {
    return NextResponse.json({ error: 'Photo must be JPEG, PNG, or WebP' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('zone_latitude, zone_longitude')
    .eq('id', user.id)
    .single();

  const zoneLat =
    gpsLat != null && Number.isFinite(gpsLat)
      ? gpsLat
      : profile?.zone_latitude != null
        ? Number(profile.zone_latitude)
        : null;
  const zoneLng =
    gpsLng != null && Number.isFinite(gpsLng)
      ? gpsLng
      : profile?.zone_longitude != null
        ? Number(profile.zone_longitude)
        : null;

  const admin = createAdminClient();
  const photoBuf = await photo.arrayBuffer();

  // Upload photo to storage
  let photoUrl: string | null = null;
  try {
    const ext = photo.name.split('.').pop() ?? 'jpg';
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await admin.storage.from(BUCKET).upload(path, photoBuf, {
      contentType: photo.type,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    photoUrl = path;
  } catch (err) {
    console.error('Report photo upload error:', err);
    return NextResponse.json(
      { error: 'Failed to upload photo. Ensure rider-reports bucket exists.' },
      { status: 500 },
    );
  }

  // Save report row
  const { data: reportRow, error: reportErr } = await supabase
    .from('rider_delivery_reports')
    .insert({
      profile_id: user.id,
      zone_lat: zoneLat,
      zone_lng: zoneLng,
      report_type: 'cant_deliver',
      message: message || null,
      photo_url: photoUrl,
    })
    .select('id, created_at')
    .single();

  if (reportErr) {
    return NextResponse.json({ error: reportErr.message }, { status: 500 });
  }

  // LLM verification: genuine disruption + live photo (no screenshot/upload)
  const openRouterKey = getOpenRouterApiKey();
  let verified = false;
  let verifyReason = '';
  let llmAvailable = false;

  if (openRouterKey) {
    try {
      const base64 = Buffer.from(photoBuf).toString('base64');
      const dataUrl = `data:${photo.type};base64,${base64}`;

      const data = await callOpenRouterChat({
        model: VISION_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You verify rider delivery disruption reports for a parametric income-protection product. Reply ONLY with valid JSON: {"verified": true or false, "reason": "brief explanation"}. Be EXTREMELY strict. Approve ONLY when the image AND rider note clearly show a real, current delivery-blocking disruption such as severe weather, flooded roads, obvious road blockades, curfew enforcement on streets, protests blocking roads, or unsafe outdoor crowd conditions.\n\nIf the scene appears even partially INDOOR (doors, sofas, interior walls, ceilings, furniture) or does not clearly show an outdoor road/streetscape or visible environmental conditions (rain, flood water, barricades, crowds on the road), you MUST set "verified": false. Reject screenshots, downloaded images, normal/slow traffic, low-light ambiguity, indoor photos, unrelated selfies, staged scenes, accidents, health issues, vehicle repair issues, or anything that does not clearly prove a covered disruption in an outdoor public delivery context.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Rider says: "${message || 'Delivery disrupted in my zone.'}"

Category selected: "${category}".

Rules: Set verified true ONLY if (1) the image clearly shows an OUTDOOR scene on or near a road/streetscape, (2) there is a plausible real-world disruption that blocks deliveries (e.g. flooded road, road completely blocked, visible curfew enforcement, protest blocking the street), (3) it looks like a genuine live camera photo captured on scene (not a screenshot or stock image), and (4) the text description is consistent with the image and the selected category. If the scene looks like a room/indoor environment (door, sofa, interior wall, furniture) or you cannot confidently see a covered disruption, you MUST set verified false. Reply ONLY with JSON: {"verified": true/false, "reason": "..."}`,
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 256,
      });

      llmAvailable = true;
      const content = data.choices?.[0]?.message?.content ?? '';
      const match = content.match(/\{[\s\S]*?\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]) as { verified?: boolean; reason?: string };
          verified = parsed.verified === true;
          verifyReason = parsed.reason ?? '';
        } catch (parseErr) {
          console.error('LLM verify JSON parse error:', parseErr, 'content:', content);
          verifyReason =
            'Verification model returned an unexpected response. Please try again with a clearer photo.';
        }
      } else {
        console.error('LLM verify: no JSON object in content', content);
        verifyReason =
          'Verification model did not return a structured decision. Please try again with a clearer photo.';
      }
    } catch (e) {
      console.error('LLM verify error via OpenRouter:', e);
      const message = e instanceof Error ? e.message : String(e);
      if (message.startsWith('HTTP')) {
        verifyReason = 'Verification provider returned an error. Please try again later.';
      } else {
        verifyReason = 'Verification request failed. Please check your connection and try again.';
      }
    }
  }

  // If the AI verifier is unavailable or the provider is rate-limiting us,
  // enqueue this report for deferred verification via pgmq instead of making
  // a hard decision immediately. Riders still see a clear status, and a
  // background worker can re-run the checks later.
  if (!llmAvailable) {
    try {
      const payload = {
        report_id: reportRow.id,
        profile_id: user.id,
        photo_path: photoUrl,
        zone_lat: zoneLat,
        zone_lng: zoneLng,
        category,
        message,
      };

      await admin
        .from('rider_delivery_reports')
        .update({ verification_status: 'queued' })
        .eq('id', reportRow.id);

      await admin.rpc('pgmq_send_self_report_verification', {
        msg: payload,
      });
    } catch (err) {
      console.error('Failed to enqueue self-report verification job:', err);
    }

    return NextResponse.json({
      id: reportRow.id,
      created_at: reportRow.created_at,
      verified: false,
      reason:
        verifyReason ||
        'Verification is temporarily queued due to provider limits. We will process your report shortly.',
      claim_created: false,
      claim_accepted: false,
      fraud_blocked: false,
      payout_initiated: false,
      queued: true,
    });
  }

  // Cross-check self-report against real weather/traffic data at report GPS
  let corroborationResult: { corroborated: boolean; details: Record<string, unknown> } | null =
    null;
  if (zoneLat != null && zoneLng != null) {
    corroborationResult = await corroborateSelfReport(zoneLat, zoneLng);
  }

  if (verified && corroborationResult && !corroborationResult.corroborated) {
    verified = false;
    verifyReason = 'External data contradicts report: no severe weather or traffic at location.';
  }

  // If the vision model was unavailable or failed, do NOT auto-approve based on corroboration alone.
  // Require a successful AI vision verdict for any self-report based claim.
  if (!llmAvailable) {
    verified = false;
    if (!verifyReason) {
      verifyReason =
        'AI verification unavailable or failed. Report could not be safely verified for an eligible disruption.';
    }
  }

  let claim_created = false;
  let claim_accepted = false;
  let fraud_blocked = false;
  let payout_initiated = false;

  if (verified) {
    const today = toDateString(new Date());
    const weekStart = currentWeekMonday().toISOString();

    // Get rider's active policy for current week
    const { data: policyRow } = await admin
      .from('weekly_policies')
      .select('id, profile_id, plan_id, plan_packages(payout_per_claim_inr, max_claims_per_week)')
      .eq('profile_id', user.id)
      .eq('is_active', true)
      .lte('week_start_date', today)
      .gte('week_end_date', today)
      .single();

    if (policyRow) {
      const plan = policyRow.plan_packages as {
        payout_per_claim_inr?: number;
        max_claims_per_week?: number;
      } | null;
      const payoutAmount =
        plan?.payout_per_claim_inr != null
          ? Number(plan.payout_per_claim_inr)
          : PAYOUT_FALLBACK_INR;
      const maxClaims = plan?.max_claims_per_week ?? 3;

      // Fraud check: rapid claims detection (blocks if 5+ claims in 24h)
      const rapidCheck = await checkRapidClaims(admin, policyRow.id);
      if (rapidCheck.isFlagged) {
        fraud_blocked = true;
        return NextResponse.json({
          id: reportRow.id,
          created_at: reportRow.created_at,
          verified,
          reason: 'Report verified but claim blocked by fraud detection.',
          claim_created: false,
          claim_accepted: false,
          fraud_blocked: true,
          payout_initiated: false,
        });
      }

      const { count: weekClaimCount } = await admin
        .from('parametric_claims')
        .select('id', { count: 'exact', head: true })
        .eq('policy_id', policyRow.id)
        .gte('created_at', weekStart);

      if ((weekClaimCount ?? 0) < maxClaims) {
        const lat = zoneLat ?? DEFAULT_ZONE.lat;
        const lng = zoneLng ?? DEFAULT_ZONE.lng;

        const { data: eventRow } = await admin
          .from('live_disruption_events')
          .insert({
            event_type: 'social',
            severity_score: 8,
            geofence_polygon: { type: 'circle', lat, lng, radius_km: 5 },
            verified_by_llm: true,
            raw_api_data: { source: 'rider_self_report', report_id: reportRow.id, message },
          })
          .select('id')
          .single();

        if (eventRow?.id) {
          const policy = {
            id: policyRow.id,
            profile_id: policyRow.profile_id,
            plan_id: policyRow.plan_id,
            plan_packages: plan,
          };
          const created = await createClaimFromTrigger({
            supabase: admin,
            policy,
            disruptionEventId: eventRow.id,
            payoutAmountInr: payoutAmount,
            maxClaimsPerWeek: maxClaims,
            phoneNumber: null,
            isDemo: false,
          });

          if (created?.claim && !created.skippedReason) {
            claim_created = true;
            claim_accepted = true;
            try {
              await admin.from('rider_notifications').insert({
                profile_id: user.id,
                title: 'Report verified — verify location',
                body: `Verify your location within ${FRAUD.VERIFY_WINDOW_HOURS}h to receive ₹${payoutAmount}.`,
                type: 'payout',
                metadata: {
                  claim_id: created.claim.id,
                  amount_inr: payoutAmount,
                  source: 'self_report',
                },
              });
            } catch {
              // optional
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    id: reportRow.id,
    created_at: reportRow.created_at,
    verified,
    reason: verifyReason,
    claim_created,
    claim_accepted,
    fraud_blocked,
    payout_initiated,
    corroboration: corroborationResult ?? undefined,
  });
}
