"use server";

import { createHash, randomBytes } from "node:crypto";
import { requireSession } from "@/lib/data/session";
import { createAdminClient } from "@/lib/supabase/admin";

const hashToken = async (t: string) => createHash("sha256").update(t).digest("hex");

/** Одноразовая ссылка t.me/<bot>?start=<token> (живёт 15 минут, в базе — только хэш). */
export async function createTelegramLink() {
  const { user } = await requireSession();
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  if (!bot || !process.env.TELEGRAM_BOT_TOKEN) return { ok: false as const, error: "notConfigured" };
  const token = randomBytes(18).toString("base64url");
  const db = createAdminClient();
  await db.from("telegram_link_tokens").delete().eq("user_id", user.id).is("used_at", null);
  await db.from("telegram_link_tokens").insert({ token_hash: await hashToken(token), user_id: user.id, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() });
  return { ok: true as const, url: `https://t.me/${bot.replace(/^@/, "")}?start=${token}` };
}

export async function telegramStatus() {
  const { supabase, user } = await requireSession();
  const { data } = await supabase.from("profiles").select("telegram_chat_id, telegram_username").eq("id", user.id).single();
  return { connected: !!data?.telegram_chat_id, username: data?.telegram_username ?? null };
}

export async function disconnectTelegram() {
  const { user } = await requireSession();
  // telegram_chat_id меняет только сервер (защита в триггере профиля)
  await createAdminClient().from("profiles").update({ telegram_chat_id: null, telegram_username: null }).eq("id", user.id);
  return { ok: true };
}
