"use client";

import { Megaphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendAnnouncement } from "./actions";

export function BroadcastForm({ programs, canAll }: { programs: { id: string; name: string }[]; canAll: boolean }) {
  const t = useTranslations("broadcast");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState({ programId: programs[0]?.id ?? "", title: "", body: "" });
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await sendAnnouncement({ programId: v.programId || null, title: v.title, body: v.body });
          if (!res.ok) {
            toast.error(t("error"));
            return;
          }
          toast.success(t("sent", { count: res.count }), { icon: "📣" });
          setV({ ...v, title: "", body: "" });
          router.refresh();
        });
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {t("program")}
        <select value={v.programId} onChange={(e) => setV({ ...v, programId: e.target.value })}
          className="h-12 rounded-[var(--radius-md)] border border-border-strong bg-surface px-3.5 text-[16px]">
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          {canAll && <option value="">{t("allStudents")}</option>}
        </select>
      </label>
      <Input label={t("titleLabel")} value={v.title} maxLength={200} onChange={(e) => setV({ ...v, title: e.target.value })} />
      <Textarea label={t("bodyLabel")} value={v.body} maxLength={4000} rows={5} onChange={(e) => setV({ ...v, body: e.target.value })} />
      <Button type="submit" size="lg" loading={pending} disabled={v.title.trim().length < 2 || v.body.trim().length < 2} className="sm:self-start">
        <Megaphone className="size-5" aria-hidden /> {t("send")}
      </Button>
    </form>
  );
}
