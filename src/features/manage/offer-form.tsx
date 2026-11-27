"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Send, Save, Shuffle, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgramIcon } from "@/components/ui/program-icon";
import { Textarea } from "@/components/ui/textarea";
import type { FieldDef, FieldValues } from "@/features/offers/types";
import { ALL_COUNTRIES, COUNTRY_FLAGS, ENGLISH_LEVELS } from "@/features/profile/constants";
import { cn } from "@/lib/utils";
import { saveOffer } from "./actions";

export type ManagedProgram = { id: string; slug: string; name: string; tagline: string; color: string; icon: string; offer_schema: FieldDef[] };

export type OfferFormInitial = {
  id?: string;
  status?: string;
  program_id?: string;
  fields: FieldValues;
  seats_total: number;
  min_english: string | null;
  min_age: number | null;
  max_age: number | null;
  interview_at: string | null;
  interview_note: string;
  window_start: "now" | "custom";
  window_start_at: string | null;
  window_hours: number;
  allocation_mode: "lottery" | "manual";
  is_test: boolean;
};

const HOURS = [12, 24, 48, 72];
const selectCls =
  "h-12 w-full appearance-none rounded-[var(--radius-md)] border border-border-strong bg-surface px-3.5 text-[16px] outline-none focus:border-primary";

/** ISO → значение для <input type="datetime-local"> в часовом поясе браузера. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">{children}</label>;
}

function DynamicField({
  def,
  value,
  error,
  onChange,
}: {
  def: FieldDef;
  value: FieldValues[string];
  error?: string;
  onChange: (v: FieldValues[string]) => void;
}) {
  const tm = useTranslations("manage");
  const tp = useTranslations("profile");
  const label = `${def.label}${def.required ? " *" : ""}`;
  const id = `f-${def.key}`;
  switch (def.type) {
    case "textarea":
      return <Textarea id={id} label={label} value={String(value ?? "")} error={error} onChange={(e) => onChange(e.target.value)} />;
    case "boolean":
      return (
        <label className="flex h-12 cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border-strong bg-surface px-3.5 sm:mt-6">
          <span className="text-sm font-medium">{def.label}</span>
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
          <span className="relative h-6 w-11 rounded-full bg-surface-3 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5" />
        </label>
      );
    case "select":
    case "country":
      return (
        <div>
          <Label htmlFor={id}>{label}</Label>
          <select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={cn(selectCls, error && "border-danger")}>
            <option value="">{def.type === "country" ? tm("countrySelect") : tm("select")}</option>
            {def.type === "country"
              ? ALL_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {COUNTRY_FLAGS[c]} {tp(`country.${c}`)}
                  </option>
                ))
              : def.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
        </div>
      );
    default:
      return (
        <Input
          id={id}
          label={label}
          type={def.type === "number" || def.type === "money" ? "number" : def.type === "date" ? "date" : "text"}
          inputMode={def.type === "money" ? "decimal" : def.type === "number" ? "numeric" : undefined}
          step={def.type === "money" ? "0.01" : undefined}
          min={def.type === "number" || def.type === "money" ? 0 : undefined}
          value={value === null || value === undefined ? "" : String(value)}
          error={error}
          trailing={def.unit ? <span className="text-sm text-fg-subtle">{def.unit}</span> : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function OfferForm({ programs, initial }: { programs: ManagedProgram[]; initial: OfferFormInitial }) {
  const t = useTranslations("manage");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [intent, setIntent] = useState<string | null>(null);
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const program = programs.find((p) => p.id === v.program_id);
  const isDraft = !initial.id || initial.status === "draft";

  const set = <K extends keyof OfferFormInitial>(k: K, value: OfferFormInitial[K]) => setV((p) => ({ ...p, [k]: value }));
  const err = (k: string) => (errors[k] ? (t.has(errors[k] as "invalid") ? t(errors[k] as "invalid") : t("invalid")) : undefined);

  const submit = (mode: "draft" | "publish" | "save") => {
    setIntent(mode);
    startTransition(async () => {
      const res = await saveOffer(v, mode);
      if (!res.ok) {
        setErrors(res.errors ?? {});
        toast.error(res.error === "noAccess" ? t("noAccess") : t("invalid"));
        const first = Object.keys(res.errors ?? {})[0];
        if (first) document.getElementById(first.startsWith("fields.") ? `f-${first.slice(7)}` : `c-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      toast.success(mode === "publish" ? t("published") : t("saved"));
      router.push(`/offers/${res.id}`);
      router.refresh();
    });
  };

  // Шаг 1 — выбор программы
  if (!program) {
    return (
      <div>
        <h2 className="font-display text-xl font-semibold">{t("chooseProgram")}</h2>
        <p className="mt-1 text-sm text-fg-muted">{t("chooseProgramText")}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {programs.map((p, i) => (
            <motion.button
              key={p.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => set("program_id", p.id)}
              style={{ ["--pc" as string]: p.color }}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 text-left shadow-[var(--shadow-soft)] hover:border-[var(--pc)]"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--pc)_16%,transparent)] text-[var(--pc)]">
                <ProgramIcon name={p.icon} className="size-7" aria-hidden />
              </span>
              <span>
                <span className="block text-lg font-semibold">{p.name}</span>
                <span className="block text-sm text-fg-muted">{p.tagline}</span>
                <span className="mt-1 block text-xs text-fg-subtle">{p.offer_schema.length} полей</span>
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate className="flex flex-col gap-4" style={{ ["--pc" as string]: program.color }}>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
        <span className="grid size-11 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--pc)_16%,transparent)] text-[var(--pc)]">
          <ProgramIcon name={program.icon} className="size-5" aria-hidden />
        </span>
        <span className="flex-1 font-semibold">{program.name}</span>
        {!initial.id && (
          <Button type="button" variant="ghost" size="sm" onClick={() => set("program_id", undefined)}>
            <ArrowLeft className="size-4" aria-hidden /> <span className="sr-only sm:not-sr-only">{t("chooseProgram")}</span>
          </Button>
        )}
      </div>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">{t("sectionFields")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {program.offer_schema.map((def) => (
            <div key={def.key} className={cn(def.type === "textarea" && "sm:col-span-2")}>
              <DynamicField
                def={def}
                value={v.fields[def.key] ?? (def.type === "boolean" ? false : "")}
                error={err(`fields.${def.key}`)}
                onChange={(val) => set("fields", { ...v.fields, [def.key]: val })}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">{t("sectionSeats")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="c-seats_total" label={`${t("seatsTotal")} *`} type="number" min={1} inputMode="numeric" value={String(v.seats_total)}
            error={err("seats_total")} onChange={(e) => set("seats_total", Number(e.target.value))} />
          <div>
            <Label htmlFor="c-min_english">{t("minEnglish")}</Label>
            <select id="c-min_english" className={selectCls} value={v.min_english ?? ""} onChange={(e) => set("min_english", e.target.value || null)}>
              <option value="">{t("noRequirement")}</option>
              {ENGLISH_LEVELS.map((l) => <option key={l} value={l}>{l}+</option>)}
            </select>
          </div>
          <Input id="c-min_age" label={t("minAge")} type="number" inputMode="numeric" value={v.min_age ?? ""} error={err("min_age")}
            onChange={(e) => set("min_age", e.target.value ? Number(e.target.value) : null)} />
          <Input id="c-max_age" label={t("maxAge")} type="number" inputMode="numeric" value={v.max_age ?? ""} error={err("max_age")}
            onChange={(e) => set("max_age", e.target.value ? Number(e.target.value) : null)} />
        </div>
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium">{t("mode")}</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {([
              ["lottery", Shuffle, t("modeLottery"), t("modeLotteryHint")],
              ["manual", UserCheck, t("modeManual"), t("modeManualHint")],
            ] as const).map(([mode, Icon, title, hint]) => (
              <button key={mode} type="button" aria-pressed={v.allocation_mode === mode} onClick={() => set("allocation_mode", mode)}
                className={cn("flex gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                  v.allocation_mode === mode ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-border-strong")}>
                <Icon className={cn("mt-0.5 size-5 shrink-0", v.allocation_mode === mode ? "text-primary" : "text-fg-subtle")} aria-hidden />
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-xs text-fg-muted">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">{t("sectionWindow")}</h2>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("windowStart")}</legend>
          <div className="flex flex-wrap gap-2">
            {(isDraft ? (["now", "custom"] as const) : (["custom"] as const)).map((s) => (
              <button key={s} type="button" aria-pressed={v.window_start === s} onClick={() => set("window_start", s)}
                className={cn("h-10 rounded-full border px-4 text-sm font-semibold",
                  v.window_start === s ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-fg-muted")}>
                {s === "now" ? t("startNow") : t("startAt")}
              </button>
            ))}
          </div>
          <AnimatePresence initial={false}>
            {v.window_start === "custom" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pt-3 sm:max-w-xs">
                  <Input id="c-window_start_at" type="datetime-local" value={toLocalInput(v.window_start_at)} error={err("window_start_at")}
                    onChange={(e) => set("window_start_at", fromLocalInput(e.target.value))} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </fieldset>
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium">{t("windowHours")}</legend>
          <div className="flex flex-wrap items-center gap-2">
            {HOURS.map((h) => (
              <button key={h} type="button" aria-pressed={v.window_hours === h} onClick={() => set("window_hours", h)}
                className={cn("h-10 rounded-full border px-4 text-sm font-semibold",
                  v.window_hours === h ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-fg-muted")}>
                {t("hours", { n: h })}
              </button>
            ))}
            <div className="w-28">
              <Input id="c-window_hours" type="number" min={1} max={720} aria-label={t("customHours")} value={String(v.window_hours)}
                error={err("window_hours")} trailing={<span className="text-sm text-fg-subtle">ч</span>}
                onChange={(e) => set("window_hours", Number(e.target.value))} />
            </div>
          </div>
        </fieldset>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input id="c-interview_at" label={t("interviewAt")} type="datetime-local" value={toLocalInput(v.interview_at)}
            onChange={(e) => set("interview_at", fromLocalInput(e.target.value))} />
          <Input id="c-interview_note" label={t("interviewNote")} placeholder={t("interviewNotePlaceholder")} value={v.interview_note}
            onChange={(e) => set("interview_note", e.target.value)} />
        </div>
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-3.5">
          <input type="checkbox" checked={v.is_test} onChange={(e) => set("is_test", e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
          <span>
            <span className="block text-sm font-semibold">{t("isTest")}</span>
            <span className="block text-xs text-fg-muted">{t("isTestHint")}</span>
          </span>
        </label>
      </Card>

      <div className="sticky bottom-20 z-20 grid auto-cols-fr grid-flow-col gap-3 lg:bottom-6">
        {isDraft ? (
          <>
            <Button type="button" variant="secondary" size="lg" className="min-w-0 shadow-[var(--shadow-lift)]" loading={pending && intent === "draft"} disabled={pending} onClick={() => submit("draft")}>
              <Save className="size-[18px]" aria-hidden />
              <span className="sm:hidden">{t("draftShort")}</span>
              <span className="hidden sm:inline">{t("saveDraft")}</span>
            </Button>
            <Button type="button" size="lg" className="min-w-0 shadow-[var(--shadow-lift)]" loading={pending && intent === "publish"} disabled={pending} onClick={() => submit("publish")}>
              <Send className="size-[18px]" aria-hidden /> {t("publish")}
            </Button>
          </>
        ) : (
          <Button type="button" size="lg" className="min-w-0 shadow-[var(--shadow-lift)]" loading={pending} onClick={() => submit("save")}>
            <Save className="size-[18px]" aria-hidden /> {t("save")}
          </Button>
        )}
      </div>
    </form>
  );
}
