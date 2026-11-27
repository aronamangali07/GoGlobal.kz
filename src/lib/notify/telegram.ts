import "server-only";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Сообщение в Telegram с кнопкой «Открыть на сайте». */
export async function sendTelegram(chatId: number, msg: { title: string; body: string; link: string; emoji?: string }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false as const, skipped: true, error: "no_bot_token" };
  const isHttps = msg.link.startsWith("https://");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      parse_mode: "HTML",
      text: `${msg.emoji ? `${msg.emoji} ` : ""}<b>${esc(msg.title)}</b>\n\n${esc(msg.body)}`,
      link_preview_options: { is_disabled: true },
      // Telegram принимает только https-ссылки в кнопках
      ...(isHttps ? { reply_markup: { inline_keyboard: [[{ text: "Открыть на сайте →", url: msg.link }]] } } : {}),
    }),
  });
  if (!res.ok) return { ok: false as const, skipped: false, error: `telegram ${res.status}: ${(await res.text()).slice(0, 200)}` };
  return { ok: true as const };
}
