"use client";

import { motion } from "motion/react";
import { BarChart3, FileClock, Hand, Plane, Table2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ProgramIcon } from "@/components/ui/program-icon";
import type { Stats } from "@/lib/data/admin";
import { cn } from "@/lib/utils";

const money = (n: number, cur: string) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: cur, maximumFractionDigits: cur === "KZT" ? 0 : 0 }).format(n);

function Tile({ icon: Icon, value, label, hint, accent }: { icon: typeof Users; value: string | number; label: string; hint?: string; accent: string }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <span className="grid size-9 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${accent} 14%, transparent)`, color: accent }}>
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="font-display text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="-mt-1.5 text-xs text-fg-muted">{hint}</p>}
    </Card>
  );
}

/** Горизонтальный столбик: метка слева, значение у конца (текст — токенами текста, не цветом серии). */
function Bar({ label, value, max, color, display, icon, i }: { label: string; value: number; max: number; color: string; display: string; icon?: string; i: number }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <li className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_1fr]" title={`${label}: ${display}`}>
      <span className="flex min-w-0 items-center gap-1.5 text-sm">
        {icon && <ProgramIcon name={icon} className="size-4 shrink-0" style={{ color }} aria-hidden />}
        <span className="truncate">{label}</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="h-5 flex-1 rounded-[4px] bg-surface-2">
          <motion.span
            className="block h-full rounded-r-[4px]"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(pct, value > 0 ? 2 : 0)}%` }}
            transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
          />
        </span>
        <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">{display}</span>
      </span>
    </li>
  );
}

export function StatsView({ stats }: { stats: Stats }) {
  const t = useTranslations("admin.dashboard");
  const tj = useTranslations("journey");
  const [table, setTable] = useState(false);
  const fill = stats.seatsTotal ? Math.round((stats.seatsTaken / stats.seatsTotal) * 100) : 0;
  const funnelMax = Math.max(1, ...stats.funnel.map((f) => f.count));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={Users} value={stats.students} label={t("students")} hint={`${stats.onboarded} ${t("onboarded")}`} accent="var(--primary)" />
        <Tile icon={Plane} value={stats.offersOpen} label={t("offersOpen")} hint={t("offersTotal", { n: stats.offersTotal })} accent="var(--route)" />
        <Tile icon={Hand} value={stats.applications} label={t("applications")} hint={`${t("seats")}: ${fill}%`} accent="var(--accent)" />
        <Tile icon={FileClock} value={stats.docsPending} label={t("docsPending")} accent="var(--warning)" />
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => setTable((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-sm font-semibold text-fg-muted hover:text-fg">
          {table ? <BarChart3 className="size-4" aria-hidden /> : <Table2 className="size-4" aria-hidden />} {table ? t("chart") : t("table")}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-semibold">{t("byProgram")}</h2>
          <p className="mb-4 text-xs text-fg-muted">{t("seatsHint")}</p>
          {table ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-fg-subtle"><th className="pb-2 font-medium">{t("program")}</th><th className="pb-2 text-right font-medium">{t("seats")}</th><th className="pb-2 text-right font-medium">{t("students")}</th></tr></thead>
              <tbody>{stats.byProgram.map((p) => (
                <tr key={p.id} className="border-t border-border"><td className="py-2">{p.name}</td><td className="py-2 text-right tabular-nums">{p.taken} / {p.total}</td><td className="py-2 text-right tabular-nums">{p.students}</td></tr>
              ))}</tbody>
            </table>
          ) : (
            <ul className="flex flex-col gap-3">
              {stats.byProgram.map((p, i) => (
                <Bar key={p.id} i={i} label={p.name} icon={p.icon} value={p.taken} max={Math.max(1, ...stats.byProgram.map((x) => x.total))} color={p.color} display={t("taken", { taken: p.taken, total: p.total })} />
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold">{t("funnel")}</h2>
          {table ? (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-fg-subtle"><th className="pb-2 font-medium">{t("stage")}</th><th className="pb-2 text-right font-medium">{t("count")}</th></tr></thead>
              <tbody>{stats.funnel.map((f) => (
                <tr key={f.stage} className="border-t border-border"><td className="py-2">{tj(`stages.${f.stage}.title`)}</td><td className="py-2 text-right tabular-nums">{f.count}</td></tr>
              ))}</tbody>
            </table>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {stats.funnel.map((f, i) => (
                <Bar key={f.stage} i={i} label={`${i + 1}. ${tj(`stages.${f.stage}.title`)}`} value={f.count} max={funnelMax} color="var(--primary)" display={String(f.count)} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold">{t("payments")}</h2>
        {/* Легенда: статусные цвета всегда с подписью */}
        <ul className="mb-4 flex flex-wrap gap-4 text-xs text-fg-muted">
          {[["var(--success)", t("paid")], ["var(--surface-3)", t("outstanding")], ["var(--danger)", t("overdue")]].map(([c, l]) => (
            <li key={l} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: c }} />{l}</li>
          ))}
        </ul>
        <div className="flex flex-col gap-4">
          {stats.payments.map((p) => {
            const total = p.paid + p.outstanding;
            const seg = (v: number) => (total ? (v / total) * 100 : 0);
            return (
              <div key={p.currency}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="font-semibold">{p.currency}</span>
                  <span className="text-right text-fg-muted">{money(p.paid, p.currency)} {t("paid")} · {money(p.outstanding, p.currency)} {t("outstanding")}{p.overdue ? ` · ${money(p.overdue, p.currency)} ${t("overdue")}` : ""}</span>
                </div>
                <div className="mt-2 flex h-5 gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label={`${p.currency}: ${money(p.paid, p.currency)} ${t("paid")}, ${money(p.outstanding, p.currency)} ${t("outstanding")}`}>
                  <span className="bg-success" style={{ width: `${seg(p.paid)}%` }} title={`${t("paid")}: ${money(p.paid, p.currency)}`} />
                  <span className="bg-surface-3" style={{ width: `${seg(p.outstanding - p.overdue)}%` }} title={`${t("outstanding")}: ${money(p.outstanding - p.overdue, p.currency)}`} />
                  <span className={cn("bg-danger", !p.overdue && "hidden")} style={{ width: `${seg(p.overdue)}%` }} title={`${t("overdue")}: ${money(p.overdue, p.currency)}`} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
