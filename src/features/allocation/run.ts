import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { allocate, DEFAULT_WEIGHTS, newSeed, offerWorkTypes, type Weights } from "./allocate";

type Db = SupabaseClient<Database>;

/**
 * Считает черновик распределения и сохраняет его в allocation_runs.
 * Вызывается менеджером (его клиент, RLS) или кроном (admin-клиент, runBy = null).
 */
export async function runAllocationDraft(db: Db, offerId: string, runBy: string | null) {
  const { data: offer, error: oErr } = await db
    .from("offers")
    .select("id, status, seats_total, min_english, min_age, max_age, country, fields, window_closes_at, allocation_mode, program:programs ( slug )")
    .eq("id", offerId)
    .single();
  if (oErr || !offer) throw new Error("offer_not_found");
  if (offer.status !== "closed") throw new Error("offer_not_closed");

  const { data: inputs, error } = await db.rpc("allocation_inputs", { p_offer_id: offerId });
  if (error) throw new Error(error.message);
  const pending = (inputs ?? []).filter((i) => i.status === "pending");

  const { data: setting } = await db.from("app_settings").select("value").eq("key", "allocation").maybeSingle();
  const weights: Weights = { ...DEFAULT_WEIGHTS, ...((setting?.value ?? {}) as Partial<Weights>) };
  const seed = newSeed();
  const fields = (offer.fields ?? {}) as Record<string, unknown>;
  const params = {
    seats: offer.seats_total,
    minEnglish: offer.min_english,
    minAge: offer.min_age,
    maxAge: offer.max_age,
    country: offer.country,
    workTypes: offerWorkTypes(offer.program?.slug ?? "", fields),
    at: new Date(offer.window_closes_at ?? Date.now()),
  };
  const ranked = await allocate(
    params,
    pending.map((i) => ({
      applicationId: i.application_id,
      userId: i.user_id,
      englishLevel: i.english_level,
      birthDate: i.birth_date,
      preferences: i.preferences as { countries?: string[]; workTypes?: string[] },
      enrolled: i.enrolled,
      hasPlaceElsewhere: i.has_place_elsewhere,
    })),
    seed,
    weights,
  );
  // В ручном режиме система ничего не выбирает сама — только проверяет требования
  if (offer.allocation_mode === "manual") ranked.forEach((r) => r.eligible && (r.outcome = "waitlisted"));

  const { data: run, error: insErr } = await db
    .from("allocation_runs")
    .insert({
      offer_id: offerId,
      seed,
      params: { ...params, at: params.at.toISOString(), mode: offer.allocation_mode, weights } as unknown as Json,
      result: ranked as unknown as Json,
      run_by: runBy,
    })
    .select("id")
    .single();
  if (insErr || !run) throw new Error(insErr?.message ?? "insert_failed");
  return run.id;
}
