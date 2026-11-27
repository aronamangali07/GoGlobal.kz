"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bell, Plane, Shuffle } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Starfield } from "@/components/motion/starfield";
import type { City } from "@/components/globe/routes";

// Глобус только на клиенте: canvas + 60 КБ точек не нужны в SSR
const RouteGlobe = dynamic(() => import("@/components/globe/route-globe").then((m) => m.RouteGlobe), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse rounded-full bg-[radial-gradient(circle,#16224f,transparent_70%)]" />,
});

export function AuthHero() {
  const t = useTranslations("auth");
  const [city, setCity] = useState<City | null>(null);

  return (
    // Герой всегда «ночное небо» — класс dark включает тёмные токены только внутри
    <section className="dark relative isolate flex flex-col overflow-hidden bg-bg text-fg lg:min-h-dvh">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_70%_0%,#1a2a6c_0%,#070d26_55%,#040817_100%)]"
      />
      <Starfield className="-z-10" />

      <header className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 sm:pt-7">
        <Logo />
        <ThemeToggle className="border-white/10 bg-white/5 lg:hidden" />
      </header>

      <div className="relative mx-auto -mt-2 aspect-square w-[min(84vw,340px)] lg:mt-2 lg:w-[min(40vw,56vh,600px)]">
        <RouteGlobe className="size-full" onRouteChange={setCity} />

        {/* Чип «Сейчас летим» */}
        <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center lg:bottom-6">
          <AnimatePresence mode="wait">
            {city && (
              <motion.div
                key={city.id}
                initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-[13px] backdrop-blur-md"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-route opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-route" />
                </span>
                <span className="text-fg-muted">{t("nowFlying")}</span>
                <span className="font-semibold">
                  {t("from")} <Plane className="mx-0.5 inline size-3.5 -translate-y-px text-accent" aria-hidden />{" "}
                  {t(`routes.${city.id as "galveston"}.city`)}
                </span>
                <span className="hidden rounded-full bg-route/15 px-2 py-0.5 text-[11px] font-semibold text-route min-[400px]:inline">
                  {t(`routes.${city.id as "galveston"}.program`)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-5 pb-20 pt-3 text-center sm:px-8 lg:mt-auto lg:px-12 lg:pb-12 lg:text-left">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-route sm:text-xs"
        >
          {t("heroEyebrow")}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-2 font-display text-[24px] leading-[1.15] min-[400px]:text-[28px] font-semibold sm:text-4xl lg:text-5xl"
        >
          {t("heroTitle")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mx-auto mt-3 hidden max-w-md text-[15px] leading-relaxed text-fg-muted sm:block lg:mx-0"
        >
          {t("heroSubtitle")}
        </motion.p>
        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-6 hidden gap-3 lg:flex"
        >
          {[
            { icon: Shuffle, title: t("stats.fair"), hint: t("stats.fairHint") },
            { icon: Bell, title: t("stats.notify"), hint: t("stats.notifyHint") },
          ].map(({ icon: Icon, title, hint }) => (
            <li key={title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <Icon className="size-5 text-accent" aria-hidden />
              <span>
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs text-fg-muted">{hint}</span>
              </span>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
