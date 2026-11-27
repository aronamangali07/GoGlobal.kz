import "server-only";
import { createClient } from "@/lib/supabase/server";

export const STAGES = ["application", "interview", "offer", "documents", "embassy", "visa", "departure"] as const;
export type Stage = (typeof STAGES)[number];

export async function getMyEnrollments(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("id, program_id, current_stage, stage_updated_at, program:programs ( id, name, color, icon, slug )")
    .eq("user_id", userId)
    .order("created_at");
  return data ?? [];
}

export async function getMyEvents(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, type, title, starts_at, ends_at, address, notes, program:programs ( name, color )")
    .eq("user_id", userId)
    .order("starts_at");
  return data ?? [];
}

export type EventRow = Awaited<ReturnType<typeof getMyEvents>>[number];
