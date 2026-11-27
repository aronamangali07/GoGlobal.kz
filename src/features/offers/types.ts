import type { Tables } from "@/lib/supabase/database.types";

export type FieldType = "text" | "textarea" | "number" | "money" | "date" | "select" | "boolean" | "country";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  options?: string[];
  required?: boolean;
  group?: "main" | "dates" | "money" | "requirements" | "extra";
};

export type FieldValues = Record<string, string | number | boolean | null>;

export type Offer = Tables<"offers">;
export type ProgramLite = Pick<Tables<"programs">, "id" | "slug" | "name" | "color" | "icon"> & {
  offer_schema: FieldDef[];
};

export type OfferWithProgram = Offer & { program: ProgramLite };

/** Состояние окна подачи с учётом текущего времени (статус в базе обновит крон). */
export type WindowState = "draft" | "upcoming" | "open" | "closed" | "allocated" | "archived";

export function windowState(o: Pick<Offer, "status" | "window_opens_at" | "window_closes_at">, now = Date.now()): WindowState {
  if (o.status === "draft" || o.status === "archived" || o.status === "allocated") return o.status;
  if (o.status === "closed") return "closed";
  const opens = o.window_opens_at ? Date.parse(o.window_opens_at) : 0;
  const closes = o.window_closes_at ? Date.parse(o.window_closes_at) : Infinity;
  if (now < opens) return "upcoming";
  if (now >= closes) return "closed";
  return "open";
}

/** Опубликован меньше суток назад — показываем бейдж «Новый». */
export function isFresh(publishedAt: string | null, now = Date.now()) {
  return !!publishedAt && now - Date.parse(publishedAt) < 24 * 3600 * 1000;
}
