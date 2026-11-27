import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgramIcon } from "@/components/ui/program-icon";
import { COUNTRY_FLAGS } from "@/features/profile/constants";
import type { MyApplication } from "@/lib/data/applications";

const TONE: Record<string, "success" | "route" | "warning" | "danger" | "neutral"> = {
  selected: "success", approved: "success", pending: "route", waitlisted: "warning", rejected: "danger", ineligible: "neutral",
};

export async function MyApplications({ apps }: { apps: MyApplication[] }) {
  const t = await getTranslations("apply");
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">{t("myApplications")}</h2>
      {apps.length ? (
        <Card className="divide-y divide-border p-0">
          {apps.map((a) => (
            <Link key={a.id} href={`/offers/${a.offer_id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors first:rounded-t-[var(--radius-xl)] last:rounded-b-[var(--radius-xl)] hover:bg-surface-2"
              style={{ ["--pc" as string]: a.offer?.program?.color }}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--pc)_16%,transparent)] text-[var(--pc)]">
                <ProgramIcon name={a.offer?.program?.icon ?? "globe"} className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{COUNTRY_FLAGS[a.offer?.country ?? ""] ?? ""} {[a.offer?.code, a.offer?.title].filter(Boolean).join(" · ")}</span>
                <span className="block truncate text-sm text-fg-muted">{a.offer?.subtitle}</span>
              </span>
              <Badge tone={TONE[a.status] ?? "neutral"}>
                {t(`status.${a.status}` as "status.pending")}
                {a.status === "waitlisted" && a.lottery_rank ? ` · №${a.lottery_rank}` : ""}
              </Badge>
              <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            </Link>
          ))}
        </Card>
      ) : (
        <Card className="text-sm text-fg-muted">{t("noApplications")}</Card>
      )}
    </section>
  );
}
