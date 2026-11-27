"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, ChevronDown, Dices, Lock, RotateCcw, ShieldCheck, UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/features/offers/countdown";
import type { WindowState } from "@/features/offers/types";
import { cn } from "@/lib/utils";
import type { Ranked } from "./allocate";
import { closeAndAllocate, confirmAllocation, decideApplication, rerunAllocation } from "./actions";

export type BoardApplicant = {
  applicationId: string;
  name: string;
  avatarUrl: string | null;
  english: string | null;
  age: number | null;
  status: string;
  rank: number | null;
};

export type BoardRun = { id: string; seed: string; result: Ranked[]; confirmed: boolean; mode: "lottery" | "manual" } | null;

function Avatar({ a }: { a: BoardApplicant }) {
  const initials = a.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return a.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка
    <img src={a.avatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-route text-sm font-semibold text-white">{initials}</span>
  );
}

/** Анимация «тянем жребий»: бегущие хэши. */
function ShuffleOverlay() {
  const t = useTranslations("allocation");
  const [hex, setHex] = useState("…");
  useEffect(() => {
    const id = setInterval(() => setHex(Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("")), 70);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-bg/80 backdrop-blur-md" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4 text-center">
        <motion.span animate={{ rotate: [0, 90, 180, 270, 360] }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-route text-white shadow-[var(--shadow-lift)]">
          <Dices className="size-10" aria-hidden />
        </motion.span>
        <p className="font-display text-xl font-semibold">{t("run")}…</p>
        <p className="font-mono text-sm text-fg-muted">{hex}</p>
      </div>
    </motion.div>
  );
}

export function AllocationBoard({
  offerId,
  state,
  seats,
  windowClosesAt,
  applicants,
  run,
}: {
  offerId: string;
  state: WindowState;
  seats: number;
  windowClosesAt: string | null;
  applicants: BoardApplicant[];
  run: BoardRun;
}) {
  const t = useTranslations("allocation");
  const ta = useTranslations("apply");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shuffling, setShuffling] = useState(false);
  const byApp = useMemo(() => Object.fromEntries(applicants.map((a) => [a.applicationId, a])), [applicants]);

  const suggested = useMemo(() => new Set(run?.result.filter((r) => r.outcome === "selected").map((r) => r.application_id)), [run]);
  const [selected, setSelected] = useState<Set<string>>(suggested);
  const [prevRunId, setPrevRunId] = useState(run?.id);
  if (run?.id !== prevRunId) {
    // новый запуск — сбрасываем ручные правки к предложению системы
    setPrevRunId(run?.id);
    setSelected(suggested);
  }
  const changed = selected.size !== suggested.size || [...selected].some((id) => !suggested.has(id));
  const err = (e: string) => toast.error(t(`errors.${e}` as "errors.generic"));

  const withShuffle = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    // Оверлей включаем вне перехода: обновления внутри startTransition откладываются до его конца
    setShuffling(true);
    start(async () => {
      const [res] = await Promise.all([fn(), new Promise((r) => setTimeout(r, 1400))]);
      setShuffling(false);
      if (!res.ok) {
        err(res.error ?? "generic");
        return;
      }
      router.refresh();
    });
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < seats) next.add(id);
      else toast(t("errors.too_many_selected"));
      return next;
    });

  // ---------- Окно открыто ----------
  if (state === "open" || state === "upcoming") {
    return (
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-route">{t("windowOpen")}</p>
            {windowClosesAt && <p className="text-sm text-fg-muted"><Countdown to={windowClosesAt} /></p>}
          </div>
          <Button variant="secondary" loading={pending} disabled={!applicants.length}
            onClick={() => confirm(t("closeConfirm")) && withShuffle(() => closeAndAllocate(offerId))}>
            <Lock className="size-4" aria-hidden /> {t("closeNow")}
          </Button>
        </div>
        <ApplicantList applicants={applicants} statusLabel={(s) => ta(`status.${s}` as "status.pending")} />
        <AnimatePresence>{shuffling && <ShuffleOverlay />}</AnimatePresence>
      </Card>
    );
  }

  // ---------- Окно закрыто, запуска ещё нет ----------
  if (!run) {
    return (
      <Card className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-fg-muted">{applicants.length ? t("applicants", { count: applicants.length }) : t("noApplicants")}</p>
        <Button size="lg" loading={pending} onClick={() => withShuffle(() => rerunAllocation(offerId))}>
          <Dices className="size-5" aria-hidden /> {t("run")}
        </Button>
        <AnimatePresence>{shuffling && <ShuffleOverlay />}</AnimatePresence>
      </Card>
    );
  }

  const rows = run.result;
  const confirmed = run.confirmed;

  return (
    <div className="flex flex-col gap-4">
      <Card className={cn("border-2", confirmed ? "border-success/40" : "border-primary/30")}>
        <div className="flex items-start gap-3">
          {confirmed ? <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden /> : <Dices className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{confirmed ? t("confirmed") : t("draft")}</p>
            {!confirmed && <p className="mt-0.5 text-sm text-fg-muted">{run.mode === "manual" ? t("manualHint") : t("draftHint")}</p>}
            <p className="mt-2 break-all font-mono text-xs text-fg-subtle">{t("seed")}: {run.seed}</p>
          </div>
        </div>
        {!confirmed && (
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className={cn("text-sm font-semibold", selected.size === seats ? "text-success" : "text-fg")}>
              {t("seats", { n: selected.size, total: seats })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" disabled={pending} title={t("rerunHint")} onClick={() => withShuffle(() => rerunAllocation(offerId))}>
                <RotateCcw className="size-4" aria-hidden /> {t("rerun")}
              </Button>
              <Button size="sm" loading={pending && !shuffling}
                onClick={() => {
                  if (!confirm(t("confirmText"))) return;
                  start(async () => {
                    const res = await confirmAllocation(offerId, run.id, [...selected]);
                    if (!res.ok) {
                      err(res.error);
                      return;
                    }
                    toast.success(t("confirmed"));
                    router.refresh();
                  });
                }}>
                <Check className="size-4" aria-hidden /> {t("confirm")}
              </Button>
            </div>
          </div>
        )}
        {changed && !confirmed && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
            <AlertTriangle className="size-4 shrink-0" aria-hidden /> {t("manualChanged")}
          </p>
        )}
      </Card>

      <motion.ol key={run.id} className="flex flex-col gap-2.5">
        {rows.map((r, i) => {
          const a = byApp[r.application_id];
          if (!a) return null;
          const isSel = confirmed ? ["selected", "approved"].includes(a.status) : selected.has(r.application_id);
          const failed = r.failed.map((f) => t(`reasons.${f}`)).join(", ");
          return (
            <motion.li key={r.application_id} layout
              initial={{ opacity: 0, x: (i % 2 ? 1 : -1) * 40, rotate: (i % 2 ? 1 : -1) * 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24, delay: i * 0.06 }}
              className={cn("rounded-2xl border bg-surface p-3.5 shadow-[var(--shadow-soft)] transition-colors",
                isSel ? "border-success/50 bg-[color-mix(in_oklab,var(--success)_6%,var(--surface))]" : !r.eligible ? "border-border opacity-70" : "border-border")}>
              <div className="flex items-center gap-3">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums",
                  isSel ? "bg-success text-white" : "bg-surface-2 text-fg-muted")}>{r.rank}</span>
                <Avatar a={a} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.name}</p>
                  <p className="text-xs text-fg-muted">{a.english ?? "—"} · {a.age ?? "—"}</p>
                </div>
                {confirmed ? (
                  <Badge tone={a.status === "approved" || a.status === "selected" ? "success" : a.status === "waitlisted" ? "warning" : "neutral"}>
                    {ta(`status.${a.status}` as "status.pending")}
                  </Badge>
                ) : r.eligible ? (
                  <Button size="sm" variant={isSel ? "secondary" : "outline"} onClick={() => toggle(r.application_id)}
                    aria-pressed={isSel} className="shrink-0">
                    {isSel ? <><UserMinus className="size-4" aria-hidden /><span className="hidden sm:inline">{t("take")}</span></> : <><UserPlus className="size-4" aria-hidden /><span className="hidden sm:inline">{t("give")}</span></>}
                  </Button>
                ) : (
                  <Badge>{ta("status.ineligible")}</Badge>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                <span className={cn("rounded-md px-2 py-0.5", r.eligible ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
                  {r.eligible ? "✓" : "✗"} {t("cols.checks")}
                </span>
                <span className="rounded-md bg-primary-soft px-2 py-0.5 text-primary">{t("cols.match")} {Math.round(r.match * 100)}%</span>
                {!r.has_place && <span className="rounded-md bg-route-soft px-2 py-0.5 text-route">{t("cols.place")}</span>}
                <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-fg-muted">{r.ticket.slice(0, 8)}</span>
              </div>

              <details className="group mt-2">
                <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-fg-subtle hover:text-fg">
                  {t("why")} <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="mt-2 flex flex-col gap-1 text-xs text-fg-muted">
                  <li>1. {r.eligible ? t("whyEligible") : t("whyFailed", { reasons: failed })}</li>
                  <li>2. {t("whyMatch", { pct: Math.round(r.match * 100), country: r.country_match ? t("yes") : t("no"), work: r.work_match ? t("yes") : t("no") })}</li>
                  <li>3. {r.has_place ? t("whyPlace") : t("whyNoPlace")}</li>
                  <li>4. {t("whyTicket", { ticket: r.ticket.slice(0, 16) })}</li>
                </ul>
              </details>

              {confirmed && (
                <DecisionButtons offerId={offerId} applicationId={a.applicationId} status={a.status}
                  seatsFree={rows.filter((x) => ["selected", "approved"].includes(byApp[x.application_id]?.status ?? "")).length < seats} />
              )}
            </motion.li>
          );
        })}
      </motion.ol>
      <AnimatePresence>{shuffling && <ShuffleOverlay />}</AnimatePresence>
    </div>
  );
}

function DecisionButtons({ offerId, applicationId, status, seatsFree }: { offerId: string; applicationId: string; status: string; seatsFree: boolean }) {
  const t = useTranslations("allocation");
  const router = useRouter();
  const [pending, start] = useTransition();
  const act = (d: "approve" | "reject" | "promote") =>
    start(async () => {
      const res = await decideApplication(offerId, applicationId, d);
      if (!res.ok) toast.error(t(`errors.${res.error}` as "errors.generic"));
      else {
        toast.success(t("decided"));
        router.refresh();
      }
    });
  const buttons: [string, "approve" | "reject" | "promote", typeof Check][] = [];
  if (status === "selected") buttons.push([t("approve"), "approve", UserCheck], [t("reject"), "reject", X]);
  if (status === "approved") buttons.push([t("reject"), "reject", X]);
  if ((status === "waitlisted" || status === "rejected") && seatsFree) buttons.push([t("promote"), "promote", UserPlus]);
  if (!buttons.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
      {buttons.map(([label, d, Icon]) => (
        <Button key={d} size="sm" variant={d === "reject" ? "ghost" : "secondary"} disabled={pending} onClick={() => act(d)}>
          <Icon className="size-4" aria-hidden /> {label}
        </Button>
      ))}
    </div>
  );
}

function ApplicantList({ applicants, statusLabel }: { applicants: BoardApplicant[]; statusLabel: (s: string) => string }) {
  const t = useTranslations("allocation");
  if (!applicants.length) return <p className="mt-6 text-center text-sm text-fg-muted">{t("noApplicants")}</p>;
  return (
    <ul className="mt-5 flex flex-col divide-y divide-border">
      {applicants.map((a) => (
        <li key={a.applicationId} className="flex items-center gap-3 py-3">
          <Avatar a={a} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{a.name}</p>
            <p className="text-xs text-fg-muted">{a.english ?? "—"} · {a.age ?? "—"}</p>
          </div>
          <Badge tone="route">{statusLabel(a.status)}</Badge>
        </li>
      ))}
    </ul>
  );
}
