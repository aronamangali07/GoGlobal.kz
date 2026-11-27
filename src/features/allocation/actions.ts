"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/data/session";
import { runAllocationDraft } from "./run";
import { onApplicationResults, onWindowClosed } from "@/lib/notify/events";

type Result = { ok: true } | { ok: false; error: string };

async function staff() {
  const s = await requireSession();
  if (s.profile.role === "student") throw new Error("forbidden");
  return s;
}
const uuid = z.string().uuid();
const errCode = (e: unknown) => {
  const m = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String(e.message) : "";
  const known = ["offer_not_closed", "already_confirmed", "too_many_selected", "invalid_selection", "no_seats", "invalid_state", "active_application_exists", "forbidden"];
  return known.find((k) => m.includes(k)) ?? "generic";
};
const refresh = (offerId: string) => {
  revalidatePath(`/manage/offers/${offerId}/applications`);
  revalidatePath("/manage/offers");
  revalidatePath(`/offers/${offerId}`);
};

/** Закрыть окно досрочно (или оно уже закрылось) и посчитать черновик. */
export async function closeAndAllocate(offerId: string): Promise<Result> {
  const id = uuid.parse(offerId);
  const { supabase, user } = await staff();
  const { error } = await supabase.rpc("close_offer_window", { p_offer_id: id });
  if (error) return { ok: false, error: errCode(error) };
  try {
    await runAllocationDraft(supabase, id, user.id);
  } catch (e) {
    return { ok: false, error: errCode(e) };
  }
  await onWindowClosed(id);
  refresh(id);
  return { ok: true };
}

export async function rerunAllocation(offerId: string): Promise<Result> {
  const id = uuid.parse(offerId);
  const { supabase, user } = await staff();
  try {
    await runAllocationDraft(supabase, id, user.id);
  } catch (e) {
    return { ok: false, error: errCode(e) };
  }
  refresh(id);
  return { ok: true };
}

export async function confirmAllocation(offerId: string, runId: string, selected: string[], note = ""): Promise<Result> {
  const { supabase } = await staff();
  const { error } = await supabase.rpc("confirm_allocation", {
    p_run_id: uuid.parse(runId),
    p_selected: z.array(uuid).max(500).parse(selected),
    p_note: z.string().max(500).parse(note),
  });
  if (error) return { ok: false, error: errCode(error) };
  await onApplicationResults(uuid.parse(offerId));
  refresh(uuid.parse(offerId));
  return { ok: true };
}

export async function decideApplication(offerId: string, applicationId: string, decision: "approve" | "reject" | "promote"): Promise<Result> {
  const { supabase } = await staff();
  const { error } = await supabase.rpc("decide_application", {
    p_application_id: uuid.parse(applicationId),
    p_decision: z.enum(["approve", "reject", "promote"]).parse(decision),
  });
  if (error) return { ok: false, error: errCode(error) };
  await onApplicationResults(uuid.parse(offerId), applicationId);
  refresh(uuid.parse(offerId));
  return { ok: true };
}
