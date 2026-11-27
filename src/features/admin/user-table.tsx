"use client";

import { motion } from "motion/react";
import { Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ProgramIcon } from "@/components/ui/program-icon";
import { cn } from "@/lib/utils";
import { deleteUser, setManagerPrograms, setRole } from "./actions";

type Role = "student" | "manager" | "admin";
export type AdminUser = { id: string; name: string; email: string; role: Role; programIds: string[]; createdAt: string };
type Program = { id: string; name: string; color: string; icon: string };

export function UserTable({ users, programs, meId }: { users: AdminUser[]; programs: Program[]; meId: string }) {
  const t = useTranslations("admin.users");
  const router = useRouter();
  const [q, setQ] = useState("");
  const [role, setRoleFilter] = useState<"" | Role>("");
  const [pending, start] = useTransition();
  const [local, setLocal] = useState<Record<string, string[]>>({});
  const list = users.filter((u) => (!role || u.role === role) && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())));
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error === "confirm" ? "Email не совпадает" : "Не получилось");
      else {
        toast.success(msg);
        router.refresh();
      }
    });

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex h-11 flex-1 items-center gap-2.5 rounded-2xl border border-border-strong bg-surface px-3.5 focus-within:border-primary">
          <Search className="size-[18px] text-fg-subtle" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none" />
        </label>
        <select value={role} onChange={(e) => setRoleFilter(e.target.value as "" | Role)} aria-label={t("role")} className="h-11 rounded-2xl border border-border-strong bg-surface px-3.5">
          <option value="">{t("all")}</option>
          {(["student", "manager", "admin"] as const).map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
        </select>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {list.map((u, i) => {
          const progs = local[u.id] ?? u.programIds;
          const me = u.id === meId;
          return (
            <motion.li key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
              className="rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--shadow-soft)]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-route text-sm font-semibold text-white">
                  {u.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                    <span className="truncate">{u.name}</span>
                    {me && <Badge tone="primary">{t("you")}</Badge>}
                    {u.email.endsWith("@demo.goglobal.kz") && <Badge>{t("demo")}</Badge>}
                  </p>
                  <p className="truncate text-xs text-fg-muted">{u.email}</p>
                </div>
                <select value={u.role} disabled={me || pending} aria-label={t("role")}
                  onChange={(e) => run(() => setRole(u.id, e.target.value as Role), t("roleChanged"))}
                  className="h-9 rounded-full border border-border-strong bg-surface px-3 text-sm font-semibold">
                  {(["student", "manager", "admin"] as const).map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
                </select>
                {!me && (
                  <button type="button" disabled={pending} aria-label={t("delete")} title={t("delete")}
                    onClick={() => {
                      const typed = prompt(t("deleteConfirm", { email: u.email }));
                      if (typed !== null) run(() => deleteUser(u.id, typed), t("deleted"));
                    }}
                    className="grid size-9 place-items-center rounded-full text-fg-subtle hover:bg-danger-soft hover:text-danger">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              {u.role === "manager" && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">{t("programs")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {programs.map((p) => {
                      const on = progs.includes(p.id);
                      return (
                        <button key={p.id} type="button" aria-pressed={on} disabled={pending}
                          onClick={() => {
                            const next = on ? progs.filter((x) => x !== p.id) : [...progs, p.id];
                            setLocal((l) => ({ ...l, [u.id]: next }));
                            run(() => setManagerPrograms(u.id, next), t("assigned"));
                          }}
                          style={{ ["--pc" as string]: p.color }}
                          className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
                            on ? "border-[var(--pc)] bg-[color-mix(in_oklab,var(--pc)_14%,var(--surface))] text-fg" : "border-border-strong text-fg-muted")}>
                          <ProgramIcon name={p.icon} className="size-3.5 text-[var(--pc)]" aria-hidden /> {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
