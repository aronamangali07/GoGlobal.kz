"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "./actions";
import { AvatarUploader } from "./avatar-uploader";
import { ageFrom, type EnglishLevel, type Preferences } from "./constants";
import { CountryChips, EnglishPicker, ProgramPicker, WorkChips, type ProgramOption } from "./fields";
import { profileSchema } from "./schema";

export type ProfileFormInitial = {
  userId: string;
  email: string;
  full_name: string;
  birth_date: string;
  university: string;
  english_level: EnglishLevel | null;
  avatar_path: string | null;
  avatar_url: string | null;
  program_ids: string[];
  preferences: Preferences;
  telegram_connected: boolean;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-5 font-display text-lg font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

export function ProfileForm({ initial, programs }: { initial: ProfileFormInitial; programs: ProgramOption[] }) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const [v, setV] = useState({
    full_name: initial.full_name,
    birth_date: initial.birth_date,
    university: initial.university,
    english_level: initial.english_level,
    program_ids: initial.program_ids,
    preferences: {
      countries: initial.preferences.countries ?? [],
      workTypes: initial.preferences.workTypes ?? [],
      note: initial.preferences.note ?? "",
    },
  });
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => {
    setSaved(false);
    setV((prev) => ({ ...prev, [k]: value }));
  };
  const err = (k: string) => (errors[k] ? t(`errors.${errors[k]}` as "errors.generic") : undefined);
  const age = ageFrom(v.birth_date);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = profileSchema.safeParse(v);
    if (!check.success) {
      const next: Record<string, string> = {};
      for (const i of check.error.issues) next[String(i.path[0])] ??= i.message;
      setErrors(next);
      toast.error(t(`errors.${Object.values(next)[0]}` as "errors.generic"));
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await updateProfile(v);
      if (!res.ok) {
        if (res.field) setErrors({ [res.field]: res.error });
        toast.error(t(`errors.${res.error}` as "errors.generic"));
        return;
      }
      setSaved(true);
      toast.success(tc("saved"));
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Section title={t("sections.avatar")}>
        <AvatarUploader userId={initial.userId} initialPath={initial.avatar_path} initialUrl={initial.avatar_url} size="md" />
      </Section>

      <Section title={t("sections.personal")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label={t("fullName")} value={v.full_name} error={err("full_name")} autoComplete="name"
              onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <Input label={t("birthDate")} type="date" value={v.birth_date} error={err("birth_date")}
            hint={age !== null && age > 0 ? t("ageIs", { age: tc("years", { count: age }) }) : undefined}
            onChange={(e) => set("birth_date", e.target.value)} />
          <Input label={t("university")} value={v.university} error={err("university")}
            onChange={(e) => set("university", e.target.value)} />
          <div className="sm:col-span-2">
            <Input label="Email" value={initial.email} disabled readOnly />
          </div>
        </div>
      </Section>

      <Section title={t("sections.english")}>
        <EnglishPicker value={v.english_level} onChange={(l) => set("english_level", l)} error={err("english_level")} />
      </Section>

      <Section title={t("sections.programs")}>
        <p className="-mt-3 mb-4 text-sm text-fg-muted">{t("programsHint")}</p>
        <ProgramPicker programs={programs} value={v.program_ids} onChange={(ids) => set("program_ids", ids)} error={err("program_ids")} />
      </Section>

      <Section title={t("sections.preferences")}>
        <div className="flex flex-col gap-6">
          <CountryChips value={v.preferences.countries} onChange={(countries) => set("preferences", { ...v.preferences, countries })} />
          <WorkChips value={v.preferences.workTypes} onChange={(workTypes) => set("preferences", { ...v.preferences, workTypes })} />
          <Textarea label={t("note")} placeholder={t("notePlaceholder")} maxLength={500} value={v.preferences.note}
            onChange={(e) => set("preferences", { ...v.preferences, note: e.target.value })} />
        </div>
      </Section>

      <Section title={t("telegramTitle")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-fg-muted">{t("telegramSoon")}</p>
          <Button type="button" variant="secondary" disabled className="shrink-0">
            <Send className="size-4" aria-hidden /> {t("telegramButton")}
          </Button>
        </div>
      </Section>

      <div className="sticky bottom-20 z-20 lg:bottom-6">
        <Button type="submit" size="lg" loading={pending} className="w-full shadow-[var(--shadow-lift)]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={saved ? "s" : "n"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="inline-flex items-center gap-2">
              {saved && <Check className="size-[18px]" aria-hidden />}
              {saved ? tc("saved") : tc("save")}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>
    </form>
  );
}
