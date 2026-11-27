"use client";

import { motion } from "motion/react";
import { BadgeCheck, Check, FileStack, Landmark, Lock, Mic, Plane, Send, Stamp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { celebrate } from "@/components/motion/confetti";
import { cn } from "@/lib/utils";

const STAGES = ["application", "interview", "offer", "documents", "embassy", "visa", "departure"] as const;
type Stage = (typeof STAGES)[number];
const ICONS = { application: Send, interview: Mic, offer: BadgeCheck, documents: FileStack, embassy: Landmark, visa: Stamp, departure: Plane };

const ROW = 112; // высота «уровня»

/**
 * Путь как карта уровней в игре: извилистая дорога, пройденные уровни — со звёздами,
 * текущий пульсирует, будущие закрыты замком.
 */
export function JourneyMap({ enrollmentId, stage, color }: { enrollmentId: string; stage: Stage; color: string }) {
  const t = useTranslations("journey");
  const current = STAGES.indexOf(stage);

  // Праздник при получении визы — один раз
  useEffect(() => {
    if (current < STAGES.indexOf("visa")) return;
    const key = `gg-visa-${enrollmentId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // приватный режим — всё равно отпразднуем
    }
    const id = setTimeout(celebrate, 500);
    return () => clearTimeout(id);
  }, [current, enrollmentId]);

  // Точки дороги: мягкий зигзаг в левой полосе, подписи — справа от неё
  const xs = STAGES.map((_, i) => (i % 2 === 0 ? 13 : 27));
  const points = STAGES.map((_, i) => ({ x: xs[i], y: i * ROW + ROW / 2 }));
  const pathFor = (upTo: number) =>
    points.slice(0, upTo + 1).reduce((d, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const midY = (prev.y + p.y) / 2;
      return `${d} C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
    }, "");
  const height = STAGES.length * ROW;

  return (
    <div className="relative mx-auto max-w-md" style={{ height, ["--pc" as string]: color }}>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
        <path d={pathFor(STAGES.length - 1)} fill="none" stroke="var(--border-strong)" strokeWidth="1.2" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 3 }} />
        <motion.path
          d={pathFor(current)}
          fill="none"
          stroke="var(--pc)"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 5 }}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
        />
      </svg>

      <ol className="relative h-full">
        {STAGES.map((s, i) => {
          const Icon = ICONS[s];
          const done = i < current;
          const isCurrent = i === current;
                    return (
            <motion.li
              key={s}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 260, damping: 20 }}
              className="absolute inset-x-0 flex items-center"
              style={{ top: i * ROW, height: ROW }}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="absolute -translate-x-1/2" style={{ left: `${xs[i]}%` }}>
                {isCurrent && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-[var(--pc)]"
                    animate={{ scale: [1, 1.6], opacity: [0.45, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    "relative grid size-14 place-items-center rounded-full border-4 shadow-[var(--shadow-soft)]",
                    done && "border-[var(--pc)] bg-[var(--pc)] text-white",
                    isCurrent && "border-[var(--pc)] bg-surface text-[var(--pc)]",
                    !done && !isCurrent && "border-border bg-surface-2 text-fg-subtle",
                  )}
                >
                  {done ? <Check className="size-6" strokeWidth={3} aria-hidden /> : i > current ? <Lock className="size-5" aria-hidden /> : <Icon className="size-6" aria-hidden />}
                </span>
                {done && (
                  <span className="absolute -right-1 -top-1 text-sm" aria-hidden>
                    ⭐
                  </span>
                )}
              </span>
              <span className={cn("ml-[calc(27%+40px)] min-w-0 pr-2", isCurrent && "rounded-2xl bg-[color-mix(in_oklab,var(--pc)_8%,transparent)] py-2 pl-3")}>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  {t("level", { n: i + 1 })}
                  {isCurrent && <span className="rounded-full bg-[var(--pc)] px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-white">{t("current")}</span>}
                </span>
                <span className={cn("block font-display text-base font-semibold leading-tight", !done && !isCurrent && "text-fg-subtle")}>
                  {t(`stages.${s}.title`)}
                </span>
                <span className="block text-xs leading-snug text-fg-muted">{t(`stages.${s}.text`)}</span>
              </span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
