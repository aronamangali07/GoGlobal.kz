import { NextResponse, type NextRequest } from "next/server";
import { runAllocationDraft } from "@/features/allocation/run";
import { dispatch } from "@/lib/notify";
import { onWindowClosed, sendReminders } from "@/lib/notify/events";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Каждые 15 минут (pg_cron → pg_net): закрыть истёкшие окна и посчитать черновики,
 * напоминания за 24 ч / 1 ч и о сроках оплаты, повторить неудачные доставки.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const { data: closed } = await db.rpc("close_expired_offers");
  const drafts: string[] = [];
  for (const offerId of (closed ?? []) as unknown as string[]) {
    try {
      await runAllocationDraft(db, offerId, null);
      drafts.push(offerId);
    } catch {
      // нет заявок — черновик не нужен
    }
    await onWindowClosed(offerId);
  }
  const reminders = await sendReminders();
  const retried = await dispatch();
  return NextResponse.json({ closed: closed?.length ?? 0, drafts: drafts.length, reminders, deliveries: retried });
}
