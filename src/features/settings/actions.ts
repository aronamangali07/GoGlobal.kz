"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/data/session";
import { CATEGORIES } from "@/lib/notify/types";

// partialRecord: приходят только категории, которые пользователь трогал (z.record с enum требует все ключи)
const prefsSchema = z.partialRecord(z.enum(CATEGORIES), z.object({ email: z.boolean(), telegram: z.boolean() }).partial());

export async function saveNotificationPrefs(raw: unknown) {
  const parsed = prefsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const prefs = parsed.data;
  const { supabase, user } = await requireSession();
  const { error } = await supabase.from("profiles").update({ notification_prefs: prefs }).eq("id", user.id);
  revalidatePath("/settings");
  return { ok: !error };
}
