import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgramIcon } from "@/components/ui/program-icon";
import { ProgramBuilder } from "@/features/admin/program-builder";
import { ProgramToggle } from "@/features/admin/program-toggle";
import { requireAdminSession } from "@/lib/data/admin";

export default async function AdminProgramsPage() {
  const t = await getTranslations("admin.programs");
  const { supabase } = await requireAdminSession();
  const [{ data: programs }, { data: managers }, { data: offers }, { data: enrollments }] = await Promise.all([
    supabase.from("programs").select("id, name, tagline, color, icon, is_active, offer_schema").order("sort"),
    supabase.from("program_managers").select("program_id, profile:profiles ( full_name )"),
    supabase.from("offers").select("program_id"),
    supabase.from("enrollments").select("program_id"),
  ]);
  const count = (rows: { program_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.program_id === id).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
          <p className="mt-1.5 text-fg-muted">{t("subtitle")}</p>
        </div>
      </div>
      <ProgramBuilder />
      <div className="grid gap-3 md:grid-cols-2">
        {(programs ?? []).map((p) => {
          const mgrs = (managers ?? []).filter((m) => m.program_id === p.id).map((m) => m.profile?.full_name).filter(Boolean);
          return (
            <Card key={p.id} className={p.is_active ? "" : "opacity-60"} style={{ ["--pc" as string]: p.color }}>
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_oklab,var(--pc)_16%,transparent)] text-[var(--pc)]">
                  <ProgramIcon name={p.icon} className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold">{p.name} <Badge tone={p.is_active ? "success" : "neutral"}>{p.is_active ? t("active") : t("closed")}</Badge></p>
                  <p className="text-sm text-fg-muted">{p.tagline}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[[t("fields"), (p.offer_schema as unknown[]).length], [t("offers"), count(offers, p.id)], [t("students"), count(enrollments, p.id)]].map(([l, n]) => (
                  <div key={String(l)} className="rounded-xl bg-surface-2 py-2"><dd className="font-display text-lg font-semibold">{n}</dd><dt className="text-[11px] text-fg-muted">{l}</dt></div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-fg-muted">{t("managers")}: {mgrs.length ? mgrs.join(", ") : "—"}</p>
              <div className="mt-3"><ProgramToggle id={p.id} active={p.is_active} labels={{ close: t("close"), reopen: t("reopen") }} /></div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
