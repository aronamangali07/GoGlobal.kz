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

/** Все страны, где бывают офферы. Подписи — messages profile.country.<code> */
export const ALL_COUNTRIES = ["us", "de", "uk", "ae", "kr", "fr", "es", "tr", "cn", "nl", "at", "ch", "it", "jp", "ca", "au"] as const;
export type CountryCode = (typeof ALL_COUNTRIES)[number];

export const COUNTRY_FLAGS: Record<string, string> = {
  us: "🇺🇸", de: "🇩🇪", uk: "🇬🇧", ae: "🇦🇪", kr: "🇰🇷", fr: "🇫🇷", es: "🇪🇸", tr: "🇹🇷", cn: "🇨🇳",
  nl: "🇳🇱", at: "🇦🇹", ch: "🇨🇭", it: "🇮🇹", jp: "🇯🇵", ca: "🇨🇦", au: "🇦🇺", any: "🌍",
};

export function englishAtLeast(level: string | null | undefined, min: string | null | undefined) {
  if (!min) return true;
  if (!level) return false;
  return ENGLISH_LEVELS.indexOf(level as EnglishLevel) >= ENGLISH_LEVELS.indexOf(min as EnglishLevel);
}

export function ageFrom(birthDate: string | null | undefined, now = new Date()) {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}
