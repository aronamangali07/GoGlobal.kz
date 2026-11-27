import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { checkEligibility } from "@/features/offers/eligibility";
import { OfferDetail } from "@/features/offers/offer-detail";
import { StaffOfferActions } from "@/features/allocation/staff-offer-actions";
import { getAllocationPublic, getMyApplications } from "@/lib/data/applications";
import { getOffer, getOfferCounts, isFavorite } from "@/lib/data/offers";
import { getMyProgramIds, requireOnboardedSession } from "@/lib/data/session";

export async function generateMetadata({ params }: PageProps<"/offers/[id]">): Promise<Metadata> {
  const { id } = await params;
  const offer = /^[0-9a-f-]{36}$/.test(id) ? await getOffer(id) : null;
  return { title: offer ? `${offer.title} · GoGlobal` : "GoGlobal" };
}

export default async function OfferPage({ params }: PageProps<"/offers/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { profile, user } = await requireOnboardedSession();
  const offer = await getOffer(id);
  if (!offer) notFound();

  const staff = profile.role !== "student";
  const counts = await getOfferCounts([offer.id]);
  const c = counts[offer.id] ?? { applicants: 0, taken: 0 };

  if (staff) {
    const t = await getTranslations("allocation");
    return (
      <OfferDetail
        offer={offer}
        taken={c.taken}
        favorite={false}
        staffView
        backHref="/manage/offers"
        staffActions={<StaffOfferActions offerId={offer.id} applicants={c.applicants} label={t("applicationsBtn")} />}
      />
    );
  }

  const [favorite, programIds, apps, fairness] = await Promise.all([
    isFavorite(user.id, offer.id),
    getMyProgramIds(user.id),
    getMyApplications(user.id),
    getAllocationPublic(offer.id),
  ]);
  const mine = apps.find((a) => a.offer_id === offer.id) ?? null;
  const other = apps.find(
    (a) => a.offer_id !== offer.id && a.program_id === offer.program_id && ["pending", "selected", "approved"].includes(a.status),
  );

  return (
    <OfferDetail
      offer={offer}
      taken={c.taken}
      favorite={favorite}
      userId={user.id}
      eligibility={checkEligibility(offer, { english_level: profile.english_level, birth_date: profile.birth_date, programIds })}
      myApp={mine ? { id: mine.id, status: mine.status, rank: mine.lottery_rank } : null}
      conflict={other?.offer ? { offerId: other.offer_id, label: [other.offer.code, other.offer.title].filter(Boolean).join(" · ") } : null}
      fairness={fairness ? { seed: fairness.seed, ranks: fairness.ranks } : null}
    />
  );
}
