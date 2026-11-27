// Справочники для онбординга и профиля. Подписи — в messages (profile.*).
export const ENGLISH_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type EnglishLevel = (typeof ENGLISH_LEVELS)[number];

export const COUNTRIES = ["us", "de", "uk", "ae", "kr", "fr", "es", "tr", "cn", "any"] as const;
export const WORK_TYPES = ["restaurant", "hotel", "park", "retail", "kids", "office", "sport", "kitchen", "camp"] as const;

export type Preferences = {
  countries?: string[];
  workTypes?: string[];
  note?: string;
};

export const COUNTRY_FLAGS: Record<(typeof COUNTRIES)[number], string> = {
  us: "🇺🇸", de: "🇩🇪", uk: "🇬🇧", ae: "🇦🇪", kr: "🇰🇷", fr: "🇫🇷", es: "🇪🇸", tr: "🇹🇷", cn: "🇨🇳", any: "🌍",
};

export function ageFrom(birthDate: string | null | undefined, now = new Date()) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
