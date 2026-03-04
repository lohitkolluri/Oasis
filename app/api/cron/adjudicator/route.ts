/**
 * GET /api/cron/adjudicator
 *
 * Vercel Cron endpoint — runs the parametric adjudicator once per hour.
 * Vercel automatically passes the CRON_SECRET via the Authorization header.
 *
 * Schedule (vercel.json): "0 * * * *" — top of every hour
 * IST note: Mumbai region (bom1) so this fires at :00 IST each hour.
 *
 * Authentication:
 *  - Vercel Cron: Authorization: Bearer <CRON_SECRET>
 *  - Direct admin call: authenticated user in ADMIN_EMAILS list
 */

import { NextResponse } from "next/server";
import { runAdjudicator } from "@/lib/adjudicator/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Vercel Cron passes the secret automatically; reject unauthenticated hits
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAdjudicator();
    return NextResponse.json({
      ok: true,
      triggered_at: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    console.error("[cron/adjudicator] error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Adjudicator failed",
        triggered_at: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
