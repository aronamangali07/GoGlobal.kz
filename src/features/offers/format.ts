import type { FieldDef, FieldValues } from "./types";

export const TZ = "Asia/Almaty";

export function formatMoney(value: number, unit = "") {
  const symbol = unit.startsWith("€") ? "€" : unit.startsWith("₸") ? "₸" : "$";
  const suffix = unit.replace(/^[$€₸]/, "");
  const n = Number.isInteger(value) ? value.toLocaleString("ru-RU") : value.toFixed(2);
  return `${symbol}${n}${suffix}`;
}

export function formatDate(iso: string | null | undefined, withTime = true) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso));
}

type Labels = { yes: string; no: string; country: (code: string) => string };

export function formatFieldValue(def: FieldDef, value: FieldValues[string], labels: Labels): string | null {
  if (value === null || value === undefined || value === "") return null;
  switch (def.type) {
    case "boolean":
      return value ? labels.yes : labels.no;
    case "money":
      return formatMoney(Number(value), def.unit);
    case "number":
      return `${value}${def.unit ? ` ${def.unit}` : ""}`;
    case "date":
      return formatDate(String(value), false);
    case "country":
      return labels.country(String(value).toLowerCase());
    default:
      return String(value);
  }
}

/** 2–3 главных факта для карточки в ленте. */
export function cardFacts(slug: string, schema: FieldDef[], f: FieldValues, labels: Labels & { tips: string; hours: string }) {
  if (slug === "work-and-travel") {
    const facts: string[] = [];
    if (f.hourly_rate) facts.push(`${formatMoney(Number(f.hourly_rate), "$/час")}${f.tips ? ` ${labels.tips}` : ""}`);
    if (f.hours_min || f.hours_max) facts.push(`${[f.hours_min, f.hours_max].filter(Boolean).join("–")} ${labels.hours}`);
    if (f.housing_cost) facts.push(`🏠 ${formatMoney(Number(f.housing_cost), "$/мес")}`);
    return facts;
  }
  return schema
    .filter((d) => d.group === "money" || d.group === "dates")
    .map((d) => {
      const v = formatFieldValue(d, f[d.key], labels);
      if (!v) return null;
      return d.type === "boolean" ? (f[d.key] ? d.label : null) : v;
    })
    .filter(Boolean)
    .slice(0, 3) as string[];
}
