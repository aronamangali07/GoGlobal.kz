"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

/** Правая колонка на десктопе / «шторка» снизу на телефоне. */
export function AuthPanel({ children }: { children: React.ReactNode }) {
  const t = useTranslations("auth.tabs");
  const pathname = usePathname();
  const tabs = [
    { href: "/login", label: t("login") },
    { href: "/register", label: t("register") },
  ] as const;

  return (
    <motion.section
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.15 }}
      className={cn(
        "relative z-10 -mt-14 flex flex-col rounded-t-[28px] bg-bg px-5 pb-10 pt-6 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.5)]",
        "sm:px-8 lg:mt-0 lg:rounded-none lg:px-12 lg:pt-7 lg:shadow-none",
      )}
    >
      <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-border-strong lg:hidden" aria-hidden />
      <div className="hidden justify-end lg:flex">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col lg:justify-center">
        <nav aria-label="auth" className="relative mb-7 grid grid-cols-2 rounded-full bg-surface-2 p-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative z-10 rounded-full py-2.5 text-center text-sm font-semibold transition-colors",
                  active ? "text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="auth-tab"
                    className="absolute inset-0 -z-10 rounded-full bg-surface shadow-[var(--shadow-soft)]"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                {tab.label}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </motion.section>
  );
}
