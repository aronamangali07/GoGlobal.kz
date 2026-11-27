/**
 * Честное распределение мест по офферу.
 *
 * Порядок (лексикографически):
 *   1. соответствие требованиям (английский, возраст, участие в программе) — жёсткий фильтр;
 *   2. совпадение с пожеланиями студента (страна + тип работы), 0…1;
 *   3. приоритет тем, у кого ещё нет места в других офферах;
 *   4. жребий: билет = SHA-256("<зерно>:<id студента>"), меньше — выше.
 * Время подачи заявки внутри окна НЕ участвует.
 *
 * Модуль без зависимостей: работает и на сервере, и в браузере (для самопроверки жребия).
 */

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export type Candidate = {
  applicationId: string;
  userId: string;
  englishLevel: string | null;
  birthDate: string | null;
  preferences: { countries?: string[]; workTypes?: string[] } | null;
  enrolled: boolean;
  hasPlaceElsewhere: boolean;
};

export type OfferForAllocation = {
  seats: number;
  minEnglish: string | null;
  minAge: number | null;
  maxAge: number | null;
  country: string;
  workTypes: string[];
  /** Момент, на который считается возраст (закрытие окна). */
  at: Date;
};

export type Reason = "program" | "english" | "age";

export type Ranked = {
  application_id: string;
  user_id: string;
  rank: number;
  eligible: boolean;
  failed: Reason[];
  match: number;
  country_match: boolean;
  work_match: boolean;
  has_place: boolean;
  ticket: string;
  outcome: "selected" | "waitlisted" | "ineligible";
};

export async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const ticketFor = (seed: string, userId: string) => sha256Hex(`${seed}:${userId}`);

export function newSeed() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function ageAt(birthDate: string | null, at: Date) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  let age = at.getUTCFullYear() - b.getUTCFullYear();
  const m = at.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && at.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

/** Типы работы оффера по ключевым словам — для совпадения с пожеланиями. */
export function offerWorkTypes(slug: string, fields: Record<string, unknown>) {
  const text = Object.values(fields).filter((v) => typeof v === "string").join(" ").toLowerCase();
  const types = new Set<string>();
  const rules: [string, RegExp][] = [
    ["restaurant", /server|host|restaurant|cafe|café|grill|bar|ресторан|кафе|официант/],
    ["kitchen", /cook|kitchen|кухн|повар/],
    ["hotel", /hotel|housekeep|front office|resort|отел/],
    ["park", /park|ride|lifeguard|amusement|парк/],
    ["retail", /retail|store|shop|cashier|магазин/],
    ["kids", /child|kids|детьми|дет/],
    ["office", /intern|it\b|qa|frontend|developer|office|офис|маркетинг|финанс/],
    ["sport", /sport|спорт|lifeguard|водные/],
    ["camp", /camp|лагер|вожат/],
  ];
  for (const [type, re] of rules) if (re.test(text)) types.add(type);
  if (slug === "au-pair") types.add("kids");
  if (slug === "camp-counselor") types.add("camp");
  return [...types];
}

export function checkCandidate(c: Candidate, o: OfferForAllocation): Reason[] {
  const failed: Reason[] = [];
  if (!c.enrolled) failed.push("program");
  if (o.minEnglish && (!c.englishLevel || LEVELS.indexOf(c.englishLevel) < LEVELS.indexOf(o.minEnglish))) failed.push("english");
  const age = ageAt(c.birthDate, o.at);
  if ((o.minAge !== null || o.maxAge !== null) && (age === null || (o.minAge !== null && age < o.minAge) || (o.maxAge !== null && age > o.maxAge))) {
    failed.push("age");
  }
  return failed;
}

export function matchScore(c: Candidate, o: OfferForAllocation) {
  const countries = c.preferences?.countries ?? [];
  const works = c.preferences?.workTypes ?? [];
  // Не указал пожелания или «не важно» — нейтрально (0.5), совпало — 1, не совпало — 0
  const countryScore = !countries.length || countries.includes("any") ? 0.5 : countries.includes(o.country) ? 1 : 0;
  const workScore = !works.length ? 0.5 : works.some((w) => o.workTypes.includes(w)) ? 1 : 0;
  return {
    score: Math.round(((countryScore + workScore) / 2) * 100) / 100,
    countryMatch: countryScore === 1,
    workMatch: workScore === 1,
  };
}

export async function allocate(o: OfferForAllocation, candidates: Candidate[], seed: string): Promise<Ranked[]> {
  const rows = await Promise.all(
    candidates.map(async (c) => {
      const failed = checkCandidate(c, o);
      const m = matchScore(c, o);
      return {
        application_id: c.applicationId,
        user_id: c.userId,
        rank: 0,
        eligible: failed.length === 0,
        failed,
        match: m.score,
        country_match: m.countryMatch,
        work_match: m.workMatch,
        has_place: c.hasPlaceElsewhere,
        ticket: await ticketFor(seed, c.userId),
        outcome: "waitlisted" as Ranked["outcome"],
      };
    }),
  );

  rows.sort(
    (a, b) =>
      Number(b.eligible) - Number(a.eligible) ||
      b.match - a.match ||
      Number(a.has_place) - Number(b.has_place) ||
      (a.ticket < b.ticket ? -1 : a.ticket > b.ticket ? 1 : 0),
  );

  let seatsLeft = o.seats;
  rows.forEach((r, i) => {
    r.rank = i + 1;
    if (!r.eligible) r.outcome = "ineligible";
    else if (seatsLeft > 0) {
      r.outcome = "selected";
      seatsLeft--;
    }
  });
  return rows;
}
