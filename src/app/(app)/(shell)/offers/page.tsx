import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { OfferFeed } from "@/features/offers/offer-feed";
import { getStudentFeed } from "@/lib/data/offers";
import { getActivePrograms, getMyProgramIds, requireOnboardedSession } from "@/lib/data/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("offers");
  return { title: `${t("title")} · GoGlobal` };
}

export default async function OffersPage() {
  const t = await getTranslations("offers");
  const { profile, user } = await requireOnboardedSession();
  if (profile.role !== "student") redirect("/manage/offers");

  const [{ offers, counts, favorites }, programIds, programs] = await Promise.all([
    getStudentFeed(user.id),
    getMyProgramIds(user.id),
    getActivePrograms(),
  ]);

  return (
    <div>
      <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
      <p className="mb-5 mt-1.5 max-w-2xl text-sm text-fg-muted">{t("subtitle")}</p>
      <OfferFeed
        offers={offers}
        counts={counts}
        favorites={favorites}
        student={{ english_level: profile.english_level, birth_date: profile.birth_date, programIds }}
        programs={programs.filter((p) => programIds.includes(p.id)).map(({ id, name, icon, color }) => ({ id, name, icon, color }))}
      />
    </div>
  );
}
