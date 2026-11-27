import { NextResponse, type NextRequest } from "next/server";
import { SITE_URL } from "@/lib/env";
import { buildIcs } from "@/lib/ics";
import { createAdminClient } from "@/lib/supabase/admin";

/** Подписка на календарь: /api/calendar/<calendar_token>.ics — токен знает только владелец. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/calendar/[token]">) {
  const { token } = await ctx.params;
  const id = token.replace(/\.ics$/, "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse("Not found", { status: 404 });
  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("id, full_name").eq("calendar_token", id).maybeSingle();
  if (!profile) return new NextResponse("Not found", { status: 404 });
  const { data: events } = await db
    .from("events")
    .select("id, title, starts_at, ends_at, address, notes")
    .eq("user_id", profile.id)
    .order("starts_at");
  const body = buildIcs(
    (events ?? []).map((e) => ({ ...e, url: `${SITE_URL}/calendar` })),
    "GoGlobal",
  );
  return new NextResponse(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300" },
  });
}
