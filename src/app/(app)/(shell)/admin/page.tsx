import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { ExportButtons } from "@/features/admin/export-buttons";
import { StatsView } from "@/features/admin/stats-view";
import { getStats, requireAdminSession } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Админка · GoGlobal" };

export default async function AdminDashboard() {
  const t = await getTranslations("admin.dashboard");
  const { supabase } = await requireAdminSession();
  const stats = await getStats(supabase);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-fg-muted">{t("subtitle")}</p>
      </div>
      <StatsView stats={stats} />
      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">{t("export")}</h2>
        <ExportButtons />
      </Card>
    </div>
  );
}
