// Тестовые данные демо. Запуск: npm run seed  (повторный запуск пересоздаёт тестовые офферы
// с окнами относительно текущего времени — удобно перед показом).
import { createClient } from "@supabase/supabase-js";
import { deriveDisplay } from "../src/features/offers/display.ts";
import { allocate, newSeed, offerWorkTypes } from "../src/features/allocation/allocate.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SECRET_KEY!;
if (!url || !key) throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SECRET_KEY в .env.local");
const db = createClient(url, key, { auth: { persistSession: false } });

export const DEMO_PASSWORD = "GoGlobal2026!";
const H = 3_600_000;
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${JSON.stringify(error)}`);
  return data;
}

async function ensureUser(email: string) {
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  const found = data.users.find((u) => u.email === email);
  // Пароль у существующих не трогаем: его смена отзывает открытые сессии в браузерах
  if (found) return found.id;
  const created = await must(db.auth.admin.createUser({ email, password: DEMO_PASSWORD, email_confirm: true }), `user ${email}`);
  return created.user.id;
}

const programs = await must(db.from("programs").select("id, slug"), "programs");
const P = Object.fromEntries(programs.map((p) => [p.slug, p.id])) as Record<string, string>;

// ---------- Аккаунты ----------
const studentId = await ensureUser("student@demo.goglobal.kz");
const managerId = await ensureUser("manager@demo.goglobal.kz");
const adminId = await ensureUser("admin@demo.goglobal.kz");

await must(
  db.from("profiles").update({
    role: "student",
    full_name: "Айгерим Нурланова",
    birth_date: "2004-05-12",
    university: "КазНУ им. аль-Фараби",
    english_level: "B2",
    preferences: { countries: ["us", "kr"], workTypes: ["restaurant", "park", "office"], note: "Хочу к морю, работала официанткой в кафе" },
    onboarded_at: iso(now - 72 * H),
  }).eq("id", studentId),
  "student profile",
);
await must(db.from("profiles").update({ role: "manager", full_name: "Данияр Сапаров", onboarded_at: iso(now) }).eq("id", managerId), "manager profile");
await must(db.from("profiles").update({ role: "admin", full_name: "Основатель GoGlobal", onboarded_at: iso(now) }).eq("id", adminId), "admin profile");

await must(db.from("enrollments").delete().eq("user_id", studentId), "reset enrollments");
await must(
  db.from("enrollments").insert(["work-and-travel", "internship", "camp-counselor"].map((s) => ({ user_id: studentId, program_id: P[s] }))),
  "enrollments",
);
await must(db.from("program_managers").delete().eq("user_id", managerId), "reset managers");
await must(
  db.from("program_managers").insert(["work-and-travel", "camp-counselor"].map((s) => ({ user_id: managerId, program_id: P[s] }))),
  "program managers",
);

// ---------- Офферы ----------
type SeedOffer = {
  slug: string;
  fields: Record<string, string | number | boolean | null>;
  seats: number;
  min_english: string | null;
  opensIn?: number; // часов от текущего момента (отрицательное — уже открыт)
  hours?: number;
  status?: "open" | "closed";
  interview_at?: string | null;
  interview_note?: string;
  is_test?: boolean;
};

const nextWeek = new Date(now + 7 * 24 * H);
nextWeek.setUTCHours(10, 0, 0, 0); // 16:00 по Алматы

const OFFERS: SeedOffer[] = [
  {
    // Реальный пример из ТЗ
    slug: "work-and-travel",
    is_test: false,
    fields: {
      code: "A2", employer: "Landry's Rainforest Cafe", city: "Galveston", state: "TX",
      position: "Restaurant Attendant (Front of House): Server / Host / Hostess",
      start_dates: "15 мая / 30 мая", hourly_rate: 2.13, tips: true, rate_potential: 15,
      rate_note: "$2.13/час + чаевые, потенциально до $15/час", hours_min: 30, hours_max: 35, housing_cost: 350,
      housing_note: "Жильё помогает найти работодатель, ~$350 в месяц",
    },
    seats: 3, min_english: "B2", opensIn: -1, hours: 24, interview_note: "Интервью с работодателем — на следующей неделе",
  },
  {
    slug: "work-and-travel",
    fields: { code: "B7", employer: "Ocean Breeze Waterpark", city: "Virginia Beach", state: "VA", position: "Ride Operator / Lifeguard",
      start_dates: "1 июня", hourly_rate: 15, tips: false, hours_min: 35, hours_max: 40, housing_cost: 480 },
    seats: 6, min_english: "B1", opensIn: -3, hours: 48, interview_at: iso(nextWeek.getTime() + 24 * H),
  },
  {
    slug: "work-and-travel",
    fields: { code: "C3", employer: "Harbor View Hotel", city: "Bar Harbor", state: "ME", position: "Housekeeping Attendant",
      start_dates: "20 мая / 5 июня", hourly_rate: 16.5, tips: false, hours_min: 38, hours_max: 40, housing_cost: 400,
      housing_note: "Общежитие для сотрудников в 10 минутах пешком" },
    seats: 4, min_english: "B1", opensIn: -10, hours: 24,
  },
  {
    slug: "work-and-travel",
    fields: { code: "D1", employer: "Sunset Grill", city: "Ocean City", state: "MD", position: "Line Cook / Kitchen Helper",
      start_dates: "25 мая", hourly_rate: 15.75, tips: true, rate_potential: 18, hours_min: 32, hours_max: 40, housing_cost: 420 },
    seats: 2, min_english: "A2", opensIn: -22, hours: 24, // закроется через ~2 часа
  },
  {
    slug: "au-pair",
    fields: { country: "de", city: "Мюнхен", family: "Семья Шмидт", kids_count: 2, kids_ages: "3 и 6 лет", pocket_money: 280,
      duration: "12 месяцев", driving_license: true, childcare_experience: "Желателен опыт с дошкольниками" },
    seats: 1, min_english: "B1", opensIn: -2, hours: 72,
  },
  {
    slug: "au-pair",
    fields: { country: "nl", city: "Амстердам", family: "Семья ван Дейк", kids_count: 1, kids_ages: "2 года", pocket_money: 340,
      duration: "12 месяцев", driving_license: false, childcare_experience: "Любой опыт с малышами" },
    seats: 1, min_english: "B1", opensIn: -5, hours: 48,
  },
  {
    slug: "internship",
    fields: { company: "Azure Bay Resort", country: "ae", city: "Дубай", field: "Гостиничный бизнес", specialty: "Front Office Trainee",
      paid: true, stipend: 1200, duration: "12 месяцев" },
    seats: 3, min_english: "B2", opensIn: -6, hours: 72,
  },
  {
    slug: "internship",
    fields: { company: "Hanbit Labs", country: "kr", city: "Сеул", field: "IT", specialty: "Junior QA / Frontend Intern",
      paid: true, stipend: 1500, duration: "6 месяцев" },
    seats: 2, min_english: "C1", opensIn: 5, hours: 48, // откроется через 5 часов; требует C1
  },
  {
    // Уже распределён: у Айгерим есть место (показывает конфетти и прозрачность жребия)
    slug: "internship",
    fields: { company: "Namsan Grand Hotel", country: "kr", city: "Сеул", field: "Гостиничный бизнес", specialty: "Guest Relations Trainee",
      paid: true, stipend: 1100, duration: "9 месяцев" },
    seats: 3, min_english: "B2", opensIn: -80, hours: 24, status: "closed",
  },
  {
    slug: "camp-counselor",
    fields: { camp: "Camp Pine Lake", state: "ME", role: "Вожатый", dates: "10 июня — 15 августа", salary: 2200 },
    seats: 5, min_english: "B1", opensIn: -4, hours: 48,
  },
  {
    slug: "camp-counselor",
    fields: { camp: "Camp Silver Lake", state: "NY", role: "Кухня", dates: "15 июня — 20 августа", salary: 2600 },
    seats: 2, min_english: "A2", opensIn: -50, hours: 24, status: "closed",
  },
];

// Пересоздаём офферы демо (тестовые + A2); заявки и запуски удалятся каскадом
const old = await must(db.from("offers").select("id").or("is_test.eq.true,code.eq.A2"), "old offers");
if (old.length) await must(db.from("offers").delete().in("id", old.map((o) => o.id)), "delete old offers");

const offerIds: Record<string, string> = {};
for (const o of OFFERS) {
  const opens = now + (o.opensIn ?? -1) * H;
  const closes = opens + (o.hours ?? 24) * H;
  const d = deriveDisplay(o.slug, o.fields);
  const inserted = await must(
    db.from("offers").insert({
      program_id: P[o.slug],
      code: typeof o.fields.code === "string" ? o.fields.code : null,
      ...d,
      fields: o.fields,
      seats_total: o.seats,
      min_english: o.min_english as "B1",
      min_age: 18,
      max_age: 30,
      interview_at: o.interview_at ?? null,
      interview_note: o.interview_note ?? "",
      window_opens_at: iso(opens),
      window_closes_at: iso(closes),
      window_hours: o.hours ?? 24,
      allocation_mode: "lottery",
      status: o.status ?? "open",
      is_test: o.is_test ?? true,
      published_at: iso(Math.min(opens, now)),
      created_by: o.slug === "work-and-travel" || o.slug === "camp-counselor" ? managerId : adminId,
    }).select("id").single(),
    `offer ${d.title}`,
  );
  offerIds[(o.fields.code as string) ?? (o.fields.company as string) ?? (o.fields.camp as string)] = inserted.id;
}

// ---------- Другие студенты и их заявки ----------
const OTHERS = [
  { key: "alikhan", name: "Алихан Жумабеков", birth: "2003-03-10", en: "B2", prefs: { countries: ["us"], workTypes: ["restaurant", "hotel"] }, programs: ["work-and-travel", "internship"] },
  { key: "dana", name: "Дана Ермекова", birth: "2005-07-22", en: "B1", prefs: { countries: ["us"], workTypes: ["park"] }, programs: ["work-and-travel", "camp-counselor"] },
  { key: "timur", name: "Тимур Касымов", birth: "2002-11-02", en: "C1", prefs: { countries: ["us", "de"], workTypes: ["office"] }, programs: ["work-and-travel", "internship"] },
  { key: "madina", name: "Мадина Ахметова", birth: "2004-01-15", en: "B2", prefs: { countries: ["us"], workTypes: ["restaurant", "kitchen"] }, programs: ["work-and-travel", "camp-counselor"] },
  { key: "arman", name: "Арман Серікбаев", birth: "2001-09-30", en: "A2", prefs: { countries: ["us"], workTypes: ["kitchen"] }, programs: ["work-and-travel", "camp-counselor"] },
  { key: "zhanel", name: "Жанель Омарова", birth: "2003-06-05", en: "B2", prefs: { countries: ["any"], workTypes: ["hotel"] }, programs: ["work-and-travel", "internship"] },
  { key: "erlan", name: "Ерлан Бекенов", birth: "2004-12-12", en: "B2", prefs: { countries: ["us"], workTypes: ["park", "sport"] }, programs: ["work-and-travel", "camp-counselor"] },
  { key: "kamila", name: "Камила Исаева", birth: "2002-04-18", en: "C1", prefs: { countries: ["uk", "ae"], workTypes: ["office"] }, programs: ["internship", "work-and-travel"] },
];
const U: Record<string, string> = { aigerim: studentId };
for (const st of OTHERS) {
  const id = await ensureUser(`${st.key}@demo.goglobal.kz`);
  U[st.key] = id;
  await must(db.from("profiles").update({
    role: "student", full_name: st.name, birth_date: st.birth, university: "Демо-вуз", english_level: st.en as "B2",
    preferences: st.prefs, onboarded_at: iso(now - 100 * H),
  }).eq("id", id), `profile ${st.key}`);
  await must(db.from("enrollments").delete().eq("user_id", id), "reset");
  await must(db.from("enrollments").insert(st.programs.map((s) => ({ user_id: id, program_id: P[s] }))), `enroll ${st.key}`);
}

async function applyMany(offerKey: string, users: string[]) {
  const offerId = offerIds[offerKey];
  const { data: offer } = await db.from("offers").select("program_id").eq("id", offerId).single();
  await must(db.from("applications").insert(users.map((u, i) => ({
    offer_id: offerId, user_id: U[u], program_id: offer!.program_id, created_at: iso(now - (i + 1) * 0.7 * H),
  }))), `apply ${offerKey}`);
}
// A2: 5 заявок на 3 места — Айгерим может подать сама на демо
await applyMany("A2", ["alikhan", "timur", "madina", "zhanel", "erlan"]);
// Camp Silver Lake: окно закрыто, ждёт распределения у менеджера
await applyMany("Camp Silver Lake", ["dana", "madina", "arman", "erlan"]);
// Namsan Grand Hotel: распределено и подтверждено
await applyMany("Namsan Grand Hotel", ["aigerim", "timur", "zhanel", "alikhan", "kamila"]);

{
  const offerId = offerIds["Namsan Grand Hotel"];
  const { data: o } = await db.from("offers").select("*").eq("id", offerId).single();
  const { data: apps } = await db.from("applications").select("id, user_id").eq("offer_id", offerId);
  const { data: profs } = await db.from("profiles").select("id, english_level, birth_date, preferences").in("id", apps!.map((a) => a.user_id));
  const pById = Object.fromEntries(profs!.map((p) => [p.id, p]));
  const seed = newSeed();
  const ranked = await allocate(
    { seats: o!.seats_total, minEnglish: o!.min_english, minAge: o!.min_age, maxAge: o!.max_age, country: o!.country,
      workTypes: offerWorkTypes("internship", o!.fields as Record<string, unknown>), at: new Date(o!.window_closes_at!) },
    apps!.map((a) => ({ applicationId: a.id, userId: a.user_id, englishLevel: pById[a.user_id].english_level, birthDate: pById[a.user_id].birth_date,
      preferences: pById[a.user_id].preferences as never, enrolled: true, hasPlaceElsewhere: false })),
    seed,
  );
  await must(db.from("allocation_runs").insert({ offer_id: offerId, seed, params: { mode: "lottery" }, result: ranked as never,
    run_by: null, confirmed_by: adminId, confirmed_at: iso(now - 50 * H) }), "run");
  for (const r of ranked) {
    await must(db.from("applications").update({ status: r.outcome, lottery_rank: r.rank, ticket: r.ticket, match_score: r.match,
      decided_by: adminId, decided_at: iso(now - 50 * H) }).eq("id", r.application_id), "decide");
    if (r.outcome === "selected") {
      await db.from("enrollments").update({ current_stage: "interview" }).eq("user_id", r.user_id).eq("program_id", P.internship);
    }
  }
  await must(db.from("offers").update({ status: "allocated" }).eq("id", offerId), "allocated");
  const me = ranked.find((r) => r.user_id === studentId);
  console.log(`✓ Namsan Grand Hotel распределён, Айгерим: #${me?.rank} ${me?.outcome}`);
}

// ---------- Этап 6: путь, события, документы, оплаты, сообщения ----------
{
  const all = Object.values(U);
  // чистим прошлые данные демо-студентов
  for (const uid of all) {
    const { data: files } = await db.storage.from("documents").list(uid, { limit: 100 });
    for (const f of files ?? []) {
      const { data: inner } = await db.storage.from("documents").list(`${uid}/${f.name}`, { limit: 100 });
      if (inner?.length) await db.storage.from("documents").remove(inner.map((x) => `${uid}/${f.name}/${x.name}`));
    }
  }
  await must(db.from("events").delete().in("user_id", all), "reset events");
  await must(db.from("documents").delete().in("user_id", all), "reset documents");
  await must(db.from("payments").delete().in("user_id", all), "reset payments");
  await must(db.from("threads").delete().in("student_id", all), "reset threads");

  // Айгерим: в Internship (Namsan) интервью пройдено, оффер есть — собирает документы
  await must(db.from("enrollments").update({ current_stage: "offer" }).eq("user_id", studentId).eq("program_id", P.internship), "stage offer");
  await must(db.from("enrollments").update({ current_stage: "documents" }).eq("user_id", studentId).eq("program_id", P.internship), "stage docs");

  const at = (days: number, hourAlmaty: number) => {
    const d = new Date(now + days * 24 * H);
    d.setUTCHours(hourAlmaty - 5, 0, 0, 0);
    return d.toISOString();
  };
  await must(db.from("events").insert([
    { user_id: studentId, program_id: P.internship, type: "interview", title: "Интервью с Namsan Grand Hotel", starts_at: at(-6, 11),
      address: "Zoom — ссылка в письме", notes: "Пройдено ✓", created_by: adminId },
    { user_id: studentId, program_id: P.internship, type: "deadline", title: "Загрузить пакет документов", starts_at: at(3, 23),
      address: "", notes: "Справка с места учёбы — с печатью", created_by: adminId },
    { user_id: studentId, program_id: P.internship, type: "embassy", title: "Собеседование в консульстве Республики Корея", starts_at: at(10, 10),
      address: "Алматы, консульский отдел (точный адрес — в письме менеджера)", notes: "Взять паспорт, фото 3,5×4,5, распечатку Training Plan", created_by: adminId },
    { user_id: studentId, program_id: P.internship, type: "flight", title: "Вылет Алматы → Сеул", starts_at: at(34, 9),
      address: "Аэропорт Алматы", notes: "", created_by: adminId },
  ]), "events");

  // Документы: кладём маленькие PDF в Storage
  const pdf = (title: string) => new TextEncoder().encode(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj 4 0 obj<</Length 60>>stream\nBT /F1 14 Tf 20 60 Td (${title}) Tj ET\nendstream endobj 5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF`);
  const { data: types } = await db.from("document_types").select("id, name").eq("program_id", P.internship);
  const T = Object.fromEntries(types!.map((t) => [t.name, t.id]));
  const docs = [
    { name: "Загранпаспорт", file: "passport.pdf", status: "accepted", comment: "" },
    { name: "Резюме (CV)", file: "CV_Nurlanova.pdf", status: "accepted", comment: "" },
    { name: "Справка с места учёбы", file: "spravka.pdf", status: "rework", comment: "Нужна справка с печатью университета и датой не старше месяца" },
    { name: "Мотивационное письмо", file: "motivation_letter.pdf", status: "pending", comment: "" },
  ];
  for (const d of docs) {
    const path = `${studentId}/${T[d.name]}/${now}-${d.file}`;
    await must(db.storage.from("documents").upload(path, pdf(d.file), { contentType: "application/pdf" }), `upload ${d.file}`);
    await must(db.from("documents").insert({ user_id: studentId, document_type_id: T[d.name], program_id: P.internship, file_path: path,
      file_name: d.file, mime: "application/pdf", size_bytes: 600, status: d.status as "pending", reviewer_comment: d.comment,
      reviewed_by: d.status === "pending" ? null : adminId, reviewed_at: d.status === "pending" ? null : iso(now - 20 * H) }), `doc ${d.name}`);
  }
  // Ещё документ на проверку от другого студента — чтобы очередь менеджера W&T не была пустой
  const { data: wtTypes } = await db.from("document_types").select("id, name").eq("program_id", P["work-and-travel"]);
  const passportWT = wtTypes!.find((t) => t.name === "Загранпаспорт")!.id;
  {
    const path = `${U.madina}/${passportWT}/${now}-passport.pdf`;
    await must(db.storage.from("documents").upload(path, pdf("passport"), { contentType: "application/pdf" }), "upload madina");
    await must(db.from("documents").insert({ user_id: U.madina, document_type_id: passportWT, program_id: P["work-and-travel"], file_path: path,
      file_name: "passport_Akhmetova.pdf", mime: "application/pdf", size_bytes: 600 }), "doc madina");
  }

  const dateIn = (days: number) => new Date(now + days * 24 * H).toISOString().slice(0, 10);
  await must(db.from("payments").insert([
    { user_id: studentId, program_id: P.internship, title: "Сбор за программу", amount: 450000, currency: "KZT", due_date: dateIn(-20), paid_at: iso(now - 22 * 24 * H), created_by: adminId },
    { user_id: studentId, program_id: P.internship, title: "Медицинская страховка", amount: 45, currency: "USD", due_date: dateIn(5), created_by: adminId },
    { user_id: studentId, program_id: P.internship, title: "Консульский сбор", amount: 160, currency: "USD", due_date: dateIn(9), created_by: adminId },
    { user_id: studentId, program_id: P["work-and-travel"], title: "Регистрационный взнос", amount: 50000, currency: "KZT", due_date: dateIn(-2), created_by: managerId },
  ]), "payments");

  const thread = async (student: string, program: string, msgs: [string, string, number][]) => {
    const th = await must(db.from("threads").insert({ student_id: student, program_id: program }).select("id").single(), "thread");
    await must(db.from("messages").insert(msgs.map(([sender, body, hoursAgo]) => ({
      thread_id: th.id, sender_id: sender, body, created_at: iso(now - hoursAgo * H), read_at: hoursAgo > 1 ? iso(now - (hoursAgo - 0.5) * H) : null,
    }))), "messages");
  };
  await thread(studentId, P.internship, [
    [adminId, "Айгерим, поздравляю с местом в Namsan Grand Hotel! 🎉 Интервью прошло отлично, работодатель подтвердил оффер.", 30],
    [studentId, "Спасибо огромное! Что дальше по документам?", 29],
    [adminId, "Загрузите, пожалуйста, справку с места учёбы заново — нужна печать университета. Остальное приняла.", 20],
    [studentId, "Хорошо, завтра возьму в деканате 🙏", 19],
  ]);
  await thread(studentId, P["work-and-travel"], [
    [studentId, "Здравствуйте! Подскажите, когда будет интервью по офферу A2?", 3],
    [managerId, "Добрый день! Работодатель обещал на следующей неделе, точную дату пришлём в календарь.", 2],
  ]);
  console.log("✓ Путь, события, документы, оплаты и сообщения");
}

console.log(`✓ Аккаунты (пароль ${DEMO_PASSWORD}):
  студент   student@demo.goglobal.kz
  менеджер  manager@demo.goglobal.kz  (Work and Travel, Camp Counselor)
  админ     admin@demo.goglobal.kz
✓ Офферов: ${OFFERS.length}`);
