import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OfferForm } from "@/features/manage/offer-form";
import { getManagedPrograms, getOffer } from "@/lib/data/offers";
import { requireStaffSession } from "@/lib/data/staff";

export default async function EditOfferPage({ params }: PageProps<"/manage/offers/[id]/edit">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const t = await getTranslations("manage");
  const { user, profile } = await requireStaffSession();
  const [offer, programs] = await Promise.all([getOffer(id), getManagedPrograms(user.id, profile.role === "admin")]);
  if (!offer || !programs.some((p) => p.id === offer.program_id)) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/manage/offers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> {t("offersTitle")}
      </Link>
      <h1 className="mb-6 mt-3 font-display text-[26px] font-semibold sm:text-3xl">
        {t("edit")}: {offer.code ?? offer.title}
      </h1>
      <OfferForm
        programs={programs}
        initial={{
          id: offer.id,
          status: offer.status,
          program_id: offer.program_id,
          fields: offer.fields as Record<string, string | number | boolean | null>,
          seats_total: offer.seats_total,
          min_english: offer.min_english,
          min_age: offer.min_age,
          max_age: offer.max_age,
          interview_at: offer.interview_at,
          interview_note: offer.interview_note,
          window_start: offer.window_opens_at ? "custom" : "now",
          window_start_at: offer.window_opens_at,
          window_hours: offer.window_hours,
          allocation_mode: offer.allocation_mode,
          is_test: offer.is_test,
        }}
      />
    </div>
  );
}
