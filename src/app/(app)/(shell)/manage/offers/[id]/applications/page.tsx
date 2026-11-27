import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Ranked } from "@/features/allocation/allocate";
import { AllocationBoard } from "@/features/allocation/allocation-board";
import { runAllocationDraft } from "@/features/allocation/run";
import { windowState } from "@/features/offers/types";
import { SeatsBar } from "@/features/offers/seats-bar";
import { ageFrom } from "@/features/profile/constants";
import { getOffer, getOfferCounts } from "@/lib/data/offers";
import { requireStaffSession } from "@/lib/data/staff";

export default async function OfferApplicationsPage({ params }: PageProps<"/manage/offers/[id]/applications">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const t = await getTranslations("allocation");
  const { supabase, user } = await requireStaffSession();
  let offer = await getOffer(id);
  if (!offer) notFound();

  // Окно истекло, а крон ещё не успел — закрываем и сразу считаем черновик
  if (windowState(offer) === "closed" && offer.status === "open") {
    await supabase.rpc("close_offer_window", { p_offer_id: id });
    offer = (await getOffer(id))!;
  }
  const loadRun = () =>
    supabase.from("allocation_runs").select("id, seed, result, confirmed_at, params").eq("offer_id", id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
  let { data: run } = await loadRun();
  if (!run && offer.status === "closed") {
    try {
      await runAllocationDraft(supabase, id, user.id);
      ({ data: run } = await loadRun());
    } catch {
      // нет заявок или нет доступа — покажем кнопку «Распределить»
    }
  }

  const [{ data: inputs }, counts] = await Promise.all([
    supabase.rpc("allocation_inputs", { p_offer_id: id }),
    getOfferCounts([id]),
  ]);
  const { data: apps } = await supabase.from("applications").select("id, lottery_rank").eq("offer_id", id);
  const ranks = Object.fromEntries((apps ?? []).map((a) => [a.id, a.lottery_rank]));
  const paths = (inputs ?? []).map((i) => i.avatar_path).filter(Boolean) as string[];
  const { data: signed } = paths.length ? await supabase.storage.from("avatars").createSignedUrls(paths, 3600) : { data: [] };
  const urlByPath = Object.fromEntries((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const c = counts[id] ?? { applicants: 0, taken: 0 };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/manage/offers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> {offer.code ?? offer.program.name}
      </Link>
      <h1 className="mt-3 font-display text-[24px] font-semibold leading-tight sm:text-3xl">{t("title")}</h1>
      <p className="mt-1 text-fg-muted">
        <Link href={`/offers/${offer.id}`} className="hover:underline">{[offer.code, offer.title, offer.subtitle].filter(Boolean).join(" · ")}</Link>
      </p>
      <SeatsBar taken={c.taken} total={offer.seats_total} className="my-5" />
      <AllocationBoard
        offerId={offer.id}
        state={windowState(offer)}
        seats={offer.seats_total}
        windowClosesAt={offer.window_closes_at}
        run={run ? {
          id: run.id,
          seed: run.seed,
          result: run.result as unknown as Ranked[],
          confirmed: !!run.confirmed_at,
          mode: ((run.params as { mode?: string })?.mode === "manual" ? "manual" : "lottery"),
        } : null}
        applicants={(inputs ?? []).map((i) => ({
          applicationId: i.application_id,
          name: i.full_name ?? "—",
          avatarUrl: i.avatar_path ? urlByPath[i.avatar_path] ?? null : null,
          english: i.english_level,
          age: ageFrom(i.birth_date),
          status: i.status,
          rank: ranks[i.application_id] ?? null,
        }))}
      />
    </div>
  );
}
