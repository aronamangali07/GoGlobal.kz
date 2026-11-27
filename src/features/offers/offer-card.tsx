"use client";

import { motion } from "motion/react";
import { Clock, Lock, MapPin } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ProgramIcon } from "@/components/ui/program-icon";
import { COUNTRY_FLAGS } from "@/features/profile/constants";
import { cn } from "@/lib/utils";
import { Countdown } from "./countdown";
import { FavoriteButton } from "./favorite-button";
import { cardFacts } from "./format";
import { SeatsBar } from "./seats-bar";
import { isFresh, windowState, type OfferWithProgram } from "./types";

export function OfferCard({
  offer,
  taken,
  favorite,
  eligible,
  onFavorite,
  index = 0,
  showTest = false,
}: {
  offer: OfferWithProgram;
  taken: number;
  favorite: boolean;
  eligible: boolean;
  onFavorite?: (on: boolean) => void;
  index?: number;
  showTest?: boolean;
}) {
  const t = useTranslations("offers");
  const tp = useTranslations("profile");
  const state = windowState(offer);
  const isNew = isFresh(offer.published_at);
  const facts = cardFacts(offer.program.slug, offer.program.offer_schema, offer.fields as Record<string, never>, {
    yes: t("yes"),
    no: t("no"),
    country: (c) => tp(`country.${c}` as "country.us"),
    tips: t("tips"),
    hours: "ч/нед",
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3, delay: Math.min(index, 8) * 0.04 }}
      whileHover={{ y: -4 }}
      style={{ ["--pc" as string]: offer.program.color }}
    >
      <Link
        href={`/offers/${offer.id}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]"
      >
        {/* Шапка в цвете программы */}
        <div className="relative h-24 overflow-hidden bg-[linear-gradient(135deg,color-mix(in_oklab,var(--pc)_85%,#000)_0%,var(--pc)_55%,color-mix(in_oklab,var(--pc)_60%,#fff)_100%)] px-4 pt-3.5">
          <svg aria-hidden viewBox="0 0 300 100" className="absolute inset-0 size-full opacity-25" preserveAspectRatio="none">
            <path d="M-10 85 C 80 10, 200 10, 310 60" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="2 6" />
          </svg>
          <span className="absolute -right-3 -top-4 text-[86px] leading-none opacity-90 drop-shadow-sm transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110" aria-hidden>
            {COUNTRY_FLAGS[offer.country] ?? "🌍"}
          </span>
          <div className="relative flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              <ProgramIcon name={offer.program.icon} className="size-3.5" aria-hidden />
              {offer.program.name}
              {offer.code && <span className="opacity-80">· {offer.code}</span>}
            </span>
            {isNew && state === "open" && <Badge tone="accent" className="bg-white text-accent">{t("new")}</Badge>}
          </div>
        </div>
        <FavoriteButton offerId={offer.id} active={favorite} onChange={onFavorite} className="absolute right-3 top-[76px] shadow-[var(--shadow-soft)]" />

        <div className="flex flex-1 flex-col p-4 pt-3">
          <h3 className="pr-10 font-display text-[17px] font-semibold leading-snug">{offer.title}</h3>
          {offer.subtitle && <p className="mt-0.5 text-sm font-medium text-fg-muted">{offer.subtitle}</p>}
          {offer.city && (
            <p className="mt-1.5 flex items-center gap-1 text-sm text-fg-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden /> {offer.city}
            </p>
          )}

          {!!facts.length && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {facts.map((f) => (
                <li key={f} className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-semibold">
                  {f}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto pt-4">
            <SeatsBar taken={taken} total={offer.seats_total} />
            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold",
                  state === "open" ? "text-route" : "text-fg-subtle",
                )}
              >
                <Clock className="size-3.5" aria-hidden />
                {state === "open" && offer.window_closes_at ? (
                  <>
                    {t("closesIn", { time: "" }).trim()} <Countdown to={offer.window_closes_at} />
                  </>
                ) : state === "upcoming" && offer.window_opens_at ? (
                  <>
                    {t("opensIn", { time: "" }).trim()} <Countdown to={offer.window_opens_at} />
                  </>
                ) : (
                  t(`state.${state}`)
                )}
              </span>
              {!eligible && (
                <span className="inline-flex items-center gap-1 text-fg-subtle">
                  <Lock className="size-3" aria-hidden /> {t("notEligible")}
                </span>
              )}
              {showTest && offer.is_test && <Badge className="py-0.5">{t("test")}</Badge>}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
