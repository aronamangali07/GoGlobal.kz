"use client";

import { motion } from "motion/react";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, STAFF_NAV, STAFF_NAV_EXTRA, STUDENT_NAV, STUDENT_NAV_EXTRA } from "./nav-items";
import { NotificationBell } from "@/features/notifications/bell";

type ShellUser = { id: string; name: string; email: string; avatarUrl: string | null; role: string; unread: number };

function Avatar({ user, className }: { user: ShellUser; className?: string }) {
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return user.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка Supabase, оптимизация не нужна
    <img src={user.avatarUrl} alt="" className={cn("rounded-full object-cover", className)} />
  ) : (
    <span
      className={cn(
        "grid place-items-center rounded-full bg-gradient-to-br from-primary to-route font-semibold text-white",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const nav = user.role === "student" ? STUDENT_NAV : user.role === "admin" ? ADMIN_NAV : STAFF_NAV;
  // На десктопе у студента в боковом меню ещё календарь, документы и оплаты
  const sideNav = user.role === "student" ? [...STUDENT_NAV.slice(0, 3), ...STUDENT_NAV_EXTRA, ...STUDENT_NAV.slice(3)] : user.role === "admin"
        ? [...STAFF_NAV, ...STAFF_NAV_EXTRA, ADMIN_NAV[3]]
        : [...STAFF_NAV, ...STAFF_NAV_EXTRA];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* Десктоп: боковое меню */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-bg-elevated px-4 py-6 lg:flex">
        <Link href="/dashboard" className="px-2">
          <Logo />
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {sideNav.map(({ href, key, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
                  active ? "text-primary" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="side-active"
                    className="absolute inset-0 -z-10 rounded-xl bg-primary-soft"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <Icon className="size-5" aria-hidden />
                {t(key)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
          <Avatar user={user} className="size-10 text-sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-fg-muted">{user.email}</p>
          </div>
          <Link href="/settings" className="grid size-9 place-items-center rounded-full text-fg-subtle hover:bg-surface-2 hover:text-fg" aria-label={t("settings")}>
            <Settings className="size-4" />
          </Link>
          <form action={signOut}>
            <button className="grid size-9 place-items-center rounded-full text-fg-subtle hover:bg-surface-2 hover:text-fg" aria-label={tc("signOut")}>
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col overflow-x-clip">
        {/* Верхняя панель */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-md sm:px-6 lg:justify-end">
          <Link href="/dashboard" className="lg:hidden">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell userId={user.id} initialUnread={user.unread} />
            {user.role === "student" ? (
              <Link href="/profile" className="lg:hidden" aria-label={t("profile")}>
                <Avatar user={user} className="size-10 text-sm" />
              </Link>
            ) : (
              <form action={signOut} className="lg:hidden">
                <button className="grid size-10 place-items-center rounded-full border border-border bg-surface text-fg-muted" aria-label={tc("signOut")}>
                  <LogOut className="size-[18px]" />
                </button>
              </form>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-12">{children}</main>
      </div>

      {/* Телефон: нижняя навигация */}
      <nav
        aria-label={t("menu")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {nav.map(({ href, key, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-fg-subtle",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="tab-active"
                      className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <motion.span whileTap={{ scale: 0.85 }}>
                    <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.8} aria-hidden />
                  </motion.span>
                  {t(key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export { Avatar };
