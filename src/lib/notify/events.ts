import "server-only";
import { formatDate } from "@/features/offers/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify, programStaff, programStudents } from "./index";

const label = (o: { code: string | null; title: string }) => [o.code, o.title].filter(Boolean).join(" · ");

export async function onOfferPublished(offerId: string) {
  const db = createAdminClient();
  const { data: o } = await db.from("offers").select("id, code, title, subtitle, city, seats_total, window_closes_at, program_id, program:programs ( name )").eq("id", offerId).single();
  if (!o) return;
  await notify({
    userIds: await programStudents(o.program_id),
    type: "offer.new",
    title: `Новый оффер: ${label(o)}`,
    body: `${o.program?.name}${o.subtitle ? ` · ${o.subtitle}` : ""}${o.city ? `, ${o.city}` : ""}\nМест: ${o.seats_total}. Окно подачи открыто до ${formatDate(o.window_closes_at)}.\nВремя нажатия «Хочу» не влияет на шанс — места распределяются честно.`,
    link: `/offers/${o.id}`,
    dedupeKey: `offer.new:${o.id}`,
    data: { offerId: o.id },
  });
}

export async function onApplicationCreated(applicationId: string) {
  const db = createAdminClient();
  const { data: a } = await db.from("applications").select("id, offer:offers ( id, code, title, program_id ), student:profiles!applications_user_id_fkey ( full_name )").eq("id", applicationId).single();
  if (!a?.offer) return;
  await notify({
    userIds: await programStaff(a.offer.program_id),
    type: "application.new",
    title: `Новая заявка: ${label(a.offer)}`,
    body: `${a.student?.full_name ?? "Студент"} нажал(а) «Хочу».`,
    link: `/manage/offers/${a.offer.id}/applications`,
    dedupeKey: `application.new:${a.id}`,
  });
}

const RESULT = {
  selected: { type: "application.selected", title: "Место ваше! 🎉", body: "Поздравляем — вы получили место. Менеджер свяжется с вами насчёт интервью с работодателем." },
  approved: { type: "application.approved", title: "Место подтверждено", body: "Менеджер подтвердил ваше участие. Следите за этапами в «Моём пути»." },
  waitlisted: { type: "application.waitlisted", title: "Вы в листе ожидания", body: "Если кто-то откажется, место перейдёт следующему по очереди. Можно подать заявку на другой оффер этой программы." },
  rejected: { type: "application.rejected", title: "Заявка отклонена", body: "Не расстраивайтесь — можно выбрать другой оффер этой программы." },
  ineligible: { type: "application.ineligible", title: "Заявка не прошла по требованиям", body: "На момент закрытия окна профиль не соответствовал требованиям оффера." },
} as const;

/** Результаты по офферу: каждому студенту — его статус (после подтверждения или решения менеджера). */
export async function onApplicationResults(offerId: string, onlyApplicationId?: string) {
  const db = createAdminClient();
  let q = db.from("applications").select("id, user_id, status, lottery_rank, offer:offers ( id, code, title )").eq("offer_id", offerId);
  if (onlyApplicationId) q = q.eq("id", onlyApplicationId);
  const { data: apps } = await q;
  for (const a of apps ?? []) {
    const r = RESULT[a.status as keyof typeof RESULT];
    if (!r || !a.offer) continue;
    await notify({
      userIds: [a.user_id],
      type: r.type,
      title: `${r.title} — ${label(a.offer)}`,
      body: a.status === "waitlisted" && a.lottery_rank ? `${r.body}\nВаш номер в очереди: ${a.lottery_rank}.` : r.body,
      link: `/offers/${a.offer.id}`,
      dedupeKey: `result:${a.id}:${a.status}`,
    });
  }
}

export async function onWindowClosed(offerId: string) {
  const db = createAdminClient();
  const { data: o } = await db.from("offers").select("id, code, title, program_id").eq("id", offerId).single();
  if (!o) return;
  const { count } = await db.from("applications").select("*", { count: "exact", head: true }).eq("offer_id", offerId).eq("status", "pending");
  await notify({
    userIds: await programStaff(o.program_id),
    type: "offer.window_closed",
    title: `Окно закрылось: ${label(o)}`,
    body: `Заявок: ${count ?? 0}. Черновик распределения готов — проверьте и подтвердите.`,
    link: `/manage/offers/${o.id}/applications`,
    dedupeKey: `window.closed:${o.id}`,
  });
}

const EVENT_TITLE = { interview: "Назначено интервью", embassy: "Запись в посольство", deadline: "Новый дедлайн", flight: "Дата вылета", other: "Новое событие" } as const;

export async function onEventScheduled(eventId: string) {
  const db = createAdminClient();
  const { data: e } = await db.from("events").select("id, user_id, type, title, starts_at, address, notes").eq("id", eventId).single();
  if (!e) return;
  await notify({
    userIds: [e.user_id],
    type: "event.scheduled",
    title: `${EVENT_TITLE[e.type]}: ${e.title}`,
    body: [`🗓 ${formatDate(e.starts_at)}`, e.address && `📍 ${e.address}`, e.notes].filter(Boolean).join("\n"),
    link: "/calendar",
    dedupeKey: `event.scheduled:${e.id}:${e.starts_at}`,
  });
}

export async function onDocumentUploaded(documentId: string) {
  const db = createAdminClient();
  const { data: d } = await db.from("documents").select("id, program_id, file_path, user_id, type:document_types ( name ), student:profiles!documents_user_id_fkey ( full_name )").eq("id", documentId).single();
  if (!d) return;
  await notify({
    userIds: await programStaff(d.program_id),
    type: "document.uploaded",
    title: `Документ на проверку: ${d.type?.name}`,
    body: `${d.student?.full_name ?? "Студент"} загрузил(а) документ.`,
    link: `/manage/students/${d.user_id}`,
    dedupeKey: `document.uploaded:${d.id}:${d.file_path}`,
  });
}

export async function onDocumentReviewed(documentId: string) {
  const db = createAdminClient();
  const { data: d } = await db.from("documents").select("id, user_id, status, reviewer_comment, updated_at, type:document_types ( name )").eq("id", documentId).single();
  if (!d || d.status === "pending") return;
  const ok = d.status === "accepted";
  await notify({
    userIds: [d.user_id],
    type: ok ? "document.accepted" : "document.rework",
    title: ok ? `Документ принят: ${d.type?.name}` : `Нужно переделать: ${d.type?.name}`,
    body: ok ? "Менеджер проверил и принял документ." : `Комментарий менеджера: ${d.reviewer_comment}`,
    link: "/documents",
    dedupeKey: `document.reviewed:${d.id}:${d.status}:${d.updated_at}`,
  });
}

export async function onMessage(messageId: string) {
  const db = createAdminClient();
  const { data: m } = await db.from("messages").select("id, body, sender_id, thread:threads ( id, student_id, program_id, program:programs ( name ) ), sender:profiles!messages_sender_id_fkey ( full_name, role )").eq("id", messageId).single();
  if (!m?.thread) return;
  const fromStudent = m.sender?.role === "student";
  const recipients = fromStudent ? await programStaff(m.thread.program_id) : [m.thread.student_id];
  await notify({
    userIds: recipients.filter((id) => id !== m.sender_id),
    type: "message.new",
    title: fromStudent ? `Сообщение от ${m.sender?.full_name}` : `Сообщение от менеджера · ${m.thread.program?.name}`,
    body: m.body.length > 300 ? `${m.body.slice(0, 300)}…` : m.body,
    link: fromStudent ? `/messages?t=${m.thread.id}` : `/messages?p=${m.thread.program_id}`,
    dedupeKey: `message:${m.id}`,
  });
}

export async function onAnnouncement(announcementId: string) {
  const db = createAdminClient();
  const { data: a } = await db.from("announcements").select("id, title, body, program_id").eq("id", announcementId).single();
  if (!a) return;
  const userIds = a.program_id
    ? await programStudents(a.program_id)
    : ((await db.from("profiles").select("id").eq("role", "student")).data ?? []).map((p) => p.id);
  await notify({ userIds, type: "announcement", title: a.title, body: a.body, link: "/dashboard", dedupeKey: `announcement:${a.id}` });
}

/** Крон: напоминания за 24 ч и за 1 ч до событий, дедлайны оплат. dedupe гарантирует одну отправку. */
export async function sendReminders(now = Date.now()) {
  const db = createAdminClient();
  const in24 = new Date(now + 24 * 3600_000).toISOString();
  const { data: events } = await db.from("events").select("id, user_id, type, title, starts_at, address").gt("starts_at", new Date(now).toISOString()).lte("starts_at", in24);
  let count = 0;
  for (const e of events ?? []) {
    const left = Date.parse(e.starts_at) - now;
    const kind = left <= 3600_000 ? "reminder1" : "reminder24";
    await notify({
      userIds: [e.user_id],
      type: kind === "reminder1" ? "event.reminder1" : "event.reminder24",
      title: `${kind === "reminder1" ? "Через час" : "Завтра"}: ${e.title}`,
      body: [`🗓 ${formatDate(e.starts_at)}`, e.address && `📍 ${e.address}`].filter(Boolean).join("\n"),
      link: "/calendar",
      dedupeKey: `${kind}:${e.id}:${e.starts_at}`,
    });
    count++;
  }
  const soon = new Date(now + 3 * 24 * 3600_000).toISOString().slice(0, 10);
  const { data: payments } = await db.from("payments").select("id, user_id, title, amount, currency, due_date").is("paid_at", null).not("due_date", "is", null).lte("due_date", soon);
  for (const p of payments ?? []) {
    await notify({
      userIds: [p.user_id],
      type: "payment.due",
      title: `Скоро срок оплаты: ${p.title}`,
      body: `${Number(p.amount).toLocaleString("ru-RU")} ${p.currency} — до ${formatDate(`${p.due_date}T12:00:00+05:00`, false)}.`,
      link: "/payments",
      dedupeKey: `payment.due:${p.id}:${p.due_date}`,
    });
    count++;
  }
  return count;
}
