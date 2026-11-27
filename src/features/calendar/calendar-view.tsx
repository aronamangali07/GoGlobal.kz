"use client";

import { motion } from "motion/react";
import { CalendarPlus, ChevronLeft, ChevronRight, Copy, Download, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EVENT_ICONS, type CountdownEvent } from "@/features/journey/event-countdown";
import { formatDate, TZ } from "@/features/offers/format";
import { downloadIcs } from "@/lib/ics";
import { cn } from "@/lib/utils";

export type CalEvent = CountdownEvent & { color: string; program: string };

const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD в Алматы

const TYPE_COLORS: Record<CalEvent["type"], string> = {
  interview: "var(--primary)",
  embassy: "var(--accent)",
  deadline: "var(--danger)",
  flight: "var(--route)",
  other: "var(--fg-subtle)",
};

export function CalendarView({ events, feedUrl }: { events: CalEvent[]; feedUrl: string }) {
  const t = useTranslations("calendar");
  const te = useTranslations("events");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    for (const e of events) {
      const k = dayKey(new Date(e.starts_at));
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return m;
  }, [events]);

  // Сетка: понедельник — первый день недели
  const first = new Date(month);
  const offset = (first.getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), 1 - offset + i));
  const todayKey = dayKey(new Date(nowMs));
  const title = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(month);

  const upcoming = events.filter((e) => Date.parse(e.starts_at) >= nowMs);
  const past = events.filter((e) => Date.parse(e.starts_at) < nowMs).reverse();
  const list = selected ? byDay.get(selected) ?? [] : upcoming;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={!events.length} onClick={() => downloadIcs(events, "goglobal.ics")}>
          <Download className="size-4" aria-hidden /> {t("exportAll")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(feedUrl).catch(() => {});
            toast.success(t("copied"), { description: t("subscribeHint") });
          }}
        >
          <Copy className="size-4" aria-hidden /> {t("subscribe")}
        </Button>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold capitalize">{title}</h2>
          <div className="flex gap-1">
            <button type="button" aria-label={t("prev")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid size-9 place-items-center rounded-full hover:bg-surface-2">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" aria-label={t("next")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid size-9 place-items-center rounded-full hover:bg-surface-2">
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-semibold uppercase text-fg-subtle">
          {(t.raw("weekdays") as string[]).map((w) => <span key={w} className="py-1">{w}</span>)}
        </div>
        <motion.div key={month.toISOString()} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const k = dayKey(d);
            const evs = byDay.get(k) ?? [];
            const inMonth = d.getMonth() === month.getMonth();
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSelected(selected === k ? null : k)}
                aria-pressed={selected === k}
                aria-label={`${d.getDate()}${evs.length ? `, ${evs.length}` : ""}`}
                className={cn(
                  "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors",
                  !inMonth && "text-fg-subtle/50",
                  k === todayKey && "font-bold text-primary",
                  selected === k ? "bg-primary text-primary-fg" : evs.length ? "bg-surface-2 hover:bg-surface-3" : "hover:bg-surface-2",
                )}
              >
                {d.getDate()}
                {evs.length > 0 && (
                  <span className="absolute bottom-1.5 flex gap-0.5">
                    {evs.slice(0, 3).map((e) => (
                      <span key={e.id} className="size-1.5 rounded-full" style={{ background: selected === k ? "currentColor" : TYPE_COLORS[e.type] }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </motion.div>
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">
          {selected ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(selected)) : t("upcoming")}
        </h2>
        {list.length ? (
          <ul className="flex flex-col gap-2.5">
            {list.map((e, i) => <EventItem key={e.id} e={e} i={i} label={te(`types.${e.type}`)} addLabel={te("addToCalendar")} />)}
          </ul>
        ) : (
          <Card className="text-sm text-fg-muted">{t("empty")}</Card>
        )}
      </section>

      {!selected && past.length > 0 && (
        <section className="opacity-70">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">{t("past")}</h2>
          <ul className="flex flex-col gap-2.5">
            {past.map((e, i) => <EventItem key={e.id} e={e} i={i} label={te(`types.${e.type}`)} addLabel={te("addToCalendar")} />)}
          </ul>
        </section>
      )}
    </div>
  );
}

function EventItem({ e, i, label, addLabel }: { e: CalEvent; i: number; label: string; addLabel: string }) {
  const Icon = EVENT_ICONS[e.type];
  return (
    <motion.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
      className="flex gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--shadow-soft)]">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: TYPE_COLORS[e.type] }}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold" style={{ color: e.color }}>{label} · {e.program}</p>
        <p className="font-semibold leading-snug">{e.title}</p>
        <p className="text-sm text-fg-muted">{formatDate(e.starts_at)}</p>
        {e.address && <p className="mt-0.5 flex items-start gap-1 text-sm text-fg-muted"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden /><span className="break-words">{e.address}</span></p>}
        {e.notes && <p className="mt-1 text-sm text-fg-muted">{e.notes}</p>}
      </div>
      <button type="button" aria-label={addLabel} title={addLabel} onClick={() => downloadIcs([e], "goglobal-event.ics")}
        className="grid size-9 shrink-0 place-items-center self-start rounded-full text-fg-subtle hover:bg-surface-2 hover:text-fg">
        <CalendarPlus className="size-[18px]" />
      </button>
    </motion.li>
  );
}
