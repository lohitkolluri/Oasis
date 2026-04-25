import { getCeleryApiConfig, isCelerySelfReportQueueEnabled } from '@/lib/config/env';

export type SelfReportVerificationCeleryJob = {
  report_id: string;
  profile_id: string;
  photo_path: string | null;
  zone_lat: number | null;
  zone_lng: number | null;
  category: string | null;
  message: string | null;
};

export type CeleryEnqueueResult =
  | {
      ok: true;
      enqueued: true;
      disabled: false;
      requestId?: string | null;
      responseStatus: number;
    }
  | {
      ok: true;
      enqueued: false;
      disabled: true;
      reason: string;
    }
  | {
      ok: false;
      enqueued: false;
      disabled: boolean;
      reason: string;
    };

/**
 * Demo-only Celery enqueue adapter for self-report verification.
 *
 * This is intentionally **disabled by default** so it "exists" in the codebase
 * but does not actually send jobs anywhere unless explicitly enabled.
 */
export async function enqueueSelfReportVerificationCelery(
  job: SelfReportVerificationCeleryJob,
): Promise<CeleryEnqueueResult> {
  if (!isCelerySelfReportQueueEnabled()) {
    return {
      ok: true,
      enqueued: false,
      disabled: true,
      reason:
        'Celery self-report queue is disabled (demo stub). Set OASIS_CELERY_SELF_REPORT_ENABLED=true to enable sending.',
    };
  }

  const cfg = getCeleryApiConfig();
  if (!cfg.url) {
    return {
      ok: false,
      enqueued: false,
      disabled: false,
      reason: 'Missing CELERY_API_URL (required when OASIS_CELERY_SELF_REPORT_ENABLED=true).',
    };
  }

  try {
    const res = await fetch(`${cfg.url.replace(/\/$/, '')}/enqueue/self-report-verification`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify(job),
    });

    const requestId = res.headers.get('x-request-id');
    if (!res.ok) {
      return {
        ok: false,
        enqueued: false,
        disabled: false,
        reason: `Celery API returned HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      enqueued: true,
      disabled: false,
      requestId,
      responseStatus: res.status,
    };
  } catch (err) {
    return {
      ok: false,
      enqueued: false,
      disabled: false,
      reason: err instanceof Error ? err.message : 'Celery API request failed',
    };
  }
}
