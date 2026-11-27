"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Calculator } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Card } from "@/components/ui/card";

/** Плавно «докручивающееся» число. */
function AnimatedMoney({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => `$${Math.round(v).toLocaleString("ru-RU")}`);
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.4, ease: "easeOut" });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span>{text}</motion.span>;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <label htmlFor={id} className="text-fg-muted">
          {label}
        </label>
        <span className="font-semibold tabular-nums">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-primary"
        style={{ background: `linear-gradient(90deg, var(--primary) ${pct}%, var(--surface-3) ${pct}%)` }}
      />
    </div>
  );
}

/** Калькулятор для Work and Travel: сколько примерно останется за сезон после жилья. */
export function EarningsCalculator({
  baseRate,
  rateMax,
  hoursMin,
  hoursMax,
  housing,
}: {
  baseRate: number;
  rateMax: number;
  hoursMin: number;
  hoursMax: number;
  housing: number;
}) {
  const t = useTranslations("offers");
  const [rate, setRate] = useState(Math.round(((baseRate + rateMax) / 2) * 2) / 2);
  const [hours, setHours] = useState(Math.round((hoursMin + hoursMax) / 2));
  const [weeks, setWeeks] = useState(14);
  const [taxes, setTaxes] = useState(true);

  const weekly = rate * hours * (taxes ? 0.88 : 1);
  const season = weekly * weeks;
  const housingTotal = housing * (weeks / 4.33);
  const net = season - housingTotal;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-soft text-success">
          <Calculator className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">{t("calc.title")}</h2>
          <p className="text-sm text-fg-muted">{t("calc.subtitle")}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        <Slider label={t("calc.rate")} value={rate} min={baseRate} max={Math.max(rateMax, baseRate + 1)} step={0.5} format={(v) => `$${v.toFixed(2)}/ч`} onChange={setRate} />
        <Slider label={t("calc.hours")} value={hours} min={Math.min(hoursMin, 20)} max={Math.max(hoursMax, 40)} step={1} format={(v) => `${v} ч`} onChange={setHours} />
        <Slider label={t("calc.weeks")} value={weeks} min={8} max={18} step={1} format={(v) => `${v}`} onChange={setWeeks} />
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" checked={taxes} onChange={(e) => setTaxes(e.target.checked)} className="size-4 accent-[var(--primary)]" />
          {t("calc.taxes")}
        </label>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-surface-2 p-3.5">
          <dt className="text-xs text-fg-muted">{t("calc.weekly")}</dt>
          <dd className="mt-1 font-display text-xl font-semibold tabular-nums"><AnimatedMoney value={weekly} /></dd>
        </div>
        <div className="rounded-2xl bg-surface-2 p-3.5">
          <dt className="text-xs text-fg-muted">{t("calc.season")}</dt>
          <dd className="mt-1 font-display text-xl font-semibold tabular-nums"><AnimatedMoney value={season} /></dd>
        </div>
        <div className="rounded-2xl bg-surface-2 p-3.5">
          <dt className="text-xs text-fg-muted">{t("calc.housingTotal")}</dt>
          <dd className="mt-1 font-display text-xl font-semibold tabular-nums text-danger">−<AnimatedMoney value={housingTotal} /></dd>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-success to-route p-3.5 text-white">
          <dt className="text-xs opacity-90">{t("calc.net")}</dt>
          <dd className="mt-1 font-display text-xl font-semibold tabular-nums"><AnimatedMoney value={net} /></dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-fg-subtle">{t("calc.note")}</p>
    </Card>
  );
}
