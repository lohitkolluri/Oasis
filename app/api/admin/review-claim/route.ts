/**
 * POST /api/admin/review-claim
 * Admin approve/reject a claim. Body: { claimId, action: "approved" | "rejected" }
 *
 * Semantics:
 * - "approved":
 *    - Clears fraud flag.
 *    - If claim is not yet paid, initiates payout and marks status = "paid".
 *    - If a previous admin rejection created a net-negative payout (reversal),
 *      this will issue a new payout so the rider is credited again.
 * - "rejected":
 *    - Marks claim as admin_review_status = "rejected" and keeps/sets is_flagged = true.
 *    - If the claim has already been paid and there is a positive net payout in
 *      payout_ledger, inserts a compensating negative ledger row to redact the payout.
 */

import { simulatePayout } from '@/lib/adjudicator/payouts';
import { AUDIT } from '@/lib/admin/audit-actions';
import { insertAdminAuditLog } from '@/lib/admin/audit-log';
import { logger } from '@/lib/logger';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { parseWithSchema } from '@/lib/validations/parse';
import { reviewClaimSchema } from '@/lib/validations/schemas';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const POST = withAdminAuth(async (ctx, request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseWithSchema(reviewClaimSchema, body);
  if (!parsed.success) return parsed.response;
  const { claimId, action } = parsed.data;

  // Use service-role Supabase client to bypass RLS for admin operations.
  const admin = ctx.admin;

  // Advisory lock to prevent concurrent review mutations.
  const REVIEW_LOCK_KEY = 9_200_001;
  const { data: locked } = await admin.rpc('oasis_try_advisory_lock', {
    p_key: REVIEW_LOCK_KEY,
  });
  if (locked !== true) {
    return NextResponse.json(
      { error: 'Another review is already in progress. Please retry.' },
      { status: 409 },
    );
  }

  try {
    // Fetch claim + linked rider profile so we can manage payouts.
    const { data: claim, error: claimErr } = await admin
      .from('parametric_claims')
      .select(
        'id, policy_id, payout_amount_inr, status, is_flagged, flag_reason, admin_review_status',
      )
      .eq('id', claimId)
      .single();

    if (claimErr || !claim) {
      return NextResponse.json({ error: claimErr?.message ?? 'Claim not found' }, { status: 404 });
    }

    // Guard against double-review (e.g., admin double-clicks or two tabs).
    if (claim.admin_review_status) {
      return NextResponse.json(
        {
          error: `Claim has already been reviewed (${claim.admin_review_status}).`,
        },
        { status: 409 },
      );
    }

    const { data: policy, error: policyErr } = await admin
      .from('weekly_policies')
      .select('profile_id')
      .eq('id', claim.policy_id)
      .single();

    if (policyErr || !policy) {
      return NextResponse.json(
        { error: policyErr?.message ?? 'Linked policy not found' },
        { status: 500 },
      );
    }

    // Compute net payouts for this claim so we can redact or re-credit.
    const { data: payouts, error: payoutsErr } = await admin
      .from('payout_ledger')
      .select('amount_inr')
      .eq('claim_id', claimId);

    if (payoutsErr) {
      return NextResponse.json(
        { error: payoutsErr.message ?? 'Failed to read payout ledger' },
        { status: 500 },
      );
    }

    const netPayoutInr = payouts?.reduce((sum, p) => sum + Number(p.amount_inr ?? 0), 0) ?? 0;

    let payoutChange: 'initiated' | 'reversed' | null = null;

    // Handle action-specific side effects.
    if (action === 'approved') {
      const amountInr = claim.payout_amount_inr != null ? Number(claim.payout_amount_inr) : 0;

      // If claim was previously unpaid OR fully reversed, pay it out now.
      if (amountInr > 0 && (claim.status !== 'paid' || netPayoutInr <= 0)) {
        const ok = await simulatePayout(admin, claim.id, policy.profile_id, amountInr);
        if (!ok) {
          return NextResponse.json(
            { error: 'Failed to record payout for approved claim' },
            { status: 500 },
          );
        }

        await admin.from('parametric_claims').update({ status: 'paid' }).eq('id', claim.id);

        payoutChange = 'initiated';
      }
    } else if (action === 'rejected') {
      // If there is a positive net payout, insert a compensating negative row.
      if (netPayoutInr > 0) {
        const reversalAmount = -netPayoutInr;
        const mockUpiRef = `OASIS_REV_${Date.now()}_${claimId.slice(0, 8)}`;

        const { error: reversalErr } = await admin.from('payout_ledger').insert({
          claim_id: claimId,
          profile_id: policy.profile_id,
          amount_inr: reversalAmount,
          payout_method: 'upi_instant',
          status: 'completed',
          mock_upi_ref: mockUpiRef,
          completed_at: new Date().toISOString(),
          metadata: {
            reason: 'admin_reversal',
            original_net_inr: netPayoutInr,
          },
        });

        if (reversalErr) {
          return NextResponse.json(
            { error: reversalErr.message ?? 'Failed to redact payout' },
            { status: 500 },
          );
        }

        payoutChange = 'reversed';
      }
    }

    const updatePayload: Record<string, unknown> = {
      admin_review_status: action,
      reviewed_by: ctx.user.email ?? ctx.user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (action === 'approved') {
      updatePayload.is_flagged = false;
      updatePayload.flag_reason = null;
    } else {
      updatePayload.is_flagged = true;
      if (!claim.flag_reason) {
        updatePayload.flag_reason = 'Rejected by manual admin review';
      }
    }

    const { error } = await admin.from('parametric_claims').update(updatePayload).eq('id', claimId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await insertAdminAuditLog(admin, {
      actorId: ctx.user.id,
      actorEmail: ctx.user.email,
      action: AUDIT.CLAIM_REVIEW,
      resourceType: 'parametric_claims',
      resourceId: claimId,
      metadata: {
        action,
        payout_change: payoutChange,
        prior_status: claim.status,
        prior_admin_review: claim.admin_review_status ?? null,
      },
    });

    try {
      await admin.from('system_logs').insert({
        event_type: 'fraud_review',
        severity: action === 'rejected' ? 'warning' : 'info',
        metadata: {
          claim_id: claimId,
          action,
          payout_change: payoutChange,
          reviewed_by: ctx.user.email ?? ctx.user.id,
        },
      });
    } catch (err) {
      logger.warn('Audit system log insert failed', {
        claim_id: claimId,
        action,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json({ ok: true, claimId, action, payout_change: payoutChange });
  } finally {
    try {
      await admin.rpc('oasis_advisory_unlock', { p_key: REVIEW_LOCK_KEY });
    } catch {
      // ignore unlock errors
    }
  }
});
