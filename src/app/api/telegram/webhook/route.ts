import { createHash } from "node:crypto";
import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { SITE_URL } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 30;

let handler: ((req: Request) => Promise<Response>) | null = null;

function getHandler() {
  if (handler) return handler;
  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!, {
    botInfo: process.env.TELEGRAM_BOT_INFO ? JSON.parse(process.env.TELEGRAM_BOT_INFO) : undefined,
  });
  const site = new InlineKeyboard().url("Открыть GoGlobal →", SITE_URL.startsWith("https") ? SITE_URL : "https://goglobal-kz.vercel.app");

  // /start <одноразовый токен> — привязка чата к аккаунту
  bot.command("start", async (ctx) => {
    const token = ctx.match?.trim();
    if (!token) {
      await ctx.reply("Привет! Я бот GoGlobal ✈️\nЧтобы получать уведомления, нажмите «Подключить Telegram» в профиле на сайте.", { reply_markup: site });
      return;
    }
    const db = createAdminClient();
    const hash = createHash("sha256").update(token).digest("hex");
    const { data: row } = await db.from("telegram_link_tokens").select("user_id, expires_at, used_at").eq("token_hash", hash).maybeSingle();
    if (!row || row.used_at || Date.parse(row.expires_at) < Date.now()) {
      await ctx.reply("Ссылка устарела или уже использована. Нажмите «Подключить Telegram» на сайте ещё раз.", { reply_markup: site });
      return;
    }
    // Один чат — один аккаунт: отвязываем этот чат от прежнего владельца
    await db.from("profiles").update({ telegram_chat_id: null, telegram_username: null }).eq("telegram_chat_id", ctx.chat.id);
    await db.from("profiles").update({ telegram_chat_id: ctx.chat.id, telegram_username: ctx.from?.username ?? null }).eq("id", row.user_id);
    await db.from("telegram_link_tokens").update({ used_at: new Date().toISOString() }).eq("token_hash", hash);
    const { data: p } = await db.from("profiles").select("full_name").eq("id", row.user_id).single();
    await ctx.reply(
      `Готово, ${p?.full_name?.split(/\s+/)[0] ?? "друг"}! 🎉\nТеперь новые офферы, интервью, посольство и дедлайны будут приходить сюда — даже ночью ничего не пропустите.\n\nОтключить: /stop`,
      { reply_markup: site },
    );
  });

  bot.command("stop", async (ctx) => {
    await createAdminClient().from("profiles").update({ telegram_chat_id: null, telegram_username: null }).eq("telegram_chat_id", ctx.chat.id);
    await ctx.reply("Уведомления в Telegram отключены. Включить снова можно в профиле на сайте.", { reply_markup: site });
  });

  bot.on("message", (ctx) => ctx.reply("Я присылаю уведомления GoGlobal. Ответить менеджеру можно в разделе «Сообщения» на сайте.", { reply_markup: site }));

  handler = webhookCallback(bot, "std/http", { secretToken: process.env.TELEGRAM_WEBHOOK_SECRET });
  return handler;
}

export async function POST(request: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return new Response("bot not configured", { status: 503 });
  return getHandler()(request);
}
