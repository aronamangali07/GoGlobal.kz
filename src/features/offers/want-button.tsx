"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Hand, Hourglass, Lock, PartyPopper, Plane, Undo2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { celebrate } from "@/components/motion/confetti";
import { Button } from "@/components/ui/button";
import { applyToOffer, withdrawApplication } from "@/features/applications/actions";
import { cn } from "@/lib/utils";
import type { WindowState } from "./types";

export type MyAppState = {
  id: string;
  status: "pending" | "ineligible" | "selected" | "waitlisted" | "approved" | "rejected" | "withdrawn";
  rank: number | null;
} | null;

function StatusCard({
  tone,
  icon: Icon,
  title,
  text,
  children,
}: {
  tone: "success" | "route" | "warning" | "danger" | "neutral";
  icon: typeof CheckCircle2;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  const tones = {
    success: "border-success/30 bg-success-soft text-success",
    route: "border-route/30 bg-route-soft text-route",
    warning: "border-warning/30 bg-warning-soft text-warning",
    danger: "border-danger/30 bg-danger-soft text-danger",
    neutral: "border-border bg-surface-2 text-fg-muted",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("relative overflow-hidden rounded-2xl border p-4", tones[tone])}
      role="status"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="min-w-0 text-fg">
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-sm text-fg-muted">{text}</p>
          {children}
        </div>
      </div>
    </motion.div>
  );
}

export function WantButton({
  offerId,
  state,
  eligible,
  myApp,
  conflict,
}: {
  offerId: string;
  state: WindowState;
  eligible: boolean;
  myApp: MyAppState;
  conflict: { offerId: string; label: string } | null;
}) {
  const t = useTranslations("apply");
  const to = useTranslations("offers");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [justSent, setJustSent] = useState(false);
  const status = myApp?.status;

  // Конфетти один раз на заявку, когда студент впервые видит «Место ваше»
  useEffect(() => {
    if (!myApp || (status !== "selected" && status !== "approved")) return;
    const key = `gg-celebrated-${myApp.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // приватный режим браузера — просто покажем конфетти
    }
    const id = setTimeout(celebrate, 400);
    return () => clearTimeout(id);
  }, [myApp, status]);

  const apply = () =>
    start(async () => {
      const res = await applyToOffer(offerId);
      if (!res.ok) {
        toast.error(t(`errors.${res.error}` as "errors.generic"));
        return;
      }
      setJustSent(true);
      toast.success(t("sentTitle"), { icon: "✈️" });
      router.refresh();
    });

  const withdraw = () => {
    if (!myApp || !confirm(t("withdrawConfirm"))) return;
    start(async () => {
      const res = await withdrawApplication(myApp.id);
      if (!res.ok) toast.error(t(`errors.${res.error ?? "generic"}` as "errors.generic"));
      else {
        setJustSent(false);
        toast(t("withdrawn"));
        router.refresh();
      }
    });
  };

  if (status === "selected" || status === "approved") {
    return (
      <StatusCard tone="success" icon={PartyPopper} title={t(`${status}Title`)} text={t(`${status}Text`)}>
        <button type="button" onClick={celebrate} className="mt-2 text-sm font-semibold text-success underline-offset-2 hover:underline">
          🎉
        </button>
      </StatusCard>
    );
  }
  if (status === "waitlisted") return <StatusCard tone="warning" icon={Hourglass} title={t("waitlistedTitle", { rank: myApp?.rank ?? "—" })} text={t("waitlistedText")} />;
  if (status === "rejected") return <StatusCard tone="danger" icon={XCircle} title={t("rejectedTitle")} text={t("rejectedText")} />;
  if (status === "ineligible") return <StatusCard tone="neutral" icon={XCircle} title={t("ineligibleTitle")} text={t("ineligibleText")} />;

  if (status === "pending") {
    if (state !== "open") return <StatusCard tone="route" icon={Hourglass} title={t("pendingClosedTitle")} text={t("pendingClosedText")} />;
    return (
      <div className="flex flex-col gap-2">
        <StatusCard tone="route" icon={CheckCircle2} title={t("sentTitle")} text={t("sentText")}>
          <AnimatePresence>
            {justSent && (
              <motion.span
                initial={{ x: -40, y: 10, opacity: 0, rotate: -10 }}
                animate={{ x: 220, y: -30, opacity: [0, 1, 1, 0], rotate: -15 }}
                transition={{ duration: 1.6, ease: "easeInOut" }}
                className="pointer-events-none absolute"
                aria-hidden
              >
                <Plane className="size-6 text-accent" />
              </motion.span>
            )}
          </AnimatePresence>
        </StatusCard>
        <Button variant="ghost" size="sm" loading={pending} onClick={withdraw} className="self-center">
          <Undo2 className="size-4" aria-hidden /> {t("withdraw")}
        </Button>
      </div>
    );
  }

  const disabledReason = state !== "open" ? to("windowClosed") : !eligible ? to("notEligible") : conflict ? t("conflict", { offer: conflict.label }) : null;

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="lg"
        variant={disabledReason ? "secondary" : "accent"}
        disabled={!!disabledReason || pending}
        loading={pending}
        className={cn("w-full text-[17px]", disabledReason && conflict && "h-auto whitespace-normal py-3 text-sm")}
        onClick={apply}
      >
        {!pending &&
          (disabledReason ? (
            <Lock className="size-[18px] shrink-0" aria-hidden />
          ) : (
            <motion.span animate={{ rotate: [0, 14, -8, 14, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2.5 }}>
              <Hand className="size-5" aria-hidden />
            </motion.span>
          ))}
        {pending ? t("sending") : disabledReason ?? t("want")}
      </Button>
      {conflict && state === "open" && eligible && (
        <Link href={`/offers/${conflict.offerId}`} className="text-center text-sm font-semibold text-primary hover:underline">
          {t("conflictLink")}
        </Link>
      )}
    </div>
  );
}
