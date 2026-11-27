"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/data/session";
import { CATEGORIES } from "@/lib/notify/types";

const prefsSchema = z.record(z.enum(CATEGORIES), z.object({ email: z.boolean(), telegram: z.boolean() }).partial());

export async function saveNotificationPrefs(raw: unknown) {
  const prefs = prefsSchema.parse(raw);
  const { supabase, user } = await requireSession();
  const { error } = await supabase.from("profiles").update({ notification_prefs: prefs }).eq("id", user.id);
  revalidatePath("/settings");
  return { ok: !error };
}
