import { ageFrom, englishAtLeast } from "@/features/profile/constants";
import type { Offer } from "./types";

export type EligibilityCheck = { key: "program" | "english" | "age"; ok: boolean; need?: string; have?: string };

/** Проверка требований оффера для студента. Та же логика повторится в базе при подаче (этап 5). */
export function checkEligibility(
  offer: Pick<Offer, "program_id" | "min_english" | "min_age" | "max_age">,
  student: { english_level: string | null; birth_date: string | null; programIds: string[] },
): { eligible: boolean; checks: EligibilityCheck[] } {
  const checks: EligibilityCheck[] = [
    { key: "program", ok: student.programIds.includes(offer.program_id) },
  ];
  if (offer.min_english) {
    checks.push({
      key: "english",
      ok: englishAtLeast(student.english_level, offer.min_english),
      need: offer.min_english,
      have: student.english_level ?? "—",
    });
  }
  if (offer.min_age || offer.max_age) {
    const age = ageFrom(student.birth_date);
    const ok = age !== null && (!offer.min_age || age >= offer.min_age) && (!offer.max_age || age <= offer.max_age);
    checks.push({
      key: "age",
      ok,
      need: [offer.min_age ?? "", offer.max_age ?? ""].join("–"),
      have: age === null ? "—" : String(age),
    });
  }
  return { eligible: checks.every((c) => c.ok), checks };
}
