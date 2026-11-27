import "server-only";
import { after } from "next/server";
import { SITE_URL } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { sendEmail } from "./email";
import { sendTelegram } from "./telegram";
import { channelEnabled, TYPE_EMOJI, type NotificationType, type Prefs } from "./types";

export type NotifyInput = {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  /** Путь на сайте, например /offers/<id> */
  link: string;
  /** Уникальный ключ события: повторный вызов с тем же ключом ничего не отправит */
  dedupeKey: string;
  data?: Record<string, unknown>;
};

/**
 * Каждое уведомление — одновременно в колокольчик, на почту и в Telegram (по настройкам).
 * Доставка идёт через очередь notification_deliveries: dedupe_key уникален, дважды не уйдёт.
 * Отправка — сразу после ответа пользователю (after), повторы — по крону.
 */
export async function notify(input: NotifyInput) {
  const ids = [...new Set(input.userIds)].filter(Boolean);
  if (!ids.length) return;
  const db = createAdminClient();
  const { data: profiles } = await db.from("profiles").select("id, notification_prefs, telegram_chat_id").in("id", ids);
  const emoji = TYPE_EMOJI[input.type];
  const payload = { type: input.type, title: input.title, body: input.body, link: input.link, emoji };
  const queued: string[] = [];

  for (const p of profiles ?? []) {
    const base = `${input.dedupeKey}:${p.id}`;
    // In-app: тот же dedupe — проверяем по наличию доставки или уведомления с этим ключом
    const { data: existing } = await db.from("notifications").select("id").eq("user_id", p.id).contains("data", { dedupe: base }).maybeSingle();
    let notificationId = existing?.id ?? null;
    if (!existing) {
      const { data: n } = await db
        .from("notifications")
        .insert({ user_id: p.id, type: input.type, title: input.title, body: input.body, link: input.link, data: { ...(input.data ?? {}), dedupe: base } as Json })
        .select("id")
        .single();
      notificationId = n?.id ?? null;
    }
    const prefs = p.notification_prefs as Prefs;
    const rows = (["email", "telegram"] as const)
      .filter((ch) => channelEnabled(prefs, input.type, ch))
      .filter((ch) => ch !== "telegram" || !!p.telegram_chat_id)
      .map((channel) => ({ notification_id: notificationId, user_id: p.id, channel, dedupe_key: `${base}:${channel}`, payload: payload as Json }));
    if (!rows.length) continue;
    const { data: ins } = await db.from("notification_deliveries").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true }).select("id");
    queued.push(...(ins ?? []).map((r) => r.id));
  }

  if (queued.length) {
    try {
      after(() => dispatch(queued));
    } catch {
      // вне запроса (скрипты) — отправляем сразу
      await dispatch(queued);
    }
  }
}

/** Отправить доставки из очереди. Без ids — все queued и failed с попытками < 3 (для крона). */
export async function dispatch(ids?: string[]) {
  const db = createAdminClient();
  let q = db.from("notification_deliveries").select("id, user_id, channel, payload, attempts, status").limit(200);
  q = ids?.length ? q.in("id", ids) : q.or("status.eq.queued,and(status.eq.failed,attempts.lt.3)");
  const { data: rows } = await q;
  if (!rows?.length) return { sent: 0, failed: 0, skipped: 0 };

  const { data: users } = await db.from("profiles").select("id, email, full_name, telegram_chat_id").in("id", [...new Set(rows.map((r) => r.user_id))]);
  const byId = Object.fromEntries((users ?? []).map((u) => [u.id, u]));
  const stats = { sent: 0, failed: 0, skipped: 0 };

  // Письма — по одному с паузой (лимит Resend ~2 в секунду), Telegram — параллельно
  const emails = rows.filter((r) => r.channel === "email");
  const others = rows.filter((r) => r.channel !== "email");
  const sendOne = async (r: (typeof rows)[number]) => {
      const u = byId[r.user_id];
      const p = r.payload as { title: string; body: string; link: string; emoji?: string };
      const link = p.link.startsWith("http") ? p.link : `${SITE_URL}${p.link}`;
      let res: { ok: boolean; skipped?: boolean; error?: string };
      try {
        res =
          r.channel === "email"
            ? await sendEmail(u.email, { ...p, link, recipientName: u.full_name })
            : u.telegram_chat_id
              ? await sendTelegram(Number(u.telegram_chat_id), { ...p, link })
              : { ok: false, skipped: true, error: "telegram_not_linked" };
      } catch (e) {
        res = { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "error" };
      }
      const status = res.ok ? "sent" : res.skipped ? "skipped" : "failed";
      stats[status === "sent" ? "sent" : status === "skipped" ? "skipped" : "failed"]++;
      await db
        .from("notification_deliveries")
        .update({ status, attempts: r.attempts + 1, error: res.ok ? null : res.error ?? null, sent_at: res.ok ? new Date().toISOString() : null })
        .eq("id", r.id);
  };
  await Promise.all([
    Promise.all(others.map(sendOne)),
    (async () => {
      for (const r of emails) {
        await sendOne(r);
        await new Promise((res) => setTimeout(res, 550));
      }
    })(),
  ]);
  return stats;
}

// ---------- Получатели ----------

export async function programStudents(programId: string) {
  const db = createAdminClient();
  const { data } = await db.from("enrollments").select("user_id, profile:profiles!enrollments_user_id_fkey ( role )").eq("program_id", programId);
  return (data ?? []).filter((e) => e.profile?.role === "student").map((e) => e.user_id);
}

/** Менеджеры программы + все админы. */
export async function programStaff(programId: string) {
  const db = createAdminClient();
  const [{ data: managers }, { data: admins }] = await Promise.all([
    db.from("program_managers").select("user_id").eq("program_id", programId),
    db.from("profiles").select("id").eq("role", "admin"),
  ]);
  return [...(managers ?? []).map((m) => m.user_id), ...(admins ?? []).map((a) => a.id)];
}
