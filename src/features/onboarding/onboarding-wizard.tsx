"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, BellRing, CalendarDays, GraduationCap, Plane, Send, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { celebrate } from "@/components/motion/confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { TelegramConnect } from "@/features/telegram/telegram-connect";
import { completeOnboarding, saveOnboardingStep, type OnboardingStep } from "@/features/profile/actions";
import { AvatarUploader } from "@/features/profile/avatar-uploader";
import { ageFrom, type EnglishLevel, type Preferences } from "@/features/profile/constants";
import { CountryChips, EnglishPicker, ProgramPicker, WorkChips, type ProgramOption } from "@/features/profile/fields";
import { englishSchema, personalSchema, preferencesSchema, programsSchema } from "@/features/profile/schema";

const STEPS = ["personal", "english", "avatar", "programs", "preferences", "telegram"] as const;
type Step = (typeof STEPS)[number];

export type OnboardingInitial = {
  userId: string;
  full_name: string;
  birth_date: string;
  university: string;
  english_level: EnglishLevel | null;
  avatar_path: string | null;
  avatar_url: string | null;
  program_ids: string[];
  preferences: Preferences;
};

const ICONS: Record<Step, typeof UserRound> = {
  personal: UserRound,
  english: GraduationCap,
  avatar: UserRound,
  programs: Plane,
  preferences: CalendarDays,
  telegram: BellRing,
};

/** Прогресс в виде маршрута: самолёт летит от Алматы к цели. */
function FlightProgress({ index, total }: { index: number; total: number }) {
  const t = useTranslations("onboarding");
  const pct = (index / (total - 1)) * 100;
  return (
    <div className="px-1">
      <div className="mb-2 flex justify-between text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
        <span>{t("from")}</span>
        <span>{t("stepOf", { current: index + 1, total })}</span>
      </div>
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-0 -translate-y-1/2 border-t-2 border-dashed border-border-strong" />
        <motion.div
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-route to-primary"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn(
              "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors",
              i <= index ? "border-primary bg-primary" : "border-border-strong bg-bg",
            )}
            style={{ left: `${(i / (total - 1)) * 100}%` }}
          />
        ))}
        <motion.span
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={false}
          animate={{ left: `${pct}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        >
          <span className="grid size-8 place-items-center rounded-full bg-accent text-white shadow-[0_6px_20px_-6px_var(--accent)]">
            <Plane className="size-4" aria-hidden />
          </span>
        </motion.span>
      </div>
    </div>
  );
}

export function OnboardingWizard({ initial, programs }: { initial: OnboardingInitial; programs: ProgramOption[] }) {
  const t = useTranslations("onboarding");
  const tp = useTranslations("profile");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [personal, setPersonal] = useState({
    full_name: initial.full_name,
    birth_date: initial.birth_date,
    university: initial.university,
  });
  const [english, setEnglish] = useState<EnglishLevel | null>(initial.english_level);
  const [programIds, setProgramIds] = useState(initial.program_ids);
  const [prefs, setPrefs] = useState({
    countries: initial.preferences.countries ?? [],
    workTypes: initial.preferences.workTypes ?? [],
    note: initial.preferences.note ?? "",
  });

  const step = STEPS[index];
  const err = (k: string) => (errors[k] ? tp(`errors.${errors[k]}` as "errors.generic") : undefined);

  const payloadFor = (s: Step): [OnboardingStep, unknown, { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } } }] | null => {
    switch (s) {
      case "personal":
        return ["personal", personal, personalSchema];
      case "english":
        return ["english", { english_level: english }, englishSchema];
      case "programs":
        return ["programs", { program_ids: programIds }, programsSchema];
      case "preferences":
        return ["preferences", prefs, preferencesSchema];
      default:
        return null;
    }
  };

  const go = (delta: number) => {
    setDirection(delta);
    setErrors({});
    setFormError(null);
    setIndex((i) => Math.min(STEPS.length - 1, Math.max(0, i + delta)));
  };

  const next = () => {
    const p = payloadFor(step);
    if (!p) {
      if (step === "telegram") return finish();
      return go(1);
    }
    const [name, data, schema] = p;
    const check = schema.safeParse(data);
    if (!check.success) {
      const next: Record<string, string> = {};
      for (const i of check.error!.issues) next[String(i.path[0] ?? "_")] ??= i.message;
      setErrors(next);
      return;
    }
    startTransition(async () => {
      const res = await saveOnboardingStep(name, data);
      if (!res.ok) {
        if (res.field) setErrors({ [res.field]: res.error });
        else setFormError(res.error);
        return;
      }
      go(1);
    });
  };

  const finish = () => {
    startTransition(async () => {
      const res = await completeOnboarding();
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setDone(true);
      celebrate();
    });
  };

  const age = ageFrom(personal.birth_date);
  const Icon = ICONS[step];

  if (done) {
    return (
      <Shell>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-1 flex-col items-center justify-center py-10 text-center"
        >
          <motion.div
            initial={{ x: -120, y: 40, rotate: -20, opacity: 0 }}
            animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 60, damping: 12 }}
            className="grid size-24 place-items-center rounded-[28px] bg-gradient-to-br from-primary to-route text-white shadow-[var(--shadow-lift)]"
          >
            <Plane className="size-11" aria-hidden />
          </motion.div>
          <h1 className="mt-8 font-display text-3xl font-semibold">{t("doneTitle")}</h1>
          <p className="mt-3 max-w-sm text-fg-muted">{t("doneText")}</p>
          <Button
            size="lg"
            className="mt-8"
            onClick={() => {
              router.replace("/dashboard");
              router.refresh();
            }}
          >
            {t("doneButton")} <ArrowRight className="size-[18px]" aria-hidden />
          </Button>
        </motion.div>
      </Shell>
    );
  }

  return (
    <Shell>
      <FlightProgress index={index} total={STEPS.length} />

      <div className="relative mt-8 flex-1">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.section
            key={step}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d * 40, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -40, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              <Icon className="size-3.5" aria-hidden /> {t(`steps.${step}`)}
            </span>
            <h1 className="mt-3 font-display text-[26px] font-semibold leading-tight sm:text-3xl">{t(`${step}Title`)}</h1>
            <p className="mt-1.5 text-fg-muted">{t(`${step}Text`)}</p>

            <div className="mt-6">
              {step === "personal" && (
                <div className="flex flex-col gap-4">
                  <Input
                    label={tp("fullName")}
                    placeholder={tp("fullNamePlaceholder")}
                    hint={tp("fullNameHint")}
                    autoComplete="name"
                    value={personal.full_name}
                    error={err("full_name")}
                    onChange={(e) => setPersonal({ ...personal, full_name: e.target.value })}
                  />
                  <Input
                    label={tp("birthDate")}
                    type="date"
                    autoComplete="bday"
                    max={new Date().toISOString().slice(0, 10)}
                    value={personal.birth_date}
                    error={err("birth_date")}
                    hint={age !== null && age > 0 ? tp("ageIs", { age: tc("years", { count: age }) }) : undefined}
                    onChange={(e) => setPersonal({ ...personal, birth_date: e.target.value })}
                  />
                  <Input
                    label={tp("university")}
                    placeholder={tp("universityPlaceholder")}
                    value={personal.university}
                    error={err("university")}
                    onChange={(e) => setPersonal({ ...personal, university: e.target.value })}
                  />
                </div>
              )}

              {step === "english" && (
                <>
                  <EnglishPicker value={english} onChange={setEnglish} error={err("english_level")} />
                  <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-sm text-fg-muted">{tp("englishHint")}</p>
                </>
              )}

              {step === "avatar" && (
                <AvatarUploader userId={initial.userId} initialPath={initial.avatar_path} initialUrl={initial.avatar_url} />
              )}

              {step === "programs" && (
                <ProgramPicker programs={programs} value={programIds} onChange={setProgramIds} error={err("program_ids")} />
              )}

              {step === "preferences" && (
                <div className="flex flex-col gap-6">
                  <CountryChips value={prefs.countries} onChange={(countries) => setPrefs({ ...prefs, countries })} />
                  <WorkChips value={prefs.workTypes} onChange={(workTypes) => setPrefs({ ...prefs, workTypes })} />
                  <Textarea
                    label={tp("note")}
                    placeholder={tp("notePlaceholder")}
                    value={prefs.note}
                    maxLength={500}
                    error={err("note")}
                    onChange={(e) => setPrefs({ ...prefs, note: e.target.value })}
                  />
                </div>
              )}

              {step === "telegram" && (
                <div className="overflow-hidden rounded-3xl border border-border bg-surface">
                  <div className="relative bg-gradient-to-br from-[#229ED9] to-[#1c7fc0] p-6 text-white">
                    <motion.div
                      animate={{ y: [0, -6, 0], rotate: [0, -6, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="grid size-14 place-items-center rounded-2xl bg-white/20 backdrop-blur"
                    >
                      <Send className="size-7" aria-hidden />
                    </motion.div>
                    <h2 className="mt-4 font-display text-xl font-semibold">{tp("telegramTitle")}</h2>
                    <p className="mt-1.5 text-sm text-white/85">{tp("telegramText")}</p>
                  </div>
                  <div className="p-5">
                    <TelegramConnect initial={{ connected: false, username: null }} />
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>

      {formError && (
        <p role="alert" className="mt-4 rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {tp(`errors.${formError}` as "errors.generic")}
        </p>
      )}

      {/* Липкая панель действий — удобно большим пальцем */}
      <div className="sticky bottom-0 -mx-5 mt-8 flex gap-3 border-t border-border bg-bg/85 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        {index > 0 && (
          <Button type="button" variant="secondary" size="lg" onClick={() => go(-1)} disabled={pending} aria-label={tc("back")}>
            <ArrowLeft className="size-[18px]" aria-hidden />
          </Button>
        )}
        {step === "avatar" ? (
          <Button type="button" size="lg" className="flex-1" onClick={() => go(1)}>
            {tc("next")} <ArrowRight className="size-[18px]" aria-hidden />
          </Button>
        ) : (
          <Button type="button" size="lg" className="flex-1" loading={pending} onClick={next}>
            {step === "telegram" ? tc("finish") : tc("next")}
            {!pending && <ArrowRight className="size-[18px]" aria-hidden />}
          </Button>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-5 sm:pt-8">
      <header className="mb-6 flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>
      {children}
    </main>
  );
}
