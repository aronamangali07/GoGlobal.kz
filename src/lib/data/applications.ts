import "server-only";
import { createClient } from "@/lib/supabase/server";

export type MyApplication = {
  id: string;
  offer_id: string;
  program_id: string;
  status: "pending" | "ineligible" | "selected" | "waitlisted" | "approved" | "rejected" | "withdrawn";
  lottery_rank: number | null;
  created_at: string;
  offer: { id: string; code: string | null; title: string; subtitle: string; country: string; status: string; window_closes_at: string | null; program: { name: string; color: string; icon: string } | null } | null;
};

export async function getMyApplications(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("id, offer_id, program_id, status, lottery_rank, created_at, offer:offers ( id, code, title, subtitle, country, status, window_closes_at, program:programs ( name, color, icon ) )")
    .eq("user_id", userId)
    .neq("status", "withdrawn")
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as MyApplication[];
}

export const ACTIVE = ["pending", "selected", "approved"] as const;

export async function getAllocationPublic(offerId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("allocation_public", { p_offer_id: offerId });
  const row = data?.[0];
  if (!row) return null;
  return {
    seed: row.seed,
    confirmedAt: row.confirmed_at,
    ranks: (row.ranks ?? []) as { rank: number; ticket: string; outcome: "selected" | "waitlisted" | "ineligible"; me: boolean }[],
  };
}
