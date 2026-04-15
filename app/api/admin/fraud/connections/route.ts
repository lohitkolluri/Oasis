/**
 * GET /api/admin/fraud/connections
 * Lists payout destinations (`payment_routing_id`) shared by multiple profiles (Sybil / farm signal).
 */
import { listSharedPayoutDestinations } from '@/lib/admin/fraud-connections-summary';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { jsonWithRequestId } from '@/lib/utils/request-response';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async ({ admin }, request) => {
  try {
    const shared = await listSharedPayoutDestinations(admin);
    return jsonWithRequestId(request, { shared_payout_destinations: shared });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load';
    return jsonWithRequestId(request, { error: msg }, { status: 500 });
  }
});
