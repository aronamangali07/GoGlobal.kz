import type { Profile } from "@/lib/data/session";
import type { Preferences } from "./constants";

/** Насколько заполнен профиль — для подсказки на главной. */
export function profileCompleteness(p: Profile) {
  const prefs = (p.preferences ?? {}) as Preferences;
  const checks = [
    !!p.full_name,
    !!p.birth_date,
    !!p.university,
    !!p.english_level,
    !!p.avatar_path,
    !!prefs.countries?.length,
    !!prefs.workTypes?.length,
    !!p.telegram_chat_id,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
