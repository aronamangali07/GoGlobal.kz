"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgramIcon } from "@/components/ui/program-icon";
import { cn } from "@/lib/utils";
import { createProgram } from "./actions";

const TYPES = ["text", "textarea", "number", "money", "date", "boolean", "country", "select"] as const;
const ICONS = ["globe", "sun", "baby", "briefcase", "tent"] as const;
const COLORS = ["#3552f2", "#ff7a2f", "#e64980", "#12a150", "#0fb5ad", "#7c3aed"];

// Транслитерация для автоматического адреса и ключей полей
const TR: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e", ю: "yu", я: "ya", қ: "q", ә: "a", ғ: "g", ң: "n", ө: "o", ұ: "u", ү: "u", һ: "h", і: "i" };
const slugify = (s: string, sep = "-") =>
  s.toLowerCase().split("").map((c) => TR[c] ?? c).join("").replace(/[^a-z0-9]+/g, sep).replace(new RegExp(`^\\${sep}+|\\${sep}+$`, "g"), "").slice(0, 40);

type Field = { label: string; type: (typeof TYPES)[number]; unit: string; required: boolean; options: string };

export function ProgramBuilder() {
  const t = useTranslations("admin.programs");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [v, setV] = useState({ name: "", slug: "", tagline: "", description: "", color: COLORS[5], icon: "globe" as (typeof ICONS)[number] });
  const [slugTouched, setSlugTouched] = useState(false);
  const [fields, setFields] = useState<Field[]>([
    { label: "Компания", type: "text", unit: "", required: true, options: "" },
    { label: "Страна", type: "country", unit: "", required: true, options: "" },
    { label: "Город", type: "text", unit: "", required: false, options: "" },
  ]);

  const submit = () =>
    start(async () => {
      const keys = new Set<string>();
      const payload = fields.filter((f) => f.label.trim()).map((f) => {
        let key = f.type === "country" ? "country" : /город|city/i.test(f.label) ? "city" : slugify(f.label, "_") || "field";
        if (!/^[a-z]/.test(key)) key = `f_${key}`;
        while (keys.has(key)) key = `${key}_2`;
        keys.add(key);
        return {
          key, label: f.label.trim(), type: f.type, required: f.required,
          ...(f.unit.trim() ? { unit: f.unit.trim() } : {}),
          ...(f.type === "select" ? { options: f.options.split(",").map((o) => o.trim()).filter(Boolean) } : {}),
        };
      });
      const res = await createProgram({ ...v, fields: payload });
      if (!res.ok) {
        toast.error(res.error === "slug" ? "Такой адрес уже занят" : "Проверьте поля");
        return;
      }
      toast.success(t("created"));
      setOpen(false);
      router.refresh();
    });

  if (!open) return <Button onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden /> {t("new")}</Button>;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t("name")} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value, slug: slugTouched ? v.slug : slugify(e.target.value) })} placeholder="Summer School" />
        <Input label={t("slug")} value={v.slug} onChange={(e) => { setSlugTouched(true); setV({ ...v, slug: e.target.value }); }} />
        <div className="sm:col-span-2"><Input label={t("tagline")} value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} /></div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="mb-1.5 text-sm font-medium">{t("color")}</p>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" aria-label={c} aria-pressed={v.color === c} onClick={() => setV({ ...v, color: c })}
                className={cn("size-8 rounded-full ring-offset-2 ring-offset-surface", v.color === c && "ring-2 ring-fg")} style={{ background: c }} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">{t("icon")}</p>
          <div className="flex gap-1.5">
            {ICONS.map((i) => (
              <button key={i} type="button" aria-label={i} aria-pressed={v.icon === i} onClick={() => setV({ ...v, icon: i })}
                className={cn("grid size-9 place-items-center rounded-xl border", v.icon === i ? "border-fg bg-surface-2" : "border-border")} style={{ color: v.color }}>
                <ProgramIcon name={i} className="size-5" />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">{t("fields")}</p>
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {fields.map((f, i) => (
              <motion.li key={i} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl bg-surface-2 p-2.5 sm:grid-cols-[1fr_9rem_5.5rem_auto_auto] sm:items-center">
                <input aria-label={t("fieldLabel")} placeholder={t("fieldLabel")} value={f.label} onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  className="col-span-2 h-10 rounded-xl border border-border-strong bg-surface px-3 text-[15px] sm:col-span-1" />
                <select aria-label={t("fieldType")} value={f.type} onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, type: e.target.value as Field["type"] } : x)))}
                  className="h-10 rounded-xl border border-border-strong bg-surface px-2 text-sm">
                  {TYPES.map((ty) => <option key={ty} value={ty}>{t(`types.${ty}`)}</option>)}
                </select>
                <input aria-label={t("fieldUnit")} placeholder={f.type === "select" ? "a, b, c" : t("fieldUnit")} value={f.type === "select" ? f.options : f.unit}
                  onChange={(e) => setFields(fields.map((x, j) => (j === i ? (f.type === "select" ? { ...x, options: e.target.value } : { ...x, unit: e.target.value }) : x)))}
                  className="h-10 rounded-xl border border-border-strong bg-surface px-2 text-sm" />
                <label className="flex items-center gap-1.5 text-xs font-medium">
                  <input type="checkbox" checked={f.required} onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)))} className="size-4 accent-[var(--primary)]" />
                  {t("fieldRequired")}
                </label>
                <button type="button" aria-label="Удалить поле" onClick={() => setFields(fields.filter((_, j) => j !== i))} className="grid size-9 place-items-center rounded-full text-fg-subtle hover:text-danger">
                  <Trash2 className="size-4" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setFields([...fields, { label: "", type: "text", unit: "", required: false, options: "" }])}>
          <Plus className="size-4" aria-hidden /> {t("addField")}
        </Button>
      </div>
      <div className="flex gap-2">
        <Button loading={pending} onClick={submit} disabled={v.name.trim().length < 2 || !fields.some((f) => f.label.trim())}>{t("create")}</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
      </div>
    </motion.div>
  );
}
