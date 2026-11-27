import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { checkEligibility } from "@/features/offers/eligibility";
import { OfferDetail } from "@/features/offers/offer-detail";
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
  const [counts, favorite, programIds] = await Promise.all([
    getOfferCounts([offer.id]),
    staff ? false : isFavorite(user.id, offer.id),
    getMyProgramIds(user.id),
  ]);

  return (
    <OfferDetail
      offer={offer}
      taken={counts[offer.id]?.taken ?? 0}
      favorite={favorite}
      staffView={staff}
      backHref={staff ? "/manage/offers" : "/offers"}
      eligibility={staff ? undefined : checkEligibility(offer, { english_level: profile.english_level, birth_date: profile.birth_date, programIds })}
    />
  );
}
