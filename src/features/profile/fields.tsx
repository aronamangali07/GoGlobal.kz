"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProgramIcon } from "@/components/ui/program-icon";
import { cn } from "@/lib/utils";
import { COUNTRIES, COUNTRY_FLAGS, ENGLISH_LEVELS, WORK_TYPES, type EnglishLevel } from "./constants";

export type ProgramOption = { id: string; name: string; tagline: string; color: string; icon: string };

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Мультивыбор «чипсами». */
export function ChipGroup({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: string; label: string; emoji?: string }[];
  value: string[];
  onChange: (next: string[]) => void;
  label: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value.includes(o.value);
          return (
            <motion.button
              key={o.value}
              type="button"
              whileTap={{ scale: 0.94 }}
              aria-pressed={active}
              onClick={() => onChange(toggle(value, o.value))}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border-strong bg-surface text-fg-muted hover:text-fg",
              )}
            >
              {o.emoji && <span aria-hidden>{o.emoji}</span>}
              {o.label}
              {active && <Check className="size-3.5" aria-hidden />}
            </motion.button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function CountryChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const t = useTranslations("profile");
  return (
    <ChipGroup
      label={t("countries")}
      value={value}
      onChange={onChange}
      options={COUNTRIES.map((c) => ({ value: c, label: t(`country.${c}`), emoji: COUNTRY_FLAGS[c] }))}
    />
  );
}

export function WorkChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const t = useTranslations("profile");
  return (
    <ChipGroup
      label={t("workTypes")}
      value={value}
      onChange={onChange}
      options={WORK_TYPES.map((w) => ({ value: w, label: t(`work.${w}`) }))}
    />
  );
}

/** Уровень английского — шкала-карточки. */
export function EnglishPicker({
  value,
  onChange,
  error,
}: {
  value: EnglishLevel | null;
  onChange: (v: EnglishLevel) => void;
  error?: string;
}) {
  const t = useTranslations("profile");
  return (
    <div role="radiogroup" aria-label={t("sections.english")} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {ENGLISH_LEVELS.map((lvl, i) => {
        const active = value === lvl;
        return (
          <motion.button
            key={lvl}
            type="button"
            role="radio"
            aria-checked={active}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(lvl)}
            className={cn(
              "relative flex flex-col items-start rounded-2xl border p-3.5 text-left transition-colors",
              active ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-border-strong",
            )}
          >
            <span className="flex w-full items-center justify-between">
              <span className={cn("font-display text-xl font-semibold", active && "text-primary")}>{lvl}</span>
              {/* мини-шкала */}
              <span className="flex items-end gap-0.5" aria-hidden>
                {ENGLISH_LEVELS.map((_, j) => (
                  <span
                    key={j}
                    className={cn("w-1 rounded-full", j <= i ? (active ? "bg-primary" : "bg-route") : "bg-surface-3")}
                    style={{ height: 4 + j * 2.5 }}
                  />
                ))}
              </span>
            </span>
            <span className="mt-1.5 text-sm font-semibold">{t(`english.${lvl}.title`)}</span>
            <span className="mt-0.5 text-xs leading-snug text-fg-muted">{t(`english.${lvl}.text`)}</span>
          </motion.button>
        );
      })}
      {error && <p className="col-span-full text-[13px] text-danger">{error}</p>}
    </div>
  );
}

/** Выбор программ — большие карточки с цветом программы. */
export function ProgramPicker({
  programs,
  value,
  onChange,
  error,
}: {
  programs: ProgramOption[];
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {programs.map((p, i) => {
        const active = value.includes(p.id);
        return (
          <motion.button
            key={p.id}
            type="button"
            aria-pressed={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(toggle(value, p.id))}
            style={{ ["--pc" as string]: p.color }}
            className={cn(
              "group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border p-4 text-left transition-colors",
              active
                ? "border-[var(--pc)] bg-[color-mix(in_oklab,var(--pc)_10%,var(--surface))]"
                : "border-border bg-surface hover:border-border-strong",
            )}
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--pc)_16%,transparent)] text-[var(--pc)]">
              <ProgramIcon name={p.icon} className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{p.name}</span>
              <span className="block text-sm text-fg-muted">{p.tagline}</span>
            </span>
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
                active ? "border-[var(--pc)] bg-[var(--pc)] text-white" : "border-border-strong",
              )}
            >
              {active && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
            </span>
          </motion.button>
        );
      })}
      {error && <p className="text-[13px] text-danger sm:col-span-2">{error}</p>}
    </div>
  );
}
