import { createAdminClient } from '@/lib/supabase/admin';
import { runWeeklyPremiumRecommendations } from '@/lib/pricing/run-weekly-premium-recommendations';
import { withAdminAuth } from '@/lib/utils/admin-guard';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Admin-only: same work as GET /api/cron/weekly-premium (recommendations + model snapshots).
 */
export const POST = withAdminAuth(async () => {
  try {
    const admin = createAdminClient();
    const result = await runWeeklyPremiumRecommendations(admin);
    revalidatePath('/admin/financial/plans', 'page');
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Weekly premium job failed' },
      { status: 503 },
    );
  }
});
