import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PaymentList } from "@/features/payments/payment-list";
import { ProgramTabs } from "@/features/shell/program-tabs";
import { getMyEnrollments } from "@/lib/data/journey";
import { requireOnboardedSession } from "@/lib/data/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payments");
  return { title: `${t("title")} · GoGlobal` };
}

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const t = await getTranslations("payments");
  const { user, profile, supabase } = await requireOnboardedSession();
  if (profile.role !== "student") redirect("/dashboard");
  const { p } = await searchParams;
  const programs = (await getMyEnrollments(user.id)).map((e) => e.program!);
  const active = programs.find((x) => x.id === p) ?? programs[0];
  if (!active) redirect("/journey");
  const { data } = await supabase.from("payments").select("id, title, amount, currency, due_date, paid_at")
    .eq("user_id", user.id).eq("program_id", active.id).order("due_date", { ascending: true, nullsFirst: false });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
      <p className="mb-5 mt-1.5 text-fg-muted">{t("subtitle")}</p>
      <ProgramTabs base="/payments" programs={programs} active={active.id} />
      <PaymentList payments={data ?? []} />
    </div>
  );
}
