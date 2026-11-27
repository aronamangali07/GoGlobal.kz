"use client";

import { AnimatePresence, motion } from "motion/react";
import { Download, Plus, Share, SquarePlus, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInstall } from "./use-install";

const DISMISS_KEY = "gg-install-dismissed";
const SNOOZE_DAYS = 7;

/** Регистрирует service worker (только в продакшене — в dev он мешает горячей перезагрузке). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}

function IosSteps() {
  const t = useTranslations("pwa");
  return (
    <ol className="mt-3 flex flex-col gap-2.5 text-sm">
      {[
        [Share, t("iosStep1")],
        [SquarePlus, t("iosStep2")],
        [Plus, t("iosStep3")],
      ].map(([Icon, text], i) => {
        const I = Icon as typeof Share;
        return (
          <li key={i} className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-primary"><I className="size-4" aria-hidden /></span>
            {text as string}
          </li>
        );
      })}
    </ol>
  );
}

/** Баннер «Установите приложение»: Android/Chrome — кнопкой, iPhone — инструкцией. Скрывается на неделю. */
export function InstallBanner() {
  const t = useTranslations("pwa");
  const { canPrompt, install, standalone, ios } = useInstall();
  const [hidden, setHidden] = useState(true);
  const [iosOpen, setIosOpen] = useState(false);

  useEffect(() => {
    let snoozed = false;
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      snoozed = Date.now() - at < SNOOZE_DAYS * 86_400_000;
    } catch {
      // приватный режим — просто покажем
    }
    // показываем не сразу, чтобы не мешать первому впечатлению
    const id = setTimeout(() => setHidden(snoozed), 2500);
    return () => clearTimeout(id);
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const show = !hidden && !standalone && (canPrompt || ios);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-lift)] lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0"
          role="dialog"
          aria-label={t("title")}
        >
          <button type="button" onClick={dismiss} aria-label={t("later")} className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full text-fg-subtle hover:bg-surface-2">
            <X className="size-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <Image src="/icons/icon-192.png" alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl" />
            <div>
              <p className="font-semibold">{iosOpen ? t("iosTitle") : t("title")}</p>
              {!iosOpen && <p className="mt-0.5 text-sm text-fg-muted">{t("text")}</p>}
            </div>
          </div>
          {iosOpen ? (
            <>
              <IosSteps />
              <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={dismiss}>{t("ok")}</Button>
            </>
          ) : (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={async () => {
                  if (ios && !canPrompt) {
                    setIosOpen(true);
                    return;
                  }
                  if (await install()) toast.success(t("installed"));
                  setHidden(true);
                }}
              >
                <Download className="size-4" aria-hidden /> {t("install")}
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>{t("later")}</Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Карточка в настройках: установить / уже установлено / инструкция для iPhone. */
export function InstallCard() {
  const t = useTranslations("pwa");
  const { canPrompt, install, standalone, ios } = useInstall();
  if (standalone) return <p className="text-sm font-semibold text-success">{t("settingsInstalled")}</p>;
  return (
    <div>
      <p className="text-sm text-fg-muted">{t("settingsHint")}</p>
      {canPrompt && (
        <Button size="sm" className="mt-3" onClick={async () => (await install()) && toast.success(t("installed"))}>
          <Download className="size-4" aria-hidden /> {t("install")}
        </Button>
      )}
      {ios && !canPrompt && <IosSteps />}
    </div>
  );
}
