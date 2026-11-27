"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TABS = [
  ["/admin", "dashboard"],
  ["/admin/users", "users"],
  ["/admin/programs", "programs"],
  ["/admin/settings", "settings"],
  ["/admin/audit", "audit"],
] as const;

export function AdminTabs() {
  const t = useTranslations("admin.tabs");
  const pathname = usePathname();
  return (
    <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {TABS.map(([href, key]) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={cn("relative shrink-0 px-3.5 pb-3 pt-1 text-sm font-semibold transition-colors", active ? "text-fg" : "text-fg-subtle hover:text-fg")}>
            {t(key)}
            {active && <motion.span layoutId="admin-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}
