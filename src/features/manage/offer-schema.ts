import { z } from "zod";
import { ALL_COUNTRIES, ENGLISH_LEVELS } from "@/features/profile/constants";
import type { FieldDef } from "@/features/offers/types";

/** Zod-схема для значений полей оффера — строится из offer_schema программы. */
export function fieldsSchema(defs: FieldDef[]) {
  const shape: Record<string, z.ZodType> = {};
  for (const d of defs) {
    let s: z.ZodType;
    switch (d.type) {
      case "number":
      case "money":
        s = z.coerce.number({ error: "invalid" }).min(0, "invalid").max(1_000_000, "invalid");
        break;
      case "boolean":
        s = z.boolean();
        break;
      case "select":
        s = d.options?.length ? z.enum(d.options as [string, ...string[]], { error: "invalid" }) : z.string().max(200);
        break;
      case "country":
        s = z.enum(ALL_COUNTRIES, { error: "required" });
        break;
      case "date":
        s = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid");
        break;
      case "textarea":
        s = z.string().trim().max(2000, "invalid");
        break;
      default:
        s = z.string().trim().max(200, "invalid");
    }
    const empty = (v: unknown) => v === "" || v === undefined || v === null;
    if (d.type === "boolean") {
      // незаполненный переключатель = «нет»
      shape[d.key] = z.preprocess((v) => (v === null || v === undefined || v === "" ? false : v), z.boolean());
    } else if (d.required) {
      // пустое значение → undefined → ошибка «обязательное поле»
      const req = d.type === "text" || d.type === "textarea" ? (s as z.ZodString).min(1, "required") : s;
      shape[d.key] = z
        .preprocess((v) => (empty(v) ? undefined : v), req.optional())
        .refine((v) => v !== undefined, "required");
    } else {
      shape[d.key] = z.preprocess((v) => (empty(v) ? null : v), s.nullable());
    }
  }
  return z.object(shape);
}

export const offerCommonSchema = z
  .object({
    id: z.string().uuid().optional(),
    program_id: z.string().uuid(),
    seats_total: z.coerce.number({ error: "invalid" }).int("invalid").min(1, "invalid").max(500, "invalid"),
    min_english: z.enum(ENGLISH_LEVELS).nullable(),
    min_age: z.coerce.number().int().min(14).max(60).nullable(),
    max_age: z.coerce.number().int().min(14).max(60).nullable(),
    interview_at: z.string().datetime({ offset: true }).nullable(),
    interview_note: z.string().trim().max(300).default(""),
    window_start: z.enum(["now", "custom"]),
    window_start_at: z.string().datetime({ offset: true }).nullable(),
    window_hours: z.coerce.number().int().min(1, "invalid").max(720, "invalid"),
    allocation_mode: z.enum(["lottery", "manual"]),
    is_test: z.boolean().default(false),
    fields: z.record(z.string(), z.unknown()),
  })
  .refine((v) => v.min_age === null || v.max_age === null || v.min_age <= v.max_age, { message: "invalid", path: ["max_age"] })
  .refine((v) => v.window_start === "now" || !!v.window_start_at, { message: "required", path: ["window_start_at"] });

export type OfferFormInput = z.input<typeof offerCommonSchema>;
