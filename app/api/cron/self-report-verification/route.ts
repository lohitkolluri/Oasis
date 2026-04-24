import { createClaimFromTrigger, getWeeklyClaimCounts } from '@/lib/claims/engine';
import { DEFAULT_ZONE, PAYOUT_FALLBACK_INR, RATE_LIMITS } from '@/lib/config/constants';
import { getCronSecret, isCronSecretRequired } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import { verifySelfReportWithVision } from '@/lib/rider/self-report-vision';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, errorResponse } from '@/lib/utils/api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SELF_REPORT_CRON_LOCK_KEY = 9_110_002;

/**
 * GET /api/cron/self-report-verification
 *
 * Cron worker that drains the pgmq `self_report_verification` queue and
 * re-runs AI + corroboration checks for queued rider self-reports.
 *
 * NOTE: For now this only marks reports as failed when the associated policy
 *       or profile context is missing. It reuses the same claim creation
 *       logic as the main adjudicator path when everything is valid.
 */
export async function GET(request: Request) {
  const cronSecret = getCronSecret();
  if (isCronSecretRequired() && !cronSecret) {
    return NextResponse.json(
      { error: 'Cron not configured. Set CRON_SECRET in production.' },
      { status: 503 },
    );
  }

  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const rateLimited = await checkRateLimit('cron:self-report-verification', {
    maxRequests: RATE_LIMITS.CRON_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (rateLimited) return rateLimited;

  try {
    const admin = createAdminClient();

    // Mutual exclusion: avoid concurrent drains creating duplicate events/claims.
    const { data: locked } = await admin.rpc('oasis_try_advisory_lock', {
      p_key: SELF_REPORT_CRON_LOCK_KEY,
    });
    if (locked !== true) {
      return NextResponse.json({ skipped: true, reason: 'Worker already running' });
    }

    const { data: msgs } = (await admin.rpc('pgmq_read_self_report_verification', {
      qty: 10,
      vt: 30,
    })) as { data: Array<{ msg_id: number; message: any }> | null };

    const messages = msgs ?? [];
    if (messages.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let processed = 0;
    for (const m of messages) {
      const msg = m.message as {
        report_id?: string;
        profile_id?: string;
        photo_path?: string | null;
        zone_lat?: number | null;
        zone_lng?: number | null;
        category?: string | null;
        message?: string | null;
      };

      if (!msg.report_id || !msg.profile_id) {
        // Malformed message, drop it.
        await admin.rpc('pgmq_delete_self_report_verification', { msg_id: m.msg_id });
        continue;
      }

      const { data: reportRow } = await admin
        .from('rider_delivery_reports')
        .select('id, photo_url, message, verification_status, zone_lat, zone_lng')
        .eq('id', msg.report_id)
        .maybeSingle();

      const photoPath = (msg.photo_path ?? reportRow?.photo_url) as string | null | undefined;
      if (!photoPath) {
        await admin
          .from('rider_delivery_reports')
          .update({ verification_status: 'failed' })
          .eq('id', msg.report_id);
        await admin.rpc('pgmq_delete_self_report_verification', { msg_id: m.msg_id });
        continue;
      }

      // Reload minimal context; for now we only ensure that a policy still exists.
      const { data: policyRow } = await admin
        .from('weekly_policies')
        .select('id, profile_id, plan_id, plan_packages(payout_per_claim_inr, max_claims_per_week)')
        .eq('profile_id', msg.profile_id)
        .eq('is_active', true)
        .order('week_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!policyRow) {
        await admin
          .from('rider_delivery_reports')
          .update({ verification_status: 'failed' })
          .eq('id', msg.report_id);
        await admin.rpc('pgmq_delete_self_report_verification', { msg_id: m.msg_id });
        continue;
      }

      const plan = policyRow.plan_packages as {
        payout_per_claim_inr?: number;
        max_claims_per_week?: number;
      } | null;
      const payoutAmount =
        plan?.payout_per_claim_inr != null
          ? Number(plan.payout_per_claim_inr)
          : PAYOUT_FALLBACK_INR;
      const maxClaims = plan?.max_claims_per_week ?? 3;

      const lat = msg.zone_lat ?? DEFAULT_ZONE.lat;
      const lng = msg.zone_lng ?? DEFAULT_ZONE.lng;

      // Vision verify (required): download the photo from storage and run the same strict verdict.
      let photoBytes: Buffer | null = null;
      let photoMime = 'image/jpeg';
      try {
        const dl = await admin.storage.from('rider-reports').download(photoPath);
        if (dl.data) {
          photoMime = dl.data.type || photoMime;
          photoBytes = Buffer.from(await dl.data.arrayBuffer());
        }
      } catch {
        // ignore; handled below
      }

      if (!photoBytes) {
        await admin
          .from('rider_delivery_reports')
          .update({ verification_status: 'failed' })
          .eq('id', msg.report_id);
        await admin.rpc('pgmq_delete_self_report_verification', { msg_id: m.msg_id });
        continue;
      }

      const vision = await verifySelfReportWithVision({
        photoBytes,
        photoMime,
        message: String(msg.message ?? reportRow?.message ?? ''),
        category: String(msg.category ?? 'other'),
      });

      if (!vision.ok || !vision.verified) {
        await admin
          .from('rider_delivery_reports')
          .update({ verification_status: 'failed' })
          .eq('id', msg.report_id);
        // Cleanup orphaned PII for failed queued reports.
        try {
          await admin.storage.from('rider-reports').remove([photoPath]);
        } catch {}
        await admin.rpc('pgmq_delete_self_report_verification', { msg_id: m.msg_id });
        continue;
      }

      const weekCounts = await getWeeklyClaimCounts(admin, [policyRow.id]);
      const weekClaimCount = weekCounts.get(policyRow.id) ?? 0;

      if (weekClaimCount >= maxClaims) {
        await admin
          .from('rider_delivery_reports')
          .update({ verification_status: 'failed' })
          .eq('id', msg.report_id);
        await admin.rpc('pgmq_delete_self_report_verification', { msg_id: m.msg_id });
        continue;
      }

      const { data: eventRow } = await admin
        .from('live_disruption_events')
        .insert({
          event_type: 'social',
          severity_score: 8,
          geofence_polygon: { type: 'circle', lat, lng, radius_km: 5 },
          verified_by_llm: true,
          raw_api_data: {
            source: 'self_report_queue',
            report_id: msg.report_id,
            message: msg.message,
            category: msg.category,
            vision_reason: vision.reason,
          },
        })
        .select('id')
        .single();

      if (!eventRow?.id) {
        await admin.rpc('pgmq_delete_self_report_verification', { msg_id: m.msg_id });
        continue;
      }

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
        await admin
          .from('rider_delivery_reports')
          .update({ verification_status: 'verified' })
          .eq('id', msg.report_id);

        processed += 1;
      } else {
        await admin
          .from('rider_delivery_reports')
          .update({ verification_status: 'failed' })
          .eq('id', msg.report_id);
      }

      await admin.rpc('pgmq_delete_self_report_verification', { msg_id: m.msg_id });
    }

    logger.info('self-report verification queue drained', {
      processed,
      total: messages.length,
    });

    return NextResponse.json({ ok: true, processed, total: messages.length });
  } catch (err) {
    return errorResponse(err, 'Self-report verification cron failed');
  } finally {
    try {
      const admin = createAdminClient();
      await admin.rpc('oasis_advisory_unlock', { p_key: SELF_REPORT_CRON_LOCK_KEY });
    } catch {
      // ignore
    }
  }
}
