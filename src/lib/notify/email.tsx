import "server-only";
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import { render } from "@react-email/render";
import { Resend } from "resend";

type Mail = { title: string; body: string; link: string; emoji?: string; recipientName?: string | null; originalTo?: string };

/** Письмо в стиле сайта: ночное небо, бирюзовый маршрут, оранжевая кнопка. */
export function NotificationEmail({ title, body, link, emoji, recipientName, originalTo }: Mail) {
  return (
    <Html lang="ru">
      <Head />
      <Preview>{title}</Preview>
      <Body style={{ margin: 0, background: "#eef2fa", fontFamily: "Manrope, Segoe UI, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "24px 12px" }}>
          <Section style={{ borderRadius: 24, overflow: "hidden", background: "#ffffff", boxShadow: "0 12px 40px -16px rgba(20,40,120,.35)" }}>
            <Section style={{ background: "linear-gradient(135deg,#0a1440 0%,#1a2a6c 55%,#0fb5ad 130%)", backgroundColor: "#121f55", padding: "28px 28px 24px" }}>
              <Text style={{ margin: 0, color: "#9fb2ff", fontSize: 13, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>GoGlobal.kz</Text>
              <Text style={{ margin: "14px 0 0", fontSize: 40, lineHeight: "44px" }}>{emoji ?? "✈️"}</Text>
              <Heading as="h1" style={{ margin: "10px 0 0", color: "#ffffff", fontSize: 24, lineHeight: "30px", fontWeight: 700 }}>{title}</Heading>
              <Text style={{ margin: "14px 0 0", color: "#2de2d6", fontSize: 12, letterSpacing: 4 }}>• • • • • • • • • • • • ✈</Text>
            </Section>
            <Section style={{ padding: "24px 28px 28px" }}>
              {recipientName && <Text style={{ margin: "0 0 10px", color: "#0b1430", fontSize: 16 }}>{recipientName.split(/\s+/)[0]}, привет!</Text>}
              <Text style={{ margin: 0, color: "#3b4766", fontSize: 16, lineHeight: "25px", whiteSpace: "pre-line" }}>{body}</Text>
              <Button href={link} style={{ marginTop: 24, background: "#ff7a2f", color: "#ffffff", padding: "14px 26px", borderRadius: 14, fontSize: 16, fontWeight: 700, textDecoration: "none" }}>
                Открыть на сайте →
              </Button>
            </Section>
          </Section>
          <Hr style={{ borderColor: "transparent", margin: "8px 0" }} />
          <Text style={{ textAlign: "center", color: "#8a94ad", fontSize: 12, lineHeight: "18px" }}>
            Вы получили это письмо как участник GoGlobal. Уведомления можно настроить в профиле.
            {originalTo && <><br />Демо-режим: письмо для {originalTo}</>}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

let client: Resend | null = null;

export async function sendEmail(to: string, mail: Mail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false as const, skipped: true, error: "no_resend_key" };
  client ??= new Resend(key);
  // Вымышленным демо-студентам не пишем (бережём лимит Resend: 100 писем в день)
  const demoAllowed = (process.env.EMAIL_DEMO_RECIPIENTS ?? "student@demo.goglobal.kz,manager@demo.goglobal.kz,admin@demo.goglobal.kz").split(",");
  if (to.endsWith("@demo.goglobal.kz") && !demoAllowed.includes(to)) return { ok: false as const, skipped: true, error: "demo_recipient" };
  // Без своего домена Resend шлёт только на почту владельца — в демо перенаправляем всё туда
  const override = process.env.EMAIL_OVERRIDE_TO;
  const target = override || to;
  const html = await render(<NotificationEmail {...mail} originalTo={override && override !== to ? to : undefined} />);
  const { error } = await client.emails.send({
    from: process.env.EMAIL_FROM || "GoGlobal <onboarding@resend.dev>",
    to: target,
    subject: `${mail.emoji ? `${mail.emoji} ` : ""}${mail.title}`,
    html,
  });
  if (error) return { ok: false as const, skipped: false, error: `${error.name}: ${error.message}`.slice(0, 300) };
  return { ok: true as const };
}
