import { Hourglass } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function Soon({ stage }: { stage: string }) {
  const t = await getTranslations("soon");
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-surface-2 text-fg-subtle">
        <Hourglass className="size-7" aria-hidden />
      </div>
      <h1 className="mt-5 font-display text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-2 max-w-sm text-fg-muted">{t("text", { stage })}</p>
      <Link href="/dashboard" className="mt-6 text-sm font-semibold text-primary hover:underline">
        {t("back")}
      </Link>
    </div>
  );
}
