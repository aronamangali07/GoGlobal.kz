import { NextResponse, type NextRequest } from "next/server";
import { runAllocationDraft } from "@/features/allocation/run";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Закрывает истёкшие окна и считает черновики распределения.
 * Вызывается по расписанию (pg_cron / Vercel Cron) с заголовком Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const { data: closed, error } = await db.rpc("close_expired_offers");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { offer: string; run?: string; error?: string }[] = [];
  for (const offerId of (closed ?? []) as unknown as string[]) {
    try {
      results.push({ offer: offerId, run: await runAllocationDraft(db, offerId, null) });
    } catch (e) {
      results.push({ offer: offerId, error: e instanceof Error ? e.message : "failed" });
    }
  }
  return NextResponse.json({ closed: results.length, results });
}
