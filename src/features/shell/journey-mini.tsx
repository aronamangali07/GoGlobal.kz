import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { Enums } from "@/lib/supabase/database.types";

const STAGES: Enums<"journey_stage">[] = ["application", "interview", "offer", "documents", "embassy", "visa", "departure"];

/** Компактная полоска этапов на карточке программы. Полный «Мой путь» — этап 6. */
export async function JourneyMini({ stage }: { stage: Enums<"journey_stage"> }) {
  const t = await getTranslations("dashboard");
  const current = STAGES.indexOf(stage);
  return (
    <div className="border-t border-border bg-surface-2/60 px-4 py-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-fg-muted">{t("stage")}</span>
        <span className="font-semibold text-[var(--pc)]">{t(`stages.${stage}`)}</span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {STAGES.map((s, i) => (
          <span key={s} className={cn("h-1.5 flex-1 rounded-full", i <= current ? "bg-[var(--pc)]" : "bg-surface-3")} />
        ))}
      </div>
    </div>
  );
}
