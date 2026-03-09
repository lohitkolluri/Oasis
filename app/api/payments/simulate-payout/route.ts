/**
 * POST /api/payments/simulate-payout
 *
 * Simulated instant payout endpoint for demo purposes.
 * Models UPI instant transfer to rider's wallet.
 * Creates a payout_ledger entry with processing → completed status.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { simulatePayoutSchema } from '@/lib/validations/schemas';
import { parseWithSchema } from '@/lib/validations/parse';
import { checkRateLimit, errorResponse, rateLimitKey } from '@/lib/utils/api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Simulate an instant payout. Called internally by the adjudicator after
 * a claim is marked as 'paid'. Can also be called by admin for manual payouts.
 */
export async function POST(request: Request) {
  const limitKey = rateLimitKey(request, 'payout');
  const rateLimited = await checkRateLimit(limitKey, { maxRequests: 20 });
  if (rateLimited) return rateLimited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = parseWithSchema(simulatePayoutSchema, body);
    if (!parsed.success) return parsed.response;
    const { claim_id, profile_id, amount_inr, payout_method } = parsed.data;

    const admin = createAdminClient();

    // Verify the claim exists and belongs to this profile
    const { data: claim } = await admin
      .from('parametric_claims')
      .select('id, policy_id, status')
      .eq('id', claim_id)
      .single();

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
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
}
