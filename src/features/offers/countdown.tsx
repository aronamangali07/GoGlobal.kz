"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** «Закроется через 18 ч 20 мин». Обновляется раз в секунду на последней минуте, иначе раз в 30 с. */
export function Countdown({ to, onDone }: { to: string; onDone?: () => void }) {
  const t = useTranslations("offers");
  const target = Date.parse(to);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const left = target - Date.now();
    if (left <= 0) {
      onDone?.();
      return;
    }
    const id = setTimeout(() => setNow(Date.now()), left < 60_000 ? 1000 : 30_000);
    return () => clearTimeout(id);
  }, [now, target, onDone]);

  const ms = Math.max(0, target - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const parts =
    d > 0 ? [t("dur.d", { n: d }), t("dur.h", { n: h })] : h > 0 ? [t("dur.h", { n: h }), t("dur.m", { n: m })] : m > 0 ? [t("dur.m", { n: m })] : [t("dur.s", { n: s })];
  return <time dateTime={to} suppressHydrationWarning>{parts.join(" ")}</time>;
}
