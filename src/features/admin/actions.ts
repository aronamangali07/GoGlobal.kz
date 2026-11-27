"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/data/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FieldDef } from "@/features/offers/types";
import type { Json } from "@/lib/supabase/database.types";

async function admin() {
  const s = await requireSession();
  if (s.profile.role !== "admin") throw new Error("forbidden");
  return s;
}
const uuid = z.string().uuid();

export async function setRole(userId: string, role: "student" | "manager" | "admin") {
  const { supabase, user } = await admin();
  const id = uuid.parse(userId);
  if (id === user.id) return { ok: false, error: "self" };
  const r = z.enum(["student", "manager", "admin"]).parse(role);
  // Персоналу онбординг студента не нужен
  const { error } = await supabase.from("profiles").update({ role: r, ...(r !== "student" ? { onboarded_at: new Date().toISOString() } : {}) }).eq("id", id);
  revalidatePath("/admin/users");
  return { ok: !error };
}

export async function setManagerPrograms(userId: string, programIds: string[]) {
  const { supabase } = await admin();
  const id = uuid.parse(userId);
  const want = z.array(uuid).parse(programIds);
  const { data: cur } = await supabase.from("program_managers").select("program_id").eq("user_id", id);
  const have = (cur ?? []).map((c) => c.program_id);
  const add = want.filter((p) => !have.includes(p));
  const del = have.filter((p) => !want.includes(p));
  if (add.length) await supabase.from("program_managers").insert(add.map((program_id) => ({ user_id: id, program_id })));
  if (del.length) await supabase.from("program_managers").delete().eq("user_id", id).in("program_id", del);
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Окончательное удаление пользователя (каскадом — профиль, заявки, документы и т.д.). */
export async function deleteUser(userId: string, confirmEmail: string) {
  const { user } = await admin();
  const id = uuid.parse(userId);
  if (id === user.id) return { ok: false, error: "self" };
  const db = createAdminClient();
  const { data: target } = await db.from("profiles").select("email, full_name").eq("id", id).single();
  if (!target || target.email !== confirmEmail.trim()) return { ok: false, error: "confirm" };
  // Файлы из Storage
  for (const bucket of ["avatars", "documents"]) {
    const { data: top } = await db.storage.from(bucket).list(id, { limit: 1000 });
    for (const f of top ?? []) {
      const { data: inner } = await db.storage.from(bucket).list(`${id}/${f.name}`, { limit: 1000 });
      const paths = inner?.length ? inner.map((x) => `${id}/${f.name}/${x.name}`) : [`${id}/${f.name}`];
      await db.storage.from(bucket).remove(paths);
    }
  }
  const { error } = await db.auth.admin.deleteUser(id);
  if (!error) {
    await db.from("audit_log").insert({ actor_id: user.id, action: "user.deleted", entity_type: "user", entity_id: id, diff: { email: target.email, name: target.full_name } });
  }
  revalidatePath("/admin/users");
  return { ok: !error };
}

const settingsSchema = z.object({
  windowHours: z.coerce.number().int().min(1).max(720),
  country: z.coerce.number().min(0).max(1),
  work: z.coerce.number().min(0).max(1),
  noPlacePriority: z.boolean(),
});

export async function saveSettings(raw: unknown) {
  const v = settingsSchema.parse(raw);
  const { supabase } = await admin();
  const r1 = await supabase.from("app_settings").upsert({ key: "default_window_hours", value: v.windowHours, updated_at: new Date().toISOString() });
  const r2 = await supabase.from("app_settings").upsert({ key: "allocation", value: { country: v.country, work: v.work, noPlacePriority: v.noPlacePriority }, updated_at: new Date().toISOString() });
  revalidatePath("/admin/settings");
  return { ok: !r1.error && !r2.error };
}

const fieldSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,40}$/),
  label: z.string().trim().min(1).max(80),
  type: z.enum(["text", "textarea", "number", "money", "date", "boolean", "country", "select"]),
  unit: z.string().trim().max(20).optional(),
  required: z.boolean().optional(),
  options: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  group: z.enum(["main", "dates", "money", "requirements", "extra"]).optional(),
});
const programSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
  tagline: z.string().trim().max(120).default(""),
  description: z.string().trim().max(1000).default(""),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  icon: z.enum(["sun", "baby", "briefcase", "tent", "globe"]),
  fields: z.array(fieldSchema).min(1).max(40),
});

export async function createProgram(raw: unknown) {
  const v = programSchema.safeParse(raw);
  if (!v.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await admin();
  const fields: FieldDef[] = v.data.fields.map((f) => ({ ...f, group: f.group ?? (f.type === "money" ? "money" : "main") }));
  const { data, error } = await supabase.from("programs").insert({
    name: v.data.name, slug: v.data.slug, tagline: v.data.tagline, description: v.data.description,
    color: v.data.color, icon: v.data.icon, offer_schema: fields as unknown as Json, created_by: user.id, sort: 100,
  }).select("id").single();
  if (error) return { ok: false, error: error.code === "23505" ? "slug" : "generic" };
  revalidatePath("/admin/programs");
  return { ok: true, id: data.id };
}

export async function setProgramActive(programId: string, active: boolean) {
  const { supabase } = await admin();
  const { error } = await supabase.from("programs").update({ is_active: active }).eq("id", uuid.parse(programId));
  revalidatePath("/admin/programs");
  return { ok: !error };
}

/** Окончательное удаление оффера (только админ, обычно из архива). */
export async function deleteOffer(offerId: string) {
  const { supabase, user } = await admin();
  const id = uuid.parse(offerId);
  const { data: o } = await supabase.from("offers").select("code, title, program_id").eq("id", id).single();
  const { error } = await supabase.from("offers").delete().eq("id", id);
  if (!error && o) {
    await createAdminClient().from("audit_log").insert({ actor_id: user.id, action: "offer.deleted", entity_type: "offer", entity_id: id, program_id: o.program_id, diff: { code: o.code, title: o.title } });
  }
  revalidatePath("/manage/offers");
  return { ok: !error };
}
