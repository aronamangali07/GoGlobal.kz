"use client";

import { motion } from "motion/react";
import { GraduationCap, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { demoSignIn } from "./actions";

const ROLES = [
  { key: "student", icon: GraduationCap, color: "var(--route)" },
  { key: "manager", icon: Users, color: "var(--primary)" },
  { key: "admin", icon: ShieldCheck, color: "var(--accent)" },
] as const;

/** Быстрый вход для показа. Включается NEXT_PUBLIC_DEMO_MODE=true — выключить перед запуском для студентов. */
export function DemoAccess() {
  const t = useTranslations("auth.demo");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [active, setActive] = useState<string | null>(null);
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="mt-7 rounded-2xl border border-dashed border-border-strong p-4">
      <p className="text-sm font-semibold">{t("title")}</p>
      <p className="text-xs text-fg-muted">{t("subtitle")}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {ROLES.map(({ key, icon: Icon, color }) => (
          <motion.button key={key} type="button" whileTap={{ scale: 0.95 }} disabled={pending}
            onClick={() => {
              setActive(key);
              start(async () => {
                const r = await demoSignIn(key);
                if (!r.ok) {
                  toast.error("Не удалось войти");
                  setActive(null);
                  return;
                }
                router.replace("/dashboard");
                router.refresh();
              });
            }}
            className={cn("flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-1 py-3 text-center transition-colors hover:border-border-strong disabled:opacity-60",
              active === key && "border-primary")}>
            <span className={cn("grid size-9 place-items-center rounded-full", active === key && pending && "animate-pulse")}
              style={{ background: `color-mix(in oklab, ${color} 15%, transparent)`, color }}>
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span className="text-sm font-semibold">{t(key)}</span>
            <span className="text-[10px] leading-tight text-fg-subtle">{t(`${key}Hint`)}</span>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}
