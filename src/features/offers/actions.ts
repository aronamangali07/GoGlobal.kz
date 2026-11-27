"use server";

import { z } from "zod";
import { requireSession } from "@/lib/data/session";

export async function toggleFavorite(offerId: string, on: boolean) {
  const id = z.string().uuid().parse(offerId);
  const { supabase, user } = await requireSession();
  const { error } = on
    ? await supabase.from("favorites").upsert({ user_id: user.id, offer_id: id }, { ignoreDuplicates: true })
    : await supabase.from("favorites").delete().eq("user_id", user.id).eq("offer_id", id);
  return { ok: !error };
}
