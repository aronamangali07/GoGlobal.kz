"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarPlus, MapPin } from "lucide-react";
import { EVENT_ICONS } from "./event-icons";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/features/offers/format";
import { downloadIcs } from "@/lib/ics";
import { cn } from "@/lib/utils";

export type CountdownEvent = {
  id: string;
  type: "interview" | "embassy" | "deadline" | "flight" | "other";
  title: string;
  starts_at: string;
  ends_at?: string | null;
  address: string;
  notes: string;
};

export { EVENT_ICONS };

function Digit({ value, label }: { value: number; label: string }) {
  const text = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-12 w-14 overflow-hidden rounded-xl bg-white/15 sm:h-14 sm:w-16">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={text}
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 grid place-items-center font-display text-2xl font-semibold tabular-nums sm:text-3xl"
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-1 text-[11px] uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
}

/** Большой обратный отсчёт до ближайшего события. */
export function EventCountdown({ event, color }: { event: CountdownEvent; color?: string }) {
  const t = useTranslations("events");
  const tj = useTranslations("journey");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const ms = Math.max(0, Date.parse(event.starts_at) - (now ?? Date.parse(event.starts_at)));
  const parts = [
    { v: Math.floor(ms / 86_400_000), l: t("countdown.d") },
    { v: Math.floor((ms % 86_400_000) / 3_600_000), l: t("countdown.h") },
    { v: Math.floor((ms % 3_600_000) / 60_000), l: t("countdown.m") },
    { v: Math.floor((ms % 60_000) / 1000), l: t("countdown.s") },
  ];
  const Icon = EVENT_ICONS[event.type];

  return (
    <div
      className="relative overflow-hidden rounded-[28px] p-5 text-white shadow-[var(--shadow-lift)] sm:p-6"
      style={{ background: `linear-gradient(135deg, color-mix(in oklab, ${color ?? "var(--primary)"} 85%, #000), ${color ?? "var(--primary)"} 60%, var(--route))` }}
    >
      <svg aria-hidden viewBox="0 0 400 160" className="absolute inset-0 size-full opacity-20" preserveAspectRatio="none">
        <path d="M-20 140 C 120 10, 280 10, 420 90" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="2 7" />
      </svg>
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-85">{tj("nextEvent")}</p>
        <div className="mt-2 flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/20">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold leading-snug">{event.title}</p>
            <p className="text-sm opacity-90">{t(`types.${event.type}`)} · {formatDate(event.starts_at)}</p>
            {event.address && (
              <p className="mt-0.5 flex items-start gap-1 text-sm opacity-90">
                <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden /> <span className="break-words">{event.address}</span>
              </p>
            )}
          </div>
        </div>
        <div className={cn("mt-5 flex justify-between gap-2 sm:justify-start sm:gap-3", now === null && "opacity-0")} aria-live="off">
          {parts.map((p) => (
            <Digit key={p.l} value={p.v} label={p.l} />
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="mt-4 bg-white/15 text-white hover:bg-white/25 hover:text-white"
          onClick={() => downloadIcs([event], "goglobal-event.ics")}
        >
          <CalendarPlus className="size-4" aria-hidden /> {t("addToCalendar")}
        </Button>
      </div>
    </div>
  );
}
