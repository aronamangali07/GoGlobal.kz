"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/data/session";

export type ApplyResult = { ok: true; applicationId: string } | { ok: false; error: string };

const KNOWN = ["window_closed", "english_too_low", "age_mismatch", "not_enrolled", "active_application_exists", "only_students"];
const code = (m?: string) => KNOWN.find((k) => m?.includes(k)) ?? "generic";

export async function applyToOffer(offerId: string): Promise<ApplyResult> {
  const id = z.string().uuid().parse(offerId);
  const { supabase } = await requireSession();
  const { data, error } = await supabase.rpc("apply_to_offer", { p_offer_id: id });
  if (error || !data) return { ok: false, error: code(error?.message) };
  revalidatePath("/offers");
  revalidatePath("/dashboard");
  return { ok: true, applicationId: data };
}

export async function withdrawApplication(applicationId: string): Promise<{ ok: boolean; error?: string }> {
  const id = z.string().uuid().parse(applicationId);
  const { supabase } = await requireSession();
  const { error } = await supabase.rpc("withdraw_application", { p_application_id: id });
  if (error) return { ok: false, error: code(error.message) };
  revalidatePath("/offers");
  revalidatePath("/dashboard");
  return { ok: true };
}
