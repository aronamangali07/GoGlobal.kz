import { ArrowLeft, CalendarClock, Check, Clock, Info, MapPin, Shuffle, X } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgramIcon } from "@/components/ui/program-icon";
import { COUNTRY_FLAGS } from "@/features/profile/constants";
import { cn } from "@/lib/utils";
import { Countdown } from "./countdown";
import { EarningsCalculator } from "./earnings-calculator";
import type { EligibilityCheck } from "./eligibility";
import { FavoriteButton } from "./favorite-button";
import { formatDate, formatFieldValue } from "./format";
import { SeatsBar } from "./seats-bar";
import { windowState, type FieldValues, type OfferWithProgram } from "./types";
import { WantButton, type MyAppState } from "./want-button";
import { FairnessPanel } from "@/features/allocation/fairness-panel";

export async function OfferDetail({
  offer,
  taken,
  favorite,
  eligibility,
  backHref = "/offers",
  staffView = false,
  myApp = null,
  conflict = null,
  fairness = null,
  userId,
  staffActions,
}: {
  offer: OfferWithProgram;
  taken: number;
  favorite: boolean;
  eligibility?: { eligible: boolean; checks: EligibilityCheck[] };
  backHref?: string;
  staffView?: boolean;
  myApp?: MyAppState;
  conflict?: { offerId: string; label: string } | null;
  fairness?: { seed: string; ranks: { rank: number; ticket: string; outcome: "selected" | "waitlisted" | "ineligible"; me: boolean }[] } | null;
  userId?: string;
  staffActions?: React.ReactNode;
}) {
  const t = await getTranslations("offers");
  const tp = await getTranslations("profile");
  const tm = await getTranslations("manage");
  const f = offer.fields as FieldValues;
  const state = windowState(offer);
  const labels = { yes: t("yes"), no: t("no"), country: (c: string) => tp(`country.${c}` as "country.us") };
  const rows = offer.program.offer_schema
    .map((def) => ({ def, value: formatFieldValue(def, f[def.key], labels) }))
    .filter((r) => r.value !== null && r.def.key !== "code");
  const windowHours =
    offer.window_opens_at && offer.window_closes_at
      ? Math.round((Date.parse(offer.window_closes_at) - Date.parse(offer.window_opens_at)) / 3_600_000)
      : 24;
  const isWT = offer.program.slug === "work-and-travel" && Number(f.hourly_rate) > 0;
  const fairSteps = (t.raw("fairSteps") as string[]).map((s) => s.replace("{hours}", String(windowHours)));

  return (
    <div className="mx-auto max-w-5xl" style={{ ["--pc" as string]: offer.program.color }}>
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> {staffView ? tm("offersTitle") : t("back")}
      </Link>

      {/* Герой */}
      <div className="relative mt-4 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--pc)_80%,#000)_0%,var(--pc)_60%,color-mix(in_oklab,var(--pc)_55%,#fff)_100%)] p-5 text-white sm:p-8">
        <svg aria-hidden viewBox="0 0 400 160" className="absolute inset-0 size-full opacity-25" preserveAspectRatio="none">
          <path d="M-20 140 C 120 10, 280 10, 420 90" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="2 7" />
        </svg>
        <span className="absolute -bottom-5 -right-4 text-[110px] leading-none opacity-30 sm:text-[180px] sm:opacity-90" aria-hidden>
          {COUNTRY_FLAGS[offer.country] ?? "🌍"}
        </span>
        <div className="relative pr-10 sm:max-w-[75%] sm:pr-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-xs font-semibold backdrop-blur">
              <ProgramIcon name={offer.program.icon} className="size-3.5" aria-hidden /> {offer.program.name}
            </span>
            {offer.code && <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">{offer.code}</span>}
            {staffView && offer.is_test && <Badge className="bg-white/90 text-fg">{t("test")}</Badge>}
          </div>
          <h1 className="mt-4 font-display text-[22px] font-semibold leading-tight sm:text-4xl">{offer.title}</h1>
          {offer.subtitle && <p className="mt-1.5 text-base font-medium text-white/90 sm:text-lg">{offer.subtitle}</p>}
          {offer.city && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
              <MapPin className="size-4" aria-hidden /> {offer.city}
            </p>
          )}
        </div>
        {!staffView && <FavoriteButton offerId={offer.id} active={favorite} onColor className="absolute right-4 top-4" />}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="font-display text-lg font-semibold">{t("details")}</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {rows.map(({ def, value }) => (
                <div key={def.key} className={cn(def.type === "textarea" && "sm:col-span-2")}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{def.label}</dt>
                  <dd className="mt-1 whitespace-pre-line font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {isWT && (
            <EarningsCalculator
              baseRate={Number(f.hourly_rate)}
              rateMax={Number(f.rate_potential) || Number(f.hourly_rate) + (f.tips ? 8 : 0)}
              hoursMin={Number(f.hours_min) || 30}
              hoursMax={Number(f.hours_max) || 40}
              housing={Number(f.housing_cost) || 0}
            />
          )}

          <Card>
            <div className="flex items-center gap-2.5">
              <Shuffle className="size-5 text-route" aria-hidden />
              <h2 className="font-display text-lg font-semibold">{t("fairTitle")}</h2>
            </div>
            {offer.allocation_mode === "manual" ? (
              <p className="mt-3 text-sm text-fg-muted">{t("mode.manual")}</p>
            ) : (
              <ol className="mt-4 flex flex-col gap-3">
                {fairSteps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-route-soft text-xs font-bold text-route">{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {fairness && <FairnessPanel seed={fairness.seed} ranks={fairness.ranks} userId={userId} />}
        </div>

        {/* Правая колонка: места, окно, требования, кнопка */}
        <div className="order-first flex flex-col gap-5 lg:order-none lg:sticky lg:top-20 lg:self-start">
          <Card className="flex flex-col gap-4">
            <SeatsBar taken={taken} total={offer.seats_total} />
            <div className="flex items-start gap-3 text-sm">
              <Clock className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
              <div>
                <p className="font-semibold">
                  {state === "open" && offer.window_closes_at ? (
                    <span className="text-route">
                      {t("closesIn", { time: "" }).trim()} <Countdown to={offer.window_closes_at} />
                    </span>
                  ) : state === "upcoming" && offer.window_opens_at ? (
                    <>{t("opensIn", { time: "" }).trim()} <Countdown to={offer.window_opens_at} /></>
                  ) : (
                    t(`state.${state}`)
                  )}
                </p>
                {offer.window_opens_at && offer.window_closes_at && (
                  <p className="mt-0.5 text-fg-muted">
                    {t("window")}: {t("windowFromTo", { from: formatDate(offer.window_opens_at), to: formatDate(offer.window_closes_at) })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden />
              <div>
                <p className="font-semibold">{offer.interview_at ? t("interviewAt", { date: formatDate(offer.interview_at) }) : t("interviewTbd")}</p>
                {offer.interview_note && <p className="mt-0.5 text-fg-muted">{offer.interview_note}</p>}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-base font-semibold">{t("requirements")}</h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm">
              {offer.min_english && !eligibility && <li>{t("reqEnglishPlain", { need: offer.min_english })}</li>}
              {(offer.min_age || offer.max_age) && !eligibility && (
                <li>{t("reqAgePlain", { need: `${offer.min_age ?? ""}–${offer.max_age ?? ""}` })}</li>
              )}
              {eligibility?.checks.map((c) => (
                <li key={c.key} className="flex items-start gap-2.5">
                  <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", c.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
                    {c.ok ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span>
                    {c.key === "program" ? t("reqProgram") : c.key === "english" ? t("reqEnglish", { need: c.need!, have: c.have! }) : t("reqAge", { need: c.need!, have: c.have! })}
                  </span>
                </li>
              ))}
            </ul>
            {eligibility?.eligible && (
              <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-success-soft px-3 py-2 text-sm font-semibold text-success">
                <Info className="size-4" aria-hidden /> {t("reqAllOk")}
              </p>
            )}
          </Card>

          {staffActions}
          {!staffView && (
            <div
              className={cn(
                myApp
                  ? "" // статус заявки — обычный блок в колонке
                  : "fixed inset-x-0 bottom-16 z-30 border-t border-border bg-bg/90 p-4 backdrop-blur-lg lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none",
              )}
            >
              <WantButton offerId={offer.id} state={state} eligible={eligibility?.eligible ?? false} myApp={myApp} conflict={conflict} />
            </div>
          )}
        </div>
      </div>
      {!staffView && !myApp && <div className="h-20 lg:hidden" aria-hidden />}
    </div>
  );
}
