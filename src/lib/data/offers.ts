import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FieldDef, OfferWithProgram, ProgramLite } from "@/features/offers/types";

const OFFER_SELECT = "*, program:programs ( id, slug, name, color, icon, offer_schema )";

type Raw = Omit<OfferWithProgram, "program"> & { program: ProgramLite & { offer_schema: unknown } };
const normalize = (o: Raw): OfferWithProgram => ({
  ...o,
  program: { ...o.program, offer_schema: (o.program.offer_schema ?? []) as FieldDef[] },
});

export type Counts = Record<string, { applicants: number; taken: number }>;

export async function getOfferCounts(ids: string[]): Promise<Counts> {
  if (!ids.length) return {};
  const supabase = await createClient();
  const { data } = await supabase.rpc("offer_counts", { p_offer_ids: ids });
  return Object.fromEntries((data ?? []).map((r) => [r.offer_id, { applicants: r.applicants, taken: r.taken }]));
}

/** Лента студента: RLS сам оставит только опубликованные офферы его программ. */
export async function getStudentFeed(userId: string) {
  const supabase = await createClient();
  const [{ data: offers }, { data: favs }] = await Promise.all([
    supabase
      .from("offers")
      .select(OFFER_SELECT)
      .in("status", ["open", "closed", "allocated"])
      .order("published_at", { ascending: false }),
    supabase.from("favorites").select("offer_id").eq("user_id", userId),
  ]);
  const list = ((offers ?? []) as unknown as Raw[]).map(normalize);
  const counts = await getOfferCounts(list.map((o) => o.id));
  return { offers: list, counts, favorites: (favs ?? []).map((f) => f.offer_id) };
}

export async function getOffer(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("offers").select(OFFER_SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  return normalize(data as unknown as Raw);
}

export async function isFavorite(userId: string, offerId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("favorites")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("offer_id", offerId);
  return !!count;
}

/** Для менеджера/админа: офферы программ, которыми он управляет (RLS). */
export async function getManagedOffers() {
  const supabase = await createClient();
  const { data } = await supabase.from("offers").select(OFFER_SELECT).order("created_at", { ascending: false });
  const list = ((data ?? []) as unknown as Raw[]).map(normalize);
  const counts = await getOfferCounts(list.map((o) => o.id));
  return { offers: list, counts };
}

/** Программы, где пользователь — менеджер (админ — все). */
export async function getManagedPrograms(userId: string, isAdmin: boolean) {
  const supabase = await createClient();
  if (isAdmin) {
    const { data } = await supabase.from("programs").select("id, slug, name, color, icon, offer_schema, tagline").eq("is_active", true).order("sort");
    return (data ?? []).map((p) => ({ ...p, offer_schema: p.offer_schema as FieldDef[] }));
  }
  const { data } = await supabase
    .from("program_managers")
    .select("program:programs ( id, slug, name, color, icon, offer_schema, tagline, is_active, sort )")
    .eq("user_id", userId);
  return (data ?? [])
    .map((r) => r.program!)
    .filter((p) => p.is_active)
    .sort((a, b) => a.sort - b.sort)
    .map((p) => ({ ...p, offer_schema: p.offer_schema as FieldDef[] }));
}
