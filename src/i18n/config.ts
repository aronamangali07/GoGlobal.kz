export const locales = ["ru", "kk", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ru";
// Пока переведён только русский. Чтобы включить язык — добавьте messages/<locale>.json
// и уберите его из этого списка.
export const unavailableLocales: Locale[] = ["kk", "en"];
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const TIME_ZONE = "Asia/Almaty";
