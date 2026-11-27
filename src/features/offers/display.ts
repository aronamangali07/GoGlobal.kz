import type { FieldValues } from "./types";

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

/**
 * Заголовок, подзаголовок и локация карточки — из полей оффера.
 * Для новых программ, созданных админом, — разумный запасной вариант.
 */
export function deriveDisplay(slug: string, f: FieldValues) {
  switch (slug) {
    case "work-and-travel":
      return { title: str(f.position), subtitle: str(f.employer), country: "us", city: [str(f.city), str(f.state)].filter(Boolean).join(", ") };
    case "au-pair":
      return {
        title: str(f.family) || `Au Pair · ${str(f.city)}`,
        subtitle: [f.kids_count ? `${f.kids_count} реб.` : "", str(f.kids_ages)].filter(Boolean).join(", "),
        country: str(f.country).toLowerCase(),
        city: str(f.city),
      };
    case "internship":
      return { title: str(f.specialty) || str(f.field), subtitle: str(f.company), country: str(f.country).toLowerCase(), city: str(f.city) };
    case "camp-counselor":
      return { title: str(f.role), subtitle: str(f.camp), country: "us", city: str(f.state) };
    default: {
      const texts = Object.values(f).filter((v) => typeof v === "string" && v.trim()) as string[];
      return { title: texts[0] ?? "Оффер", subtitle: texts[1] ?? "", country: str(f.country).toLowerCase(), city: str(f.city) };
    }
  }
}
