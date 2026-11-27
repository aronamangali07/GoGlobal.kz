import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { OfferForm } from "@/features/manage/offer-form";
import { getManagedPrograms } from "@/lib/data/offers";
import { requireStaffSession } from "@/lib/data/staff";

export default async function NewOfferPage() {
  const t = await getTranslations("manage");
  const { user, profile, supabase } = await requireStaffSession();
  const programs = await getManagedPrograms(user.id, profile.role === "admin");
  const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "default_window_hours").maybeSingle();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/manage/offers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> {t("offersTitle")}
      </Link>
      <h1 className="mb-6 mt-3 font-display text-[26px] font-semibold sm:text-3xl">{t("newOffer")}</h1>
      <OfferForm
        programs={programs}
        initial={{
          program_id: programs.length === 1 ? programs[0].id : undefined,
          fields: {},
          seats_total: 3,
          min_english: null,
          min_age: 18,
          max_age: 30,
          interview_at: null,
          interview_note: "",
          window_start: "now",
          window_start_at: null,
          window_hours: Number(setting?.value ?? 24),
          allocation_mode: "lottery",
          is_test: false,
        }}
      />
    </div>
  );
}
