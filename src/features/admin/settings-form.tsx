"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { saveSettings } from "./actions";

export function SettingsForm({ initial }: { initial: { windowHours: number; country: number; work: number; noPlacePriority: boolean } }) {
  const t = useTranslations("admin.settings");
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const countryPct = Math.round((v.country / Math.max(0.0001, v.country + v.work)) * 100);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">{t("window")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {[12, 24, 48, 72].map((h) => (
            <button key={h} type="button" aria-pressed={v.windowHours === h} onClick={() => setV({ ...v, windowHours: h })}
              className={cn("h-10 rounded-full border px-4 text-sm font-semibold", v.windowHours === h ? "border-primary bg-primary-soft text-primary" : "border-border-strong text-fg-muted")}>
              {t("hours", { n: h })}
            </button>
          ))}
          <div className="w-28"><Input type="number" min={1} max={720} aria-label={t("window")} value={String(v.windowHours)} trailing={<span className="text-sm text-fg-subtle">ч</span>} onChange={(e) => setV({ ...v, windowHours: Number(e.target.value) })} /></div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold">{t("weights")}</h2>
        <p className="mb-4 mt-1 text-sm text-fg-muted">{t("weightsHint", { country: countryPct, work: 100 - countryPct })}</p>
        <label className="block text-sm">
          <span className="flex justify-between"><span>{t("country")} {countryPct}%</span><span>{t("work")} {100 - countryPct}%</span></span>
          <input type="range" min={0} max={100} step={5} value={countryPct} aria-label={t("weights")}
            onChange={(e) => { const c = Number(e.target.value) / 100; setV({ ...v, country: c, work: Math.round((1 - c) * 100) / 100 }); }}
            className="mt-2 w-full accent-[var(--primary)]" />
        </label>
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-surface-2 p-3.5">
          <input type="checkbox" checked={v.noPlacePriority} onChange={(e) => setV({ ...v, noPlacePriority: e.target.checked })} className="mt-0.5 size-4 accent-[var(--primary)]" />
          <span>
            <span className="block text-sm font-semibold">{t("noPlace")}</span>
            <span className="block text-xs text-fg-muted">{t("noPlaceHint")}</span>
          </span>
        </label>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">{t("order")}</h2>
        <ol className="flex flex-col gap-2.5">
          {(t.raw("orderSteps") as string[]).map((s, i) => (
            <li key={i} className={cn("flex gap-3 text-sm", i === 2 && !v.noPlacePriority && "line-through opacity-50")}>
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-route-soft text-xs font-bold text-route">{i + 1}</span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Button size="lg" loading={pending} className="sm:self-start"
        onClick={() => start(async () => {
          const r = await saveSettings(v).catch(() => ({ ok: false }));
          if (r.ok) toast.success(t("saved")); else toast.error("Не удалось сохранить");
        })}>
        <Save className="size-[18px]" aria-hidden /> {t("save")}
      </Button>
    </div>
  );
}
