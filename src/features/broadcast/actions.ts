"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/data/session";
import { programStudents } from "@/lib/notify";
import { onAnnouncement } from "@/lib/notify/events";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  programId: z.string().uuid().nullable(),
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(2).max(4000),
});

export async function sendAnnouncement(raw: unknown) {
  const v = schema.safeParse(raw);
  if (!v.success) return { ok: false as const };
  const { supabase, user, profile } = await requireSession();
  if (profile.role === "student") return { ok: false as const };
  const { data, error } = await supabase
    .from("announcements")
    .insert({ program_id: v.data.programId, title: v.data.title, body: v.data.body, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const };
  await onAnnouncement(data.id);
  const count = v.data.programId
    ? (await programStudents(v.data.programId)).length
    : (await createAdminClient().from("profiles").select("*", { count: "exact", head: true }).eq("role", "student")).count ?? 0;
  revalidatePath("/manage/broadcast");
  return { ok: true as const, count };
}
