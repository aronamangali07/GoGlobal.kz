"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { reviewDocument } from "@/features/documents/actions";
import { createEvent, createPayment, deleteEvent, deletePayment, setPaid, setStage } from "./actions";

const STAGES = ["application", "interview", "offer", "documents", "embassy", "visa", "departure"] as const;
const selectCls = "h-12 w-full rounded-[var(--radius-md)] border border-border-strong bg-surface px-3.5 text-[16px] outline-none focus:border-primary";

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean }>, okMsg?: string, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error("Не получилось");
        return;
      }
      if (okMsg) toast.success(okMsg);
      after?.();
      router.refresh();
    });
  return { pending, run };
}

export function StageSelect({ studentId, enrollmentId, stage }: { studentId: string; enrollmentId: string; stage: string }) {
  const tj = useTranslations("journey");
  const t = useTranslations("students.card");
  const { pending, run } = useAction();
  return (
    <select
      aria-label={t("changeStage")}
      disabled={pending}
      value={stage}
      onChange={(e) => run(() => setStage(studentId, enrollmentId, e.target.value), t("stageChanged"))}
      className="h-10 rounded-full border border-border-strong bg-surface px-3 text-sm font-semibold"
    >
      {STAGES.map((s, i) => (
        <option key={s} value={s}>{i + 1}. {tj(`stages.${s}.title`)}</option>
      ))}
    </select>
  );
}

/** Назначение интервью / посольства / дедлайна. Студент увидит его в «Моём пути» и календаре. */
export function EventForm({ studentId, programs }: { studentId: string; programs: { id: string; name: string }[] }) {
  const t = useTranslations("students.card");
  const te = useTranslations("events");
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ programId: programs[0]?.id ?? "", type: "interview", title: "", at: "", address: "", notes: "" });
  return (
    <div>
      {!open && (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <Plus className="size-4" aria-hidden /> {t("addEvent")}
        </Button>
      )}
      <AnimatePresence>
        {open && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid gap-3 overflow-hidden sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!v.title || !v.at) return toast.error("Заполните название и дату");
              run(
                () => createEvent({ userId: studentId, programId: v.programId, type: v.type, title: v.title, startsAt: new Date(v.at).toISOString(), address: v.address, notes: v.notes }),
                t("eventSaved"),
                () => { setOpen(false); setV({ ...v, title: "", at: "", address: "", notes: "" }); },
              );
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium">{t("eventType")}
              <select className={selectCls} value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })}>
                {(["interview", "embassy", "deadline", "flight", "other"] as const).map((x) => <option key={x} value={x}>{te(`types.${x}`)}</option>)}
              </select>
            </label>
            {programs.length > 1 ? (
              <label className="flex flex-col gap-1.5 text-sm font-medium">Программа
                <select className={selectCls} value={v.programId} onChange={(e) => setV({ ...v, programId: e.target.value })}>
                  {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            ) : <div className="hidden sm:block" />}
            <div className="sm:col-span-2"><Input label={t("eventTitle")} placeholder={t("eventTitlePlaceholder")} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></div>
            <Input label={t("eventAt")} type="datetime-local" value={v.at} onChange={(e) => setV({ ...v, at: e.target.value })} />
            <Input label={t("eventAddress")} value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
            <div className="sm:col-span-2"><Textarea label={t("eventNotes")} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={pending}><Check className="size-4" aria-hidden /> OK</Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DeleteEventButton({ studentId, eventId }: { studentId: string; eventId: string }) {
  const t = useTranslations("students.card");
  const { pending, run } = useAction();
  return (
    <button type="button" disabled={pending} aria-label="Удалить" onClick={() => confirm("Удалить событие?") && run(() => deleteEvent(studentId, eventId), t("eventDeleted"))}
      className="grid size-9 shrink-0 place-items-center rounded-full text-fg-subtle hover:bg-surface-2 hover:text-danger">
      <Trash2 className="size-4" />
    </button>
  );
}

export function DocReview({ documentId, status }: { documentId: string; status: string }) {
  const t = useTranslations("students.card");
  const { pending, run } = useAction();
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState("");
  if (asking) {
    return (
      <div className="mt-3 flex flex-col gap-2">
        <Textarea label={t("reworkComment")} value={comment} onChange={(e) => setComment(e.target.value)} autoFocus />
        <div className="flex gap-2">
          <Button size="sm" variant="danger" loading={pending} disabled={!comment.trim()}
            onClick={() => run(() => reviewDocument(documentId, "rework", comment), t("reviewed"), () => setAsking(false))}>
            <RotateCcw className="size-4" aria-hidden /> {t("rework")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>Отмена</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {status !== "accepted" && (
        <Button size="sm" loading={pending} onClick={() => run(() => reviewDocument(documentId, "accepted"), t("reviewed"))}>
          <Check className="size-4" aria-hidden /> {t("accept")}
        </Button>
      )}
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => setAsking(true)}>
        <RotateCcw className="size-4" aria-hidden /> {t("rework")}
      </Button>
    </div>
  );
}

export function PaymentForm({ studentId, programs }: { studentId: string; programs: { id: string; name: string }[] }) {
  const t = useTranslations("payments");
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ programId: programs[0]?.id ?? "", title: "", amount: "", currency: "KZT", dueDate: "" });
  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden /> {t("add")}</Button>;
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
      e.preventDefault();
      run(() => createPayment({ userId: studentId, programId: v.programId, title: v.title, amount: v.amount, currency: v.currency, dueDate: v.dueDate || null }),
        undefined, () => { setOpen(false); setV({ ...v, title: "", amount: "", dueDate: "" }); });
    }}>
      <div className="sm:col-span-2"><Input label={t("titleLabel")} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Например: сбор за программу" /></div>
      <Input label={t("amount")} type="number" inputMode="decimal" min={1} value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />
      <label className="flex flex-col gap-1.5 text-sm font-medium">{t("currency")}
        <select className={selectCls} value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })}>
          <option>KZT</option><option>USD</option><option>EUR</option>
        </select>
      </label>
      <Input label={t("dueDate")} type="date" value={v.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} />
      {programs.length > 1 ? (
        <label className="flex flex-col gap-1.5 text-sm font-medium">Программа
          <select className={selectCls} value={v.programId} onChange={(e) => setV({ ...v, programId: e.target.value })}>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      ) : <div className="hidden sm:block" />}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={pending}><Check className="size-4" aria-hidden /> OK</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
      </div>
    </form>
  );
}

export function PaymentActions({ studentId, paymentId, paid }: { studentId: string; paymentId: string; paid: boolean }) {
  const t = useTranslations("payments");
  const { pending, run } = useAction();
  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
      <Button size="sm" variant={paid ? "ghost" : "secondary"} disabled={pending} onClick={() => run(() => setPaid(studentId, paymentId, !paid))}>
        {paid ? <Undo2 className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />} {paid ? t("markUnpaid") : t("markPaid")}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm(`${t("delete")}?`) && run(() => deletePayment(studentId, paymentId))}>
        <Trash2 className="size-4" aria-hidden /> {t("delete")}
      </Button>
    </div>
  );
}
