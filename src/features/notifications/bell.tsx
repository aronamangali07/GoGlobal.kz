"use client";

import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { Bell, CheckCheck, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TZ } from "@/features/offers/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Item = { id: string; type: string; title: string; body: string; link: string; read_at: string | null; created_at: string };

const EMOJI: Record<string, string> = {
  "offer.new": "✈️", "application.selected": "🎉", "application.approved": "✅", "application.waitlisted": "⏳", "application.rejected": "📭",
  "application.ineligible": "📭", "event.scheduled": "📅", "event.reminder24": "⏰", "event.reminder1": "⏰", "document.accepted": "✅",
  "document.rework": "✏️", "payment.due": "💳", announcement: "📣", "message.new": "💬", "application.new": "🙋", "document.uploaded": "📄", "offer.window_closed": "🔒",
};

const when = (iso: string) => new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Колокольчик: живые уведомления (Supabase Realtime) с анимированным тостом. */
export function NotificationBell({ userId, initialUnread }: { userId: string; initialUnread: number }) {
  const t = useTranslations("notifications");
  const tn = useTranslations("nav");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[] | null>(null);
  const [supabase] = useState(() => createClient());
  const bell = useAnimationControls();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        const n = payload.new as Item;
        setUnread((u) => u + 1);
        setItems((prev) => (prev ? [n, ...prev] : prev));
        bell.start({ rotate: [0, -18, 16, -12, 8, -4, 0], transition: { duration: 0.8 } });
        toast.custom(
          (id) => (
            <motion.button
              type="button"
              initial={{ y: -20, scale: 0.9, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              onClick={() => {
                toast.dismiss(id);
                router.push(n.link);
              }}
              className="flex w-[min(92vw,380px)] items-start gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-4 text-left shadow-[var(--shadow-lift)]"
            >
              <motion.span
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-route text-xl"
                animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 0.8 }}
              >
                {EMOJI[n.type] ?? "🔔"}
              </motion.span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-accent">{n.type === "offer.new" ? "Новый оффер!" : t("toastNew")}</span>
                <span className="block font-semibold leading-snug text-fg">{n.title}</span>
                <span className="mt-0.5 line-clamp-2 block text-sm text-fg-muted">{n.body}</span>
              </span>
            </motion.button>
          ),
          { duration: 7000 },
        );
        router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, bell, router, t]);

  // Закрытие по клику вне и по Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => panel.current && !panel.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !items) {
      const { data } = await supabase.from("notifications").select("id, type, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(30);
      setItems(data ?? []);
    }
  };

  const markAll = async () => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    setUnread(0);
    setItems((prev) => prev?.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })) ?? prev);
  };

  const openItem = async (n: Item) => {
    setOpen(false);
    if (!n.read_at) {
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) => prev?.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)) ?? prev);
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    }
    router.push(n.link);
  };

  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`${t("title")}${unread ? ` (${unread})` : ""}`}
        aria-expanded={open}
        className="relative grid size-10 place-items-center rounded-full border border-border bg-surface text-fg-muted hover:text-fg"
      >
        <motion.span animate={bell} style={{ originY: 0.1 }}>
          <Bell className="size-[18px]" />
        </motion.span>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white ring-2 ring-bg"
            >
              {unread > 99 ? "99+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-lift)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-semibold">{t("title")}</p>
              {unread > 0 && (
                <button type="button" onClick={markAll} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  <CheckCheck className="size-4" aria-hidden /> {t("markAll")}
                </button>
              )}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto">
              {items === null && <li className="p-6 text-center text-sm text-fg-muted">…</li>}
              {items?.length === 0 && <li className="p-6 text-center text-sm text-fg-muted">{t("empty")}</li>}
              {items?.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => openItem(n)} className={cn("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2", !n.read_at && "bg-primary-soft/50")}>
                    <span className="text-xl" aria-hidden>{EMOJI[n.type] ?? "🔔"}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug">{n.title}</span>
                      <span className="line-clamp-2 block text-xs text-fg-muted">{n.body}</span>
                      <span className="mt-0.5 block text-[11px] text-fg-subtle">{when(n.created_at)}</span>
                    </span>
                    {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 border-t border-border px-4 py-3 text-sm font-semibold text-fg-muted hover:text-fg">
              <Settings className="size-4" aria-hidden /> {t("settings")}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">{tn("notifications")}</span>
    </div>
  );
}
