import { CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/features/offers/format";
import { cn, nowMs } from "@/lib/utils";

export type PaymentRow = { id: string; title: string; amount: number; currency: string; due_date: string | null; paid_at: string | null };

export const money = (n: number, cur: string) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: cur, maximumFractionDigits: cur === "KZT" ? 0 : 2 }).format(n);

/** Сводка по валютам + список. actions — кнопки менеджера (опционально). */
export async function PaymentList({ payments, actions }: { payments: PaymentRow[]; actions?: (p: PaymentRow) => React.ReactNode }) {
  const t = await getTranslations("payments");
  if (!payments.length) return <Card className="text-sm text-fg-muted">{t("empty")}</Card>;
  const now = nowMs();
  const currencies = [...new Set(payments.map((p) => p.currency))];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {currencies.map((cur) => {
          const list = payments.filter((p) => p.currency === cur);
          const total = list.reduce((s, p) => s + Number(p.amount), 0);
          const paid = list.filter((p) => p.paid_at).reduce((s, p) => s + Number(p.amount), 0);
          const pct = total ? Math.round((paid / total) * 100) : 0;
          return (
            <Card key={cur}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-fg-muted">{t("paid")}</span>
                <span className="text-sm text-fg-muted">{t("total")}: {money(total, cur)}</span>
              </div>
              <p className="mt-1 font-display text-2xl font-semibold">{money(paid, cur)}</p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-gradient-to-r from-success to-route" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-sm">{t("left")}: <b>{money(total - paid, cur)}</b></p>
            </Card>
          );
        })}
      </div>
      <ul className="flex flex-col gap-2.5">
        {payments.map((p) => {
          const due = p.due_date ? Date.parse(`${p.due_date}T23:59:59+05:00`) : null;
          const overdue = !p.paid_at && due !== null && due < now;
          const soon = !p.paid_at && due !== null && !overdue && due - now < 7 * 86_400_000;
          const Icon = p.paid_at ? CheckCircle2 : overdue ? CircleAlert : Clock3;
          return (
            <li key={p.id} className={cn("rounded-2xl border bg-surface p-4 shadow-[var(--shadow-soft)]", overdue ? "border-danger/40" : "border-border")}>
              <div className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 size-5 shrink-0", p.paid_at ? "text-success" : overdue ? "text-danger" : soon ? "text-warning" : "text-fg-subtle")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-fg-muted">
                    {p.paid_at ? t("paidAt", { date: formatDate(p.paid_at, false) }) : p.due_date ? t("due", { date: formatDate(`${p.due_date}T12:00:00+05:00`, false) }) : ""}
                    {overdue && <span className="ml-2 font-semibold text-danger">{t("overdue")}</span>}
                    {soon && <span className="ml-2 font-semibold text-warning">{t("soon")}</span>}
                  </p>
                </div>
                <p className={cn("shrink-0 font-semibold tabular-nums", p.paid_at && "text-success")}>{money(Number(p.amount), p.currency)}</p>
              </div>
              {actions?.(p)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
