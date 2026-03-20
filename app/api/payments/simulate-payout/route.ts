/**
 * Mocks an instant UPI payout transaction to simulate real-world ledger closures.
 * Bypasses active Stripe or banking integrations to deterministically record a "completed"
 * transaction within the database, simulating network latency for frontend realism.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { simulatePayoutSchema } from '@/lib/validations/schemas';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { parseWithSchema } from '@/lib/validations/parse';
import { checkRateLimit, errorResponse, rateLimitKey } from '@/lib/utils/api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Handles cross-boundary validation and mock execution of a financial transfer.
 * Enforces strict profile ownership validation before generating synthetic UPI references.
 *
 * @param _ctx - Unused next request context
 * @param request - Inbound HTTP POST payload matching the simulatePayoutSchema format
 * @returns JSON payload asserting the success state and generated UPI transaction receipt
 */
export const POST = withAdminAuth(async (_ctx, request) => {
  const limitKey = rateLimitKey(request, 'payout');
  const rateLimited = await checkRateLimit(limitKey, { maxRequests: 20 });
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const parsed = parseWithSchema(simulatePayoutSchema, body);
    if (!parsed.success) return parsed.response;
    const { claim_id, profile_id, amount_inr, payout_method } = parsed.data;

    const admin = createAdminClient();

    // Verify the claim exists and the provided profile matches the linked policy owner.
    const { data: claim } = await admin
      .from('parametric_claims')
      .select('id, policy_id, status')
      .eq('id', claim_id)
      .single();

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const { data: policy } = await admin
      .from('weekly_policies')
      .select('profile_id')
      .eq('id', claim.policy_id)
      .single();

    if (!policy || policy.profile_id !== profile_id) {
      return NextResponse.json(
        { error: 'Claim does not belong to the provided profile' },
        { status: 400 },
      );
    }

    // Generate a mock UPI reference (simulated instant payout for demo)
    const mockUpiRef = `OASIS_UPI_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Simulate processing delay (200-800ms for realistic demo)
    const processingMs = 200 + Math.random() * 600;
    await new Promise((resolve) => setTimeout(resolve, processingMs));

    // Create payout ledger entry
    const { data: payout, error: payoutErr } = await admin
      .from('payout_ledger')
      .insert({
        claim_id,
        profile_id,
        amount_inr,
        payout_method: payout_method ?? 'upi_instant',
        status: 'completed',
        mock_upi_ref: mockUpiRef,
        completed_at: new Date().toISOString(),
        metadata: {
          processing_time_ms: Math.round(processingMs),
          gateway: 'stripe_connect',
          demo: true,
          upi_vpa: `rider_${profile_id.slice(0, 4)}@oasis`,
        },
      })
      .select('id, mock_upi_ref, status, amount_inr, completed_at')
      .single();

    if (payoutErr) {
      return NextResponse.json(
        { error: payoutErr.message ?? 'Failed to create payout' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      payout: {
        id: payout?.id,
        upi_ref: mockUpiRef,
        amount_inr,
        status: 'completed',
        method: payout_method ?? 'upi_instant',
        processing_time_ms: Math.round(processingMs),
        completed_at: payout?.completed_at,
      },
      message: `₹${amount_inr} instantly transferred to rider's wallet via UPI.`,
    });
  } catch (err) {
    return errorResponse(err, 'Payout simulation failed');
  }
});
