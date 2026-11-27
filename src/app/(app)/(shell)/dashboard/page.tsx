import { ArrowRight, Compass } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { ProgramIcon } from "@/components/ui/program-icon";
import { requireOnboardedSession } from "@/lib/data/session";
import { profileCompleteness } from "@/features/profile/completeness";
import { JourneyMini } from "@/features/shell/journey-mini";
import { MyApplications } from "@/features/applications/my-applications";
import { getMyApplications } from "@/lib/data/applications";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const tp = await getTranslations("profile");
  const { profile, supabase, user } = await requireOnboardedSession();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, current_stage, programs ( name, tagline, color, icon )")
    .eq("user_id", user.id)
    .order("created_at");

  const apps = profile.role === "student" ? await getMyApplications(user.id) : [];
  const firstName = profile.full_name?.split(/\s+/)[0] ?? "";
  const percent = profileCompleteness(profile);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="font-display text-[26px] font-semibold leading-tight sm:text-3xl">
          {t("greeting", { name: firstName })}
        </h1>
        <p className="mt-1.5 text-fg-muted">{t("subtitle")}</p>
      </section>

      {profile.role !== "student" && (
        <Card className="border-dashed text-sm text-fg-muted">{t("staffNote")}</Card>
      )}

      {!!enrollments?.length && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">{t("myPrograms")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {enrollments.map((e) => {
              const p = e.programs!;
              return (
                <Card key={e.id} className="overflow-hidden p-0" style={{ ["--pc" as string]: p.color }}>
                  <div className="flex items-center gap-3 p-4">
                    <span className="grid size-11 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--pc)_16%,transparent)] text-[var(--pc)]">
                      <ProgramIcon name={p.icon} className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold">{p.name}</p>
                      <p className="truncate text-sm text-fg-muted">{p.tagline}</p>
                    </div>
                  </div>
                  <JourneyMini stage={e.current_stage} />
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {profile.role === "student" && <MyApplications apps={apps} />}

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-route-soft text-route">
            <Compass className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold">{t("nextTitle")}</p>
            <p className="mt-1 text-sm text-fg-muted">{t("nextOffers")}</p>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>{tp("completeness", { percent })}</span>
            <span className="text-primary">{percent}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-route" style={{ width: `${percent}%` }} />
          </div>
          {percent < 100 && (
            <Link href="/profile" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              {t("completeProfile")} <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </Card>
      </div>
    </div>
  );
}
