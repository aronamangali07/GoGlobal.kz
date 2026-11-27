"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, CircleDashed, Clock3, RotateCcw, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { registerDocument } from "./actions";
import { OpenDocument } from "./open-document";

export type ChecklistItem = {
  typeId: string;
  name: string;
  description: string;
  required: boolean;
  doc: { id: string; status: "pending" | "accepted" | "rework"; comment: string; fileName: string } | null;
};

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const STATUS = {
  pending: { icon: Clock3, cls: "bg-warning-soft text-warning" },
  accepted: { icon: CheckCircle2, cls: "bg-success-soft text-success" },
  rework: { icon: RotateCcw, cls: "bg-danger-soft text-danger" },
} as const;

/** Кольцо прогресса принятых документов. */
function Ring({ done, total }: { done: number; total: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <svg viewBox="0 0 64 64" className="size-16 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
      <motion.circle cx="32" cy="32" r={r} fill="none" stroke="var(--success)" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1, ease: "easeOut" }} />
    </svg>
  );
}

export function DocumentChecklist({ userId, items }: { userId: string; items: ChecklistItem[] }) {
  const t = useTranslations("documents");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const target = useRef<string | null>(null);

  const required = items.filter((i) => i.required);
  const accepted = required.filter((i) => i.doc?.status === "accepted").length;

  const upload = async (file: File | undefined) => {
    const typeId = target.current;
    if (!file || !typeId) return;
    if (file.size > 10 * 1024 * 1024) return toast.error(t("tooBig"));
    if (!ACCEPT.split(",").includes(file.type)) return toast.error(t("badType"));
    setBusy(typeId);
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
      const path = `${userId}/${typeId}/${Date.now()}-${safe}`;
      const { error } = await createClient().storage.from("documents").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const res = await registerDocument({ documentTypeId: typeId, path, name: file.name, mime: file.type, size: file.size });
      if (!res.ok) throw new Error(res.error);
      toast.success(t("uploaded"));
      router.refresh();
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center gap-4">
        <div className="relative grid place-items-center">
          <Ring done={accepted} total={required.length} />
          <span className="absolute text-sm font-bold">{accepted}/{required.length}</span>
        </div>
        <div>
          <p className="font-semibold">{t("progress", { done: accepted, total: required.length })}</p>
          {accepted === required.length && required.length > 0 && <p className="text-sm text-success">{t("allDone")}</p>}
        </div>
      </Card>

      <ul className="flex flex-col gap-2.5">
        {items.map((it, i) => {
          const s = it.doc ? STATUS[it.doc.status] : null;
          const Icon = s?.icon ?? CircleDashed;
          const loading = busy === it.typeId;
          return (
            <motion.li key={it.typeId} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={cn("rounded-2xl border bg-surface p-4 shadow-[var(--shadow-soft)]", it.doc?.status === "rework" ? "border-danger/40" : "border-border")}>
              <div className="flex items-start gap-3">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", s?.cls ?? "bg-surface-2 text-fg-subtle")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">
                    {it.name}
                    {!it.required && <span className="ml-1.5 text-xs font-normal text-fg-subtle">({t("optional")})</span>}
                  </p>
                  <p className="text-sm text-fg-muted">{it.description}</p>
                  <p className={cn("mt-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", s?.cls ?? "bg-surface-2 text-fg-subtle")}>
                    {it.doc ? t(`status.${it.doc.status}`) : t("notUploaded")}
                  </p>
                  {it.doc && <p className="mt-1 truncate text-xs text-fg-subtle">{it.doc.fileName}</p>}
                </div>
              </div>
              <AnimatePresence>
                {it.doc?.comment && it.doc.status === "rework" && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm">
                    <b>{t("comment")}:</b> {it.doc.comment}
                  </motion.p>
                )}
              </AnimatePresence>
              {it.doc?.status !== "accepted" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant={it.doc ? "secondary" : "primary"} loading={loading} disabled={!!busy}
                    onClick={() => { target.current = it.typeId; inputRef.current?.click(); }}>
                    {!loading && <Upload className="size-4" aria-hidden />} {loading ? t("uploading") : it.doc ? t("replace") : t("upload")}
                  </Button>
                  {it.doc && <OpenDocument id={it.doc.id} label={t("view")} />}
                </div>
              )}
              {it.doc?.status === "accepted" && <div className="mt-2"><OpenDocument id={it.doc.id} label={t("view")} /></div>}
            </motion.li>
          );
        })}
      </ul>
      <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} onChange={(e) => upload(e.target.files?.[0])} />
    </div>
  );
}
