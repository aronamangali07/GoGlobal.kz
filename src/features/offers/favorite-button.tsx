"use client";

import { AnimatePresence, motion } from "motion/react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleFavorite } from "./actions";

export function FavoriteButton({
  offerId,
  active,
  onChange,
  className,
  onColor = false,
}: {
  offerId: string;
  active: boolean;
  onChange?: (on: boolean) => void;
  className?: string;
  /** Кнопка поверх цветной шапки */
  onColor?: boolean;
}) {
  const t = useTranslations("offers");
  const [optimistic, setOptimistic] = useOptimistic(active);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? t("removeFavorite") : t("addFavorite")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = !optimistic;
        start(async () => {
          setOptimistic(next);
          onChange?.(next);
          const res = await toggleFavorite(offerId, next);
          if (!res.ok) {
            onChange?.(!next);
            toast.error("Не удалось сохранить");
          }
        });
      }}
      className={cn(
        "relative grid size-10 place-items-center rounded-full backdrop-blur transition-colors",
        className,
        onColor
          ? optimistic ? "bg-white text-[#ff4d6d]" : "bg-black/25 text-white hover:bg-black/35"
          : optimistic ? "bg-surface/80 text-[#ff4d6d]" : "bg-surface/80 text-fg-subtle hover:text-fg",
      )}
    >
      <motion.span key={String(optimistic)} initial={{ scale: 0.6 }} animate={{ scale: [1.3, 1] }} transition={{ duration: 0.3 }}>
        <Heart className="size-5" fill={optimistic ? "currentColor" : "none"} aria-hidden />
      </motion.span>
      <AnimatePresence>
        {optimistic && (
          <motion.span
            initial={{ scale: 0.4, opacity: 0.8 }}
            animate={{ scale: 1.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#ff4d6d]"
          />
        )}
      </AnimatePresence>
    </button>
  );
}
