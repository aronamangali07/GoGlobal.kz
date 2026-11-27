import { Download } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/features/offers/format";
import { requireAdminSession } from "@/lib/data/admin";
import { cn } from "@/lib/utils";

const GROUPS: Record<string, string> = { offer: "Офферы", application: "Заявки", allocation: "Распределение", document: "Документы", payment: "Оплаты", stage: "Этапы", user: "Пользователи", manager: "Пользователи", program: "Программы", settings: "Настройки", announcement: "Рассылки" };

/** Короткое описание записи по её diff — без «сырого» JSON. */
function describe(diff: Record<string, unknown>) {
  const parts: string[] = [];
  if (diff.code || diff.title) parts.push([diff.code, diff.title].filter(Boolean).join(" · "));
  if (diff.offer) parts.push(String(diff.offer));
  if (diff.from || diff.to) parts.push(`${diff.from ?? "—"} → ${diff.to ?? "—"}`);
  if (diff.email) parts.push(String(diff.email));
  if (diff.comment) parts.push(`«${diff.comment}»`);
  if (diff.amount) parts.push(`${diff.amount} ${diff.currency ?? ""}`);
  if (diff.seed) parts.push(`зерно ${String(diff.seed).slice(0, 10)}…${diff.manual_changes ? ", с ручными правками" : ""}`);
  if (diff.key) parts.push(String(diff.key));
  return parts.filter(Boolean).join(" · ");
}

export default async function AuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const t = await getTranslations("admin.audit");
  const { supabase } = await requireAdminSession();
  const sp = await searchParams;
  const group = typeof sp.g === "string" ? sp.g : "";
  const limit = Math.min(Number(sp.n) || 50, 1000);
  let q = supabase.from("audit_log").select("id, created_at, action, entity_type, diff, actor:profiles ( full_name ), program:programs ( name, color )").order("created_at", { ascending: false }).limit(limit);
  if (group) q = q.like("action", `${group}.%`);
  const { data: rows } = await q;
  const ta = await getTranslations("admin.audit.actions");
  const label = (a: string) => { const k = a.replace(/\./g, "_") as "offer_created"; return ta.has(k) ? ta(k) : a; };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
          <p className="mt-1.5 text-fg-muted">{t("subtitle")}</p>
        </div>
        <a href="/api/admin/export/audit" download className="inline-flex h-10 items-center gap-1.5 self-start rounded-[var(--radius-md)] bg-surface-2 px-3.5 text-sm font-semibold hover:bg-surface-3">
          <Download className="size-4" aria-hidden /> {t("export")}
        </a>
      </div>
      <div className="-mx-4 my-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {[["", t("all")], ...Object.entries(GROUPS).filter(([k]) => k !== "manager")].map(([k, l]) => (
          <Link key={k} href={k ? `/admin/audit?g=${k}` : "/admin/audit"}
            className={cn("inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-semibold", group === k ? "border-fg bg-fg text-bg" : "border-border-strong text-fg-muted")}>
            {l}
          </Link>
        ))}
      </div>
      <Card className="divide-y divide-border p-0">
        {(rows ?? []).map((r) => (
          <div key={r.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="w-36 shrink-0 text-xs tabular-nums text-fg-subtle">{formatDate(r.created_at)}</span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{label(r.action)}</span>
              {r.program && <span className="ml-2 text-xs font-semibold" style={{ color: r.program.color }}>{r.program.name}</span>}
              <span className="block truncate text-sm text-fg-muted">{describe(r.diff as Record<string, unknown>)}</span>
            </span>
            <span className="shrink-0 text-sm text-fg-muted">{r.actor?.full_name ?? t("system")}</span>
          </div>
        ))}
        {!rows?.length && <p className="p-6 text-center text-fg-muted">—</p>}
      </Card>
      {rows?.length === limit && (
        <div className="mt-4 text-center">
          <Link href={`/admin/audit?${group ? `g=${group}&` : ""}n=${limit + 100}`} className="text-sm font-semibold text-primary hover:underline">{t("more")}</Link>
        </div>
      )}
    </div>
  );
}
