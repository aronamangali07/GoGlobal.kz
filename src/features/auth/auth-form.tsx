"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail, MailCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMagicLink, signInWithPassword, signUp } from "./actions";
import { loginSchema, magicLinkSchema, registerSchema, type AuthErrorCode } from "./schema";

type Mode = "login" | "register";
type Method = "password" | "magic";
type FormValues = { email: string; password: string; confirm: string };

const enter = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -12, filter: "blur(4px)" },
  transition: { duration: 0.28 },
};

export function AuthForm({ mode, initialError }: { mode: Mode; initialError?: "callback" }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [method, setMethod] = useState<Method>("password");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<AuthErrorCode | "callback" | null>(initialError ?? null);
  const [sent, setSent] = useState<{ email: string; reason: "magic" | "confirm" } | null>(null);

  const schema = mode === "register" ? registerSchema : method === "magic" ? magicLinkSchema : loginSchema;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    // схема меняется вместе с режимом — резолвер пересоздаётся на каждый рендер
    resolver: zodResolver(schema as typeof registerSchema),
    defaultValues: { email: "", password: "", confirm: "" },
  });

  const errText = (code?: string) => (code ? t(`errors.${code as AuthErrorCode}`) : undefined);

  const onSubmit = (values: FormValues) => {
    setFormError(null);
    startTransition(async () => {
      const action = mode === "register" ? signUp : method === "magic" ? sendMagicLink : signInWithPassword;
      const result = await action(values);
      if (!result.ok) {
        if (result.field) setError(result.field, { message: result.error });
        else setFormError(result.error);
        return;
      }
      if (result.kind === "check-email") {
        setSent({ email: result.email, reason: result.reason });
        return;
      }
      router.replace(mode === "register" ? "/onboarding" : "/dashboard");
      router.refresh();
    });
  };

  if (sent) {
    return (
      <motion.div {...enter} className="flex flex-col items-center py-6 text-center">
        <motion.div
          initial={{ scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="grid size-20 place-items-center rounded-3xl bg-route-soft text-route"
        >
          <MailCheck className="size-9" aria-hidden />
        </motion.div>
        <h2 className="mt-6 font-display text-2xl font-semibold">{t("checkEmailTitle")}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-fg-muted" role="status">
          {sent.reason === "magic"
            ? t("checkEmailText", { email: sent.email })
            : t("checkEmailConfirm", { email: sent.email })}
        </p>
        <Button variant="ghost" className="mt-6" onClick={() => setSent(null)}>
          {t("tryAgain")}
        </Button>
      </motion.div>
    );
  }

  const isMagic = mode === "login" && method === "magic";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={`${mode}-${method}`} {...enter}>
        <h2 className="font-display text-[26px] font-semibold leading-tight">
          {mode === "login" ? t("loginTitle") : t("registerTitle")}
        </h2>
        <p className="mt-1.5 text-[15px] text-fg-muted">
          {isMagic ? t("magicLinkHint") : mode === "login" ? t("loginSubtitle") : t("registerSubtitle")}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 flex flex-col gap-4">
          <Input
            label={t("email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            icon={<Mail className="size-[18px]" aria-hidden />}
            error={errText(errors.email?.message)}
            {...register("email")}
          />

          {!isMagic && (
            <Input
              label={t("password")}
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={t("passwordPlaceholder")}
              icon={<Lock className="size-[18px]" aria-hidden />}
              error={errText(errors.password?.message)}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  className="-mr-1 grid size-9 place-items-center rounded-full text-fg-subtle hover:text-fg"
                >
                  {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              }
              {...register("password")}
            />
          )}

          {mode === "register" && (
            <Input
              label={t("passwordConfirm")}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              icon={<KeyRound className="size-[18px]" aria-hidden />}
              error={errText(errors.confirm?.message)}
              {...register("confirm")}
            />
          )}

          <AnimatePresence>
            {formError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                role="alert"
                className="rounded-[var(--radius-md)] bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
              >
                {t(`errors.${formError}`)}
              </motion.p>
            )}
          </AnimatePresence>

          <Button type="submit" size="lg" loading={pending} className="mt-1 w-full">
            {isMagic ? t("sendLink") : mode === "login" ? t("submitLogin") : t("submitRegister")}
            {!pending && <ArrowRight className="size-[18px]" aria-hidden />}
          </Button>
        </form>

        {mode === "login" && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-fg-subtle">
              <span className="h-px flex-1 bg-border" />
              {t("or")}
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => {
                setFormError(null);
                // значения формы живут в react-hook-form, поэтому email не теряется
                setMethod((m) => (m === "password" ? "magic" : "password"));
              }}
            >
              {method === "password" ? (
                <>
                  <Sparkles className="size-[18px] text-accent" aria-hidden />
                  {t("magicLink")}
                </>
              ) : (
                <>
                  <Lock className="size-[18px]" aria-hidden />
                  {t("usePassword")}
                </>
              )}
            </Button>
          </>
        )}

        {mode === "register" && <p className="mt-5 text-center text-xs leading-relaxed text-fg-subtle">{t("terms")}</p>}
      </motion.div>
    </AnimatePresence>
  );
}
