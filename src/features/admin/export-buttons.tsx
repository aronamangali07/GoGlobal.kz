import { Download } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function ExportButtons() {
  const t = await getTranslations("admin.export");
  const kinds = ["students", "applications", "payments", "audit"] as const;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {kinds.map((k) => (
          <a key={k} href={`/api/admin/export/${k}`} download
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-surface-2 px-3.5 text-sm font-semibold hover:bg-surface-3">
            <Download className="size-4" aria-hidden /> {t(k)}.csv
          </a>
        ))}
      </div>
      <p className="text-xs text-fg-subtle">{t("hint")}</p>
    </div>
  );
}
