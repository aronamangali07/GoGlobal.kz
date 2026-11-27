"use client";

import { motion } from "motion/react";
import { Hand, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { WindowState } from "./types";

/** Кнопка «Хочу». Подача заявки подключается на этапе 5. */
export function WantButton({ state, eligible }: { state: WindowState; eligible: boolean }) {
  const t = useTranslations("offers");
  const disabledReason = state !== "open" ? t("windowClosed") : !eligible ? t("notEligible") : null;

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        variant={disabledReason ? "secondary" : "accent"}
        disabled={!!disabledReason}
        className="w-full text-[17px]"
        onClick={() => toast(t("wantSoon"), { icon: "🛫" })}
      >
        {disabledReason ? <Lock className="size-[18px]" aria-hidden /> : (
          <motion.span animate={{ rotate: [0, 14, -8, 14, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.5 }}>
            <Hand className="size-5" aria-hidden />
          </motion.span>
        )}
        {disabledReason ?? t("want")}
      </Button>
    </div>
  );
}
