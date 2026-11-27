"use client";

import { AnimatePresence, motion } from "motion/react";
import { Archive, ArchiveRestore, Clock, Eye, Megaphone, Pencil, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgramIcon } from "@/components/ui/program-icon";
import { Countdown } from "@/features/offers/countdown";
import { SeatsBar } from "@/features/offers/seats-bar";
import { windowState, type OfferWithProgram } from "@/features/offers/types";
import { COUNTRY_FLAGS } from "@/features/profile/constants";
import { cn } from "@/lib/utils";
import { setOfferArchived } from "./actions";

type Tab = "active" | "draft" | "closed" | "archived";

function tabOf(o: OfferWithProgram): Tab {
  const s = windowState(o);
  if (s === "draft") return "draft";
  if (s === "archived") return "archived";
  if (s === "open" || s === "upcoming") return "active";
  return "closed";
}

export function ManagedOffers({
  offers,
  counts,
}: {
  offers: OfferWithProgram[];
  counts: Record<string, { applicants: number; taken: number }>;
}) {
  const t = useTranslations("manage");
  const to = useTranslations("offers");
  const ta = useTranslations("allocation");
  const [tab, setTab] = useState<Tab>("active");
  const [pending, start] = useTransition();
  const byTab = (x: Tab) => offers.filter((o) => tabOf(o) === x);
  const list = byTab(tab);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("offersTitle")}</h1>
          <p className="mt-1.5 text-sm text-fg-muted">{t("offersSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/manage/broadcast" className="lg:hidden">
            <Button size="lg" variant="secondary" aria-label="Рассылка"><Megaphone className="size-5" aria-hidden /></Button>
          </Link>
          <Link href="/manage/offers/new" className="flex-1">
            <Button size="lg" className="w-full sm:w-auto">
              <Plus className="size-5" aria-hidden /> {t("newOffer")}
            </Button>
          </Link>
        </div>
      </div>

      <div role="tablist" className="-mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {(["active", "draft", "closed", "archived"] as const).map((x) => (
          <button key={x} role="tab" aria-selected={tab === x} type="button" onClick={() => setTab(x)}
            className={cn("relative shrink-0 px-3.5 pb-3 pt-1 text-sm font-semibold transition-colors", tab === x ? "text-fg" : "text-fg-subtle hover:text-fg")}>
            {t(`tabs.${x}`)}
            <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 text-xs text-fg-muted">{byTab(x).length}</span>
            {tab === x && <motion.span layoutId="manage-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {list.length === 0 && (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-fg-muted">
              {t("emptyTab")}
            </motion.p>
          )}
          {list.map((o) => {
            const c = counts[o.id] ?? { applicants: 0, taken: 0 };
            const s = windowState(o);
            return (
              <motion.div key={o.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                style={{ ["--pc" as string]: o.program.color }}
                className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--pc)_16%,transparent)] text-[var(--pc)]">
                    <ProgramIcon name={o.program.icon} className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
                      <span>{o.program.name}</span>
                      {o.code && <span className="font-semibold text-fg">· {o.code}</span>}
                      {o.is_test && <Badge className="py-0.5">{to("test")}</Badge>}
                    </div>
                    <p className="mt-0.5 font-semibold leading-snug">
                      {COUNTRY_FLAGS[o.country] ?? ""} {o.title}
                      {o.subtitle && <span className="font-normal text-fg-muted"> — {o.subtitle}</span>}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                      <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden /> {t("applicants")}: <b className="text-fg">{c.applicants}</b></span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden />
                        {s === "open" && o.window_closes_at ? (<>{to("closesIn", { time: "" }).trim()} <Countdown to={o.window_closes_at} /></>)
                          : s === "upcoming" && o.window_opens_at ? (<>{to("opensIn", { time: "" }).trim()} <Countdown to={o.window_opens_at} /></>)
                          : to(`state.${s}`)}
                      </span>
                    </div>
                  </div>
                </div>
                {s !== "draft" && <SeatsBar taken={c.taken} total={o.seats_total} className="mt-3" />}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/offers/${o.id}`}><Button size="sm" variant="secondary"><Eye className="size-4" aria-hidden /> {t("view")}</Button></Link>
                  {s !== "draft" && (
                    <Link href={`/manage/offers/${o.id}/applications`}>
                      <Button size="sm" variant={s === "closed" ? "primary" : "secondary"}><Users className="size-4" aria-hidden /> {ta("applicationsBtn")} · {c.applicants}</Button>
                    </Link>
                  )}
                  {s !== "archived" && <Link href={`/manage/offers/${o.id}/edit`}><Button size="sm" variant="secondary"><Pencil className="size-4" aria-hidden /> {t("edit")}</Button></Link>}
                  <Button size="sm" variant="ghost" disabled={pending}
                    onClick={() => start(async () => {
                      const archived = s !== "archived";
                      const res = await setOfferArchived(o.id, archived);
                      if (res.ok) toast.success(archived ? t("archived") : t("restored"));
                    })}>
                    {s === "archived" ? <><ArchiveRestore className="size-4" aria-hidden /> {t("unarchive")}</> : <><Archive className="size-4" aria-hidden /> {t("archive")}</>}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
