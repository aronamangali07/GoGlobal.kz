"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function SeatsBar({ taken, total, className }: { taken: number; total: number; className?: string }) {
  const t = useTranslations("offers");
  const pct = Math.min(100, (taken / total) * 100);
  const full = taken >= total;
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">{t("seats", { taken, total })}</span>
        {!full && <span className="text-fg-muted">{t("seatsLeft", { count: total - taken })}</span>}
      </div>
      <div className="mt-1.5 flex gap-1" role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={taken} aria-label={t("seats", { taken, total })}>
        {total <= 12 ? (
          Array.from({ length: total }, (_, i) => (
            <motion.span
              key={i}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: i * 0.04 }}
              className={cn("h-2 flex-1 origin-left rounded-full", i < taken ? "bg-gradient-to-r from-accent to-[#ffb05c]" : "bg-surface-3")}
            />
          ))
        ) : (
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
            <motion.span className="block h-full rounded-full bg-gradient-to-r from-accent to-[#ffb05c]" initial={{ width: 0 }} animate={{ width: `${pct}%` }} />
          </span>
        )}
      </div>
    </div>
  );
}
