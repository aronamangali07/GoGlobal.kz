"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// Событие beforeinstallprompt приходит один раз и рано — ловим его глобально, до монтирования компонентов
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useInstall() {
  const canPrompt = useSyncExternalStore(subscribe, () => !!deferred, () => false);
  const [env, setEnv] = useState({ standalone: false, ios: false });

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- определение среды доступно только в браузере
    setEnv({ standalone, ios });
  }, []);

  const install = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    listeners.forEach((l) => l());
    return outcome === "accepted";
  };

  return { canPrompt, install, standalone: env.standalone, ios: env.ios };
}
