"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCheck, SendHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TZ } from "@/features/offers/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string; read_at: string | null };

const time = (iso: string) => new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const day = (iso: string) => new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, day: "numeric", month: "long" }).format(new Date(iso));

/** Чат в реальном времени (Supabase Realtime, доступ — через RLS). */
export function ChatRoom({
  threadId,
  meId,
  initial,
  title,
  subtitle,
}: {
  threadId: string;
  meId: string;
  initial: ChatMessage[];
  title: string;
  subtitle?: string;
}) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    supabase.rpc("mark_thread_read", { p_thread_id: threadId });
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` }, (payload) => {
        const m = payload.new as ChatMessage;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        if (m.sender_id !== meId) supabase.rpc("mark_thread_read", { p_thread_id: threadId });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` }, (payload) => {
        const m = payload.new as ChatMessage;
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, read_at: m.read_at } : x)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, threadId, meId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const id = crypto.randomUUID();
    const optimistic: ChatMessage = { id, sender_id: meId, body, created_at: new Date().toISOString(), read_at: null };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    const { error } = await supabase.from("messages").insert({ id, thread_id: threadId, sender_id: meId, body });
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setText(body);
      toast.error(t("error"));
    }
    setSending(false);
  };

  // Разделитель дня — перед первым сообщением каждого дня
  const dayOf = messages.map((m) => day(m.created_at));
  return (
    <div className="flex h-[calc(100dvh-12.5rem)] min-h-[420px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-soft)] lg:h-[calc(100dvh-9rem)]">
      <div className="border-b border-border px-4 py-3">
        <p className="font-semibold">{title}</p>
        {subtitle && <p className="text-xs text-fg-muted">{subtitle}</p>}
      </div>
      <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_20%_0%,var(--primary-soft),transparent_40%)] px-3 py-4" aria-live="polite">
        {!messages.length && <p className="mt-10 text-center text-sm text-fg-muted">{t("empty")}</p>}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            const mine = m.sender_id === meId;
            const d = dayOf[i];
            const showDay = i === 0 || dayOf[i - 1] !== d;
            return (
              <div key={m.id}>
                {showDay && <p className="my-3 text-center text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{d}</p>}
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className={cn("mb-1.5 flex", mine ? "justify-end" : "justify-start")}
                >
                  <div className={cn("max-w-[82%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug shadow-sm",
                    mine ? "rounded-br-md bg-primary text-primary-fg" : "rounded-bl-md bg-surface-2 text-fg")}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10px]", mine ? "text-primary-fg/75" : "text-fg-subtle")}>
                      {time(m.created_at)}
                      {mine && m.read_at && <CheckCheck className="size-3" aria-label={t("read")} />}
                    </p>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>
        <div ref={bottom} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-border p-2.5"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl bg-surface-2 px-4 py-2.5 text-[16px] outline-none placeholder:text-fg-subtle"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="submit"
          disabled={!text.trim()}
          aria-label={t("send")}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-fg disabled:opacity-40"
        >
          <SendHorizontal className="size-5" />
        </motion.button>
      </form>
    </div>
  );
}
