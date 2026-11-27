import "server-only";
import { redirect } from "next/navigation";
import { requireOnboardedSession } from "./session";

export async function requireAdminSession() {
  const s = await requireOnboardedSession();
  if (s.profile.role !== "admin") redirect("/dashboard");
  return s;
}

export const STAGES = ["application", "interview", "offer", "documents", "embassy", "visa", "departure"] as const;

/** Статистика: админ видит всё, менеджер — свои программы (RLS). */
export async function getStats(supabase: Awaited<ReturnType<typeof requireOnboardedSession>>["supabase"]) {
  const [{ data: programs }, { data: enrollments }, { data: offers }, { data: apps }, { count: docsPending }, { data: payments }, { data: students }] = await Promise.all([
    supabase.from("programs").select("id, name, color, icon, is_active").order("sort"),
    supabase.from("enrollments").select("program_id, current_stage, user_id"),
    supabase.from("offers").select("id, program_id, status, seats_total, is_test"),
    supabase.from("applications").select("offer_id, status"),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("payments").select("amount, currency, paid_at, due_date"),
    supabase.from("profiles").select("id, onboarded_at").eq("role", "student"),
  ]);
  const takenByOffer: Record<string, number> = {};
  for (const a of apps ?? []) if (a.status === "selected" || a.status === "approved") takenByOffer[a.offer_id] = (takenByOffer[a.offer_id] ?? 0) + 1;
  const studentIds = new Set((students ?? []).map((s) => s.id));

  const byProgram = (programs ?? []).map((p) => {
    const os = (offers ?? []).filter((o) => o.program_id === p.id && o.status !== "draft" && o.status !== "archived");
    return {
      ...p,
      total: os.reduce((s, o) => s + o.seats_total, 0),
      taken: os.reduce((s, o) => s + (takenByOffer[o.id] ?? 0), 0),
      students: new Set((enrollments ?? []).filter((e) => e.program_id === p.id && studentIds.has(e.user_id)).map((e) => e.user_id)).size,
      offers: os.length,
    };
  });
  const funnel = STAGES.map((st) => ({ stage: st, count: (enrollments ?? []).filter((e) => e.current_stage === st && studentIds.has(e.user_id)).length }));
  const today = new Date().toISOString().slice(0, 10);
  const currencies = [...new Set((payments ?? []).map((p) => p.currency))].map((cur) => {
    const ps = (payments ?? []).filter((p) => p.currency === cur);
    return {
      currency: cur,
      paid: ps.filter((p) => p.paid_at).reduce((s, p) => s + Number(p.amount), 0),
      outstanding: ps.filter((p) => !p.paid_at).reduce((s, p) => s + Number(p.amount), 0),
      overdue: ps.filter((p) => !p.paid_at && p.due_date && p.due_date < today).reduce((s, p) => s + Number(p.amount), 0),
    };
  });
  const live = (offers ?? []).filter((o) => o.status !== "draft" && o.status !== "archived");
  return {
    students: students?.length ?? 0,
    onboarded: (students ?? []).filter((s) => s.onboarded_at).length,
    offersOpen: (offers ?? []).filter((o) => o.status === "open").length,
    offersTotal: live.length,
    applications: (apps ?? []).filter((a) => a.status !== "withdrawn").length,
    docsPending: docsPending ?? 0,
    seatsTaken: live.reduce((s, o) => s + (takenByOffer[o.id] ?? 0), 0),
    seatsTotal: live.reduce((s, o) => s + o.seats_total, 0),
    byProgram,
    funnel,
    payments: currencies,
  };
}
export type Stats = Awaited<ReturnType<typeof getStats>>;
