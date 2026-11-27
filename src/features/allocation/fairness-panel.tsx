"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ticketFor } from "./allocate";

/** Студент видит очередь (без имён), зерно и может сам пересчитать свой билет в браузере. */
export function FairnessPanel({
  seed,
  ranks,
  userId,
}: {
  seed: string;
  ranks: { rank: number; ticket: string; outcome: "selected" | "waitlisted" | "ineligible"; me: boolean }[];
  userId?: string;
}) {
  const t = useTranslations("apply");
  const [verified, setVerified] = useState<boolean | null>(null);
  const mine = ranks.find((r) => r.me);

  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="size-5 text-route" aria-hidden />
        <h2 className="font-display text-lg font-semibold">{t("fairness.title")}</h2>
      </div>
      <p className="mt-2 text-sm text-fg-muted">{t("fairness.text")}</p>
      <p className="mt-3 break-all rounded-xl bg-surface-2 px-3 py-2 font-mono text-xs">
        {t("fairness.seed")}: <b>{seed}</b>
      </p>
      <ol className="mt-3 flex flex-col gap-1">
        {ranks.map((r) => (
          <li
            key={r.rank}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm",
              r.me ? "bg-primary-soft font-semibold text-primary" : "text-fg-muted",
            )}
          >
            <span className="w-6 tabular-nums">#{r.rank}</span>
            <span className="flex-1 font-mono text-xs">{r.ticket.slice(0, 12)}…</span>
            {r.me && <span className="text-xs">{t("fairness.you")}</span>}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                r.outcome === "selected" ? "bg-success-soft text-success" : r.outcome === "waitlisted" ? "bg-warning-soft text-warning" : "bg-surface-3",
              )}
            >
              {t(`fairness.outcome.${r.outcome}`)}
            </span>
          </li>
        ))}
      </ol>
      {mine && userId && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => setVerified((await ticketFor(seed, userId)) === mine.ticket)}
          >
            {t("fairness.verify")}
          </Button>
          {verified !== null && (
            <span className={cn("text-sm font-semibold", verified ? "text-success" : "text-danger")}>
              {verified ? t("fairness.verified") : t("fairness.mismatch")}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
