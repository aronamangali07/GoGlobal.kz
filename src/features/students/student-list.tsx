"use client";

import { motion } from "motion/react";
import { ChevronRight, FileClock, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { ProgramIcon } from "@/components/ui/program-icon";
import { cn } from "@/lib/utils";

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  english: string | null;
  programs: { id: string; name: string; color: string; icon: string; stage: string }[];
  pendingDocs: number;
};

export function StudentList({ students }: { students: StudentRow[] }) {
  const t = useTranslations("students");
  const tj = useTranslations("journey");
  const [q, setQ] = useState("");
  const [program, setProgram] = useState("");
  const programs = useMemo(() => {
    const m = new Map<string, StudentRow["programs"][number]>();
    students.forEach((s) => s.programs.forEach((p) => m.set(p.id, p)));
    return [...m.values()];
  }, [students]);
  const list = students.filter(
    (s) => (!program || s.programs.some((p) => p.id === program)) && (!q || `${s.name} ${s.email}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex h-12 flex-1 items-center gap-2.5 rounded-2xl border border-border-strong bg-surface px-3.5 focus-within:border-primary">
          <Search className="size-[18px] text-fg-subtle" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")}
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-fg-subtle" />
        </label>
        <select value={program} onChange={(e) => setProgram(e.target.value)} aria-label={t("all")}
          className="h-12 rounded-2xl border border-border-strong bg-surface px-3.5 text-[15px]">
          <option value="">{t("all")}</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {list.map((s, i) => (
          <motion.li key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
            <Link href={`/manage/students/${s.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--shadow-soft)] transition-colors hover:border-border-strong">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-route text-sm font-semibold text-white">
                {s.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold">{s.name}</span>
                  {s.english && <span className="shrink-0 rounded-md bg-surface-2 px-1.5 text-xs font-semibold">{s.english}</span>}
                </span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {s.programs.map((p) => (
                    <span key={p.id} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: `color-mix(in oklab, ${p.color} 14%, transparent)`, color: p.color }}>
                      <ProgramIcon name={p.icon} className="size-3" aria-hidden /> {tj(`stages.${p.stage as "application"}.title`)}
                    </span>
                  ))}
                </span>
              </span>
              {s.pendingDocs > 0 && (
                <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-soft px-2 py-1 text-xs font-semibold text-warning")}>
                  <FileClock className="size-3.5" aria-hidden /> {s.pendingDocs}
                </span>
              )}
              <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            </Link>
          </motion.li>
        ))}
        {!list.length && <p className="py-10 text-center text-fg-muted">{t("empty")}</p>}
      </ul>
    </div>
  );
}
