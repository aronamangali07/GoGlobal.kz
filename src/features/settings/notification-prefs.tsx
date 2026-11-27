"use client";

import { Mail, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Category, Channel, Prefs } from "@/lib/notify/types";
import { cn } from "@/lib/utils";
import { saveNotificationPrefs } from "./actions";

function Switch({ on, disabled, onChange, label }: { on: boolean; disabled?: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-disabled={disabled || undefined} aria-label={label} onClick={onChange}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-surface-3", disabled && "cursor-not-allowed opacity-40")}>
      <span className={cn("absolute left-0 top-1 size-5 rounded-full bg-white shadow transition-transform", on ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

/** Матрица «категория × канал». Колокольчик на сайте всегда включён. */
export function NotificationPrefs({ initial, categories, telegramLinked }: { initial: Prefs; categories: Category[]; telegramLinked: boolean }) {
  const t = useTranslations("settings");
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [, start] = useTransition();
  const isOn = (c: Category, ch: Channel) => prefs[c]?.[ch] !== false;

  const toggle = (c: Category, ch: Channel) => {
    const next: Prefs = { ...prefs, [c]: { ...prefs[c], [ch]: !isOn(c, ch) } };
    const prev = prefs;
    setPrefs(next);
    start(async () => {
      const res = await saveNotificationPrefs(next).catch(() => ({ ok: false }));
      if (res.ok) toast.success(t("saved"), { duration: 1200 });
      else {
        setPrefs(prev);
        toast.error("Не удалось сохранить");
      }
    });
  };

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_3rem_3rem] items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
        <span />
        <span className="flex w-12 justify-center" title={t("channels.email")}><Mail className="size-4" aria-label={t("channels.email")} /></span>
        <span className="flex w-12 justify-center" title={t("channels.telegram")}><Send className="size-4" aria-label={t("channels.telegram")} /></span>
      </div>
      <ul className="mt-2 divide-y divide-border">
        {categories.map((c) => (
          <li key={c} className="grid grid-cols-[minmax(0,1fr)_3rem_3rem] items-center gap-x-3 py-3">
            <span className="min-w-0 break-words text-sm font-medium">{t(`categories.${c}`)}</span>
            <Switch on={isOn(c, "email")} onChange={() => toggle(c, "email")} label={`${t(`categories.${c}`)}: ${t("channels.email")}`} />
            <Switch on={telegramLinked && isOn(c, "telegram")} disabled={!telegramLinked}
              onChange={() => (telegramLinked ? toggle(c, "telegram") : toast(t("telegramNotLinked"), { icon: "✈️" }))}
              label={`${t(`categories.${c}`)}: ${t("channels.telegram")}`} />
          </li>
        ))}
      </ul>
      {!telegramLinked && (
        <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-fg-muted">{t("telegramNotLinked")}</p>
      )}
    </div>
  );
}
