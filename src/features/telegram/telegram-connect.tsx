"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Loader2, Send, Unlink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { celebrate } from "@/components/motion/confetti";
import { Button } from "@/components/ui/button";
import { createTelegramLink, disconnectTelegram, telegramStatus } from "./actions";

/** «Подключить Telegram»: deep link с одноразовым токеном, затем ждём, пока бот привяжет чат. */
export function TelegramConnect({ initial }: { initial: { connected: boolean; username: string | null } }) {
  const t = useTranslations("telegram");
  const [state, setState] = useState(initial);
  const [waiting, setWaiting] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const connect = () =>
    start(async () => {
      // Вкладку открываем сразу — иначе браузер посчитает это всплывающим окном
      const w = window.open("about:blank", "_blank");
      const res = await createTelegramLink();
      if (!res.ok) {
        w?.close();
        toast.error(t("notConfigured"));
        return;
      }
      if (w) w.location.href = res.url;
      setWaiting(res.url);
      const started = Date.now();
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(async () => {
        const s = await telegramStatus();
        if (s.connected) {
          clearInterval(timer.current!);
          setWaiting(null);
          setState(s);
          toast.success(t("success"));
          celebrate();
        } else if (Date.now() - started > 15 * 60_000) {
          clearInterval(timer.current!);
          setWaiting(null);
          toast(t("expired"));
        }
      }, 2500);
    });

  if (state.connected) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 font-semibold text-success">
          <CheckCircle2 className="size-5" aria-hidden />
          {state.username ? t("connectedAs", { username: state.username }) : t("connectedNoName")}
        </p>
        <Button size="sm" variant="ghost" loading={pending} onClick={() => start(async () => {
          await disconnectTelegram();
          setState({ connected: false, username: null });
        })}>
          <Unlink className="size-4" aria-hidden /> {t("disconnect")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-fg-muted">{t("hint")}</p>
      <Button type="button" onClick={connect} loading={pending} className="bg-[#229ED9] text-white shadow-[0_8px_24px_-10px_#229ED9] hover:bg-[#1c8cc2] sm:self-start">
        <Send className="size-4" aria-hidden /> {t("connect")}
      </Button>
      <AnimatePresence>
        {waiting && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 text-sm text-fg-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden /> {t("waiting")}
            <a href={waiting} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">{t("openBot")}</a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
