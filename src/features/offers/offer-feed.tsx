"use client";

import { AnimatePresence, motion } from "motion/react";
import { Heart, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProgramIcon } from "@/components/ui/program-icon";
import { COUNTRY_FLAGS } from "@/features/profile/constants";
import { cn } from "@/lib/utils";
import { checkEligibility } from "./eligibility";
import { OfferCard } from "./offer-card";
import { windowState, type OfferWithProgram } from "./types";

type Sort = "new" | "closing" | "pay";

export type FeedStudent = { english_level: string | null; birth_date: string | null; programIds: string[] };

export function OfferFeed({
  offers,
  counts,
  favorites: initialFavorites,
  student,
  programs,
  myStatuses = {},
}: {
  offers: OfferWithProgram[];
  counts: Record<string, { taken: number }>;
  favorites: string[];
  student: FeedStudent;
  programs: { id: string; name: string; icon: string; color: string }[];
  myStatuses?: Record<string, string>;
}) {
  const t = useTranslations("offers");
  const tp = useTranslations("profile");
  const [program, setProgram] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [onlyEligible, setOnlyEligible] = useState(false);
  const [onlyFav, setOnlyFav] = useState(false);
  const [sort, setSort] = useState<Sort>("new");
  const [favorites, setFavorites] = useState(() => new Set(initialFavorites));

  const eligibility = useMemo(
    () => Object.fromEntries(offers.map((o) => [o.id, checkEligibility(o, student).eligible])),
    [offers, student],
  );
  const countries = useMemo(() => [...new Set(offers.map((o) => o.country).filter(Boolean))], [offers]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = offers.filter((o) => {
      if (program && o.program_id !== program) return false;
      if (country && o.country !== country) return false;
      if (onlyEligible && !eligibility[o.id]) return false;
      if (onlyFav && !favorites.has(o.id)) return false;
      if (q) {
        const hay = [o.title, o.subtitle, o.city, o.code, ...Object.values(o.fields as Record<string, unknown>)].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Открытые офферы всегда выше закрытых
    const openFirst = (o: OfferWithProgram) => (windowState(o) === "open" ? 0 : windowState(o) === "upcoming" ? 1 : 2);
    const rate = (o: OfferWithProgram) => Number((o.fields as Record<string, unknown>).hourly_rate ?? 0);
    return filtered.sort((a, b) => {
      const s = openFirst(a) - openFirst(b);
      if (s) return s;
      if (sort === "closing") return Date.parse(a.window_closes_at ?? "") - Date.parse(b.window_closes_at ?? "");
      if (sort === "pay") return rate(b) - rate(a);
      return Date.parse(b.published_at ?? b.created_at) - Date.parse(a.published_at ?? a.created_at);
    });
  }, [offers, program, country, onlyEligible, onlyFav, favorites, query, sort, eligibility]);

  const filtersActive = !!(program || country || onlyEligible || onlyFav || query);
  const reset = () => {
    setProgram(null);
    setCountry("");
    setOnlyEligible(false);
    setOnlyFav(false);
    setQuery("");
  };

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
      active ? "border-fg bg-fg text-bg" : "border-border-strong bg-surface text-fg-muted hover:text-fg",
    );

  return (
    <div>
      {/* Поиск */}
      <div className="flex h-12 items-center gap-2.5 rounded-2xl border border-border-strong bg-surface px-3.5 focus-within:border-primary">
        <Search className="size-[18px] text-fg-subtle" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-fg-subtle"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="text-fg-subtle hover:text-fg" aria-label="×">
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Программы — горизонтальная прокрутка на телефоне */}
      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <button type="button" className={chip(!program)} onClick={() => setProgram(null)}>
          {t("all")}
        </button>
        {programs.map((p) => (
          <button key={p.id} type="button" className={chip(program === p.id)} onClick={() => setProgram(program === p.id ? null : p.id)}>
            <ProgramIcon name={p.icon} className="size-4" style={{ color: program === p.id ? undefined : p.color }} aria-hidden />
            {p.name}
          </button>
        ))}
      </div>

      <div className="-mx-4 mt-2 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <button type="button" className={chip(onlyEligible)} aria-pressed={onlyEligible} onClick={() => setOnlyEligible((v) => !v)}>
          <Sparkles className="size-4" aria-hidden /> {t("onlyEligible")}
        </button>
        <button type="button" className={chip(onlyFav)} aria-pressed={onlyFav} onClick={() => setOnlyFav((v) => !v)}>
          <Heart className="size-4" aria-hidden /> {t("favorites")}
          {favorites.size > 0 && <span className="rounded-full bg-[#ff4d6d] px-1.5 text-[11px] text-white">{favorites.size}</span>}
        </button>
        {countries.length > 1 && (
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            aria-label={t("country")}
            className={cn(chip(!!country), "appearance-none pr-3.5")}
          >
            <option value="">{t("anyCountry")}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {COUNTRY_FLAGS[c]} {tp(`country.${c}` as "country.us")}
              </option>
            ))}
          </select>
        )}
        <label className={cn(chip(false), "relative")}>
          <SlidersHorizontal className="size-4" aria-hidden />
          <span className="sr-only">{t("sort.label")}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="appearance-none bg-transparent outline-none">
            <option value="new">{t("sort.new")}</option>
            <option value="closing">{t("sort.closing")}</option>
            <option value="pay">{t("sort.pay")}</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-fg-muted">
        <span aria-live="polite">{t("found", { count: list.length })}</span>
        {filtersActive && (
          <button type="button" onClick={reset} className="font-semibold text-primary hover:underline">
            {t("resetFilters")}
          </button>
        )}
      </div>

      {list.length ? (
        <motion.div layout className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((o, i) => (
              <OfferCard
                key={o.id}
                index={i}
                offer={o}
                taken={counts[o.id]?.taken ?? 0}
                favorite={favorites.has(o.id)}
                eligible={eligibility[o.id]}
                myStatus={myStatuses[o.id]}
                onFavorite={(on) =>
                  setFavorites((prev) => {
                    const next = new Set(prev);
                    if (on) next.add(o.id);
                    else next.delete(o.id);
                    return next;
                  })
                }
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="mt-10 flex flex-col items-center text-center">
          <span className="text-5xl" aria-hidden>🛫</span>
          <p className="mt-4 max-w-xs text-fg-muted">{offers.length ? t("empty") : t("emptyNone")}</p>
          {filtersActive && (
            <Button variant="secondary" className="mt-4" onClick={reset}>
              {t("resetFilters")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
