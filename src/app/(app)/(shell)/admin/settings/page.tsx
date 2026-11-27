import { getTranslations } from "next-intl/server";
import { DEFAULT_WEIGHTS, type Weights } from "@/features/allocation/allocate";
import { SettingsForm } from "@/features/admin/settings-form";
import { requireAdminSession } from "@/lib/data/admin";

export default async function AdminSettingsPage() {
  const t = await getTranslations("admin.settings");
  const { supabase } = await requireAdminSession();
  const { data } = await supabase.from("app_settings").select("key, value");
  const get = (k: string) => data?.find((r) => r.key === k)?.value;
  const w = { ...DEFAULT_WEIGHTS, ...((get("allocation") ?? {}) as Partial<Weights>) };
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
      <p className="mb-5 mt-1.5 text-fg-muted">{t("subtitle")}</p>
      <SettingsForm initial={{ windowHours: Number(get("default_window_hours") ?? 24), ...w }} />
    </div>
  );
}
