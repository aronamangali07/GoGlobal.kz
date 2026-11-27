"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deriveDisplay } from "@/features/offers/display";
import type { FieldDef } from "@/features/offers/types";
import { requireSession } from "@/lib/data/session";
import type { Json } from "@/lib/supabase/database.types";
import { fieldsSchema, offerCommonSchema } from "./offer-schema";
import { onOfferPublished } from "@/lib/notify/events";

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string; errors?: Record<string, string> };

async function requireStaff() {
  const session = await requireSession();
  if (session.profile.role === "student") throw new Error("forbidden");
  return session;
}

function collect(issues: { message: string; path: PropertyKey[] }[], prefix = "") {
  const out: Record<string, string> = {};
  for (const i of issues) out[prefix + i.path.map(String).join(".")] ??= i.message;
  return out;
}

export async function saveOffer(input: unknown, intent: "draft" | "publish" | "save"): Promise<SaveResult> {
  const { supabase } = await requireStaff();
  const parsed = offerCommonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", errors: collect(parsed.error.issues) };
  const v = parsed.data;

  // RLS отдаст программу только если она активна или пользователь — персонал
  const { data: program } = await supabase.from("programs").select("id, slug, offer_schema").eq("id", v.program_id).single();
  if (!program) return { ok: false, error: "noAccess" };
  const { data: canManage } = await supabase.rpc("manages_program", { p_program_id: program.id });
  if (!canManage) return { ok: false, error: "noAccess" };

  const schema = (program.offer_schema ?? []) as FieldDef[];
  // Явно подставляем все ключи схемы: отсутствующее поле должно проверяться как пустое, а не пропускаться
  const rawFields = Object.fromEntries(schema.map((d) => [d.key, v.fields[d.key] ?? null]));
  const fp = fieldsSchema(schema).safeParse(rawFields);
  if (!fp.success) return { ok: false, error: "invalid", errors: collect(fp.error.issues, "fields.") };
  const fields = fp.data as Record<string, string | number | boolean | null>;
  const display = deriveDisplay(program.slug, fields);

  let existing: { status: string; window_opens_at: string | null; published_at: string | null } | null = null;
  if (v.id) {
    const { data } = await supabase.from("offers").select("status, window_opens_at, published_at").eq("id", v.id).single();
    if (!data) return { ok: false, error: "noAccess" };
    existing = data;
  }

  const now = Date.now();
  const publishing = intent === "publish" || (intent === "save" && existing && existing.status !== "draft");
  let opens: string | null = null;
  let closes: string | null = null;
  if (v.window_start === "custom" && v.window_start_at) opens = v.window_start_at;
  else if (publishing) opens = existing?.window_opens_at ?? new Date(now).toISOString();
  if (opens) closes = new Date(Date.parse(opens) + v.window_hours * 3_600_000).toISOString();

  let status = existing?.status ?? "draft";
  if (intent === "publish") status = "open";
  if (intent === "draft") status = "draft";
  // Продлили окно закрытого оффера — снова принимаем заявки
  if (intent === "save" && status === "closed" && closes && Date.parse(closes) > now) status = "open";

  const row = {
    program_id: program.id,
    code: typeof fields.code === "string" && fields.code ? fields.code : null,
    title: display.title || "Оффер",
    subtitle: display.subtitle,
    country: display.country,
    city: display.city,
    fields: fields as Json,
    seats_total: v.seats_total,
    min_english: v.min_english,
    min_age: v.min_age,
    max_age: v.max_age,
    interview_at: v.interview_at,
    interview_note: v.interview_note,
    window_opens_at: opens,
    window_closes_at: closes,
    window_hours: v.window_hours,
    allocation_mode: v.allocation_mode,
    is_test: v.is_test,
    status: status as "draft" | "open" | "closed" | "allocated" | "archived",
    published_at: status === "open" ? (existing?.published_at ?? new Date(now).toISOString()) : (existing?.published_at ?? null),
  };

  const { data, error } = v.id
    ? await supabase.from("offers").update(row).eq("id", v.id).select("id").single()
    : await supabase.from("offers").insert(row).select("id").single();
  if (error || !data) return { ok: false, error: "generic" };

  // Первая публикация — уведомляем студентов программы (email + Telegram + колокольчик)
  if (row.status === "open" && existing?.status !== "open" && !existing?.published_at) await onOfferPublished(data.id);

  revalidatePath("/manage/offers");
  revalidatePath("/offers");
  return { ok: true, id: data.id };
}

export async function setOfferArchived(offerId: string, archived: boolean) {
  const id = z.string().uuid().parse(offerId);
  const { supabase } = await requireStaff();
  const { data: offer } = await supabase.from("offers").select("window_closes_at").eq("id", id).single();
  if (!offer) return { ok: false };
  const back = !offer.window_closes_at ? "draft" : Date.parse(offer.window_closes_at) > Date.now() ? "open" : "closed";
  const { error } = await supabase
    .from("offers")
    .update(archived ? { status: "archived", archived_at: new Date().toISOString() } : { status: back, archived_at: null })
    .eq("id", id);
  revalidatePath("/manage/offers");
  revalidatePath("/offers");
  return { ok: !error };
}
