import { z } from "zod";
import { ageFrom, COUNTRIES, ENGLISH_LEVELS, WORK_TYPES } from "./constants";

// Сообщения — ключи в messages profile.errors.*
export const personalSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, "nameShort")
    .max(120, "nameShort")
    .refine((v) => v.split(/\s+/).length >= 2, "nameTwoWords"),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "birthInvalid")
    .refine((v) => {
      const a = ageFrom(v);
      return a !== null && a >= 16 && a <= 45;
    }, "birthRange"),
  university: z.string().trim().min(2, "universityShort").max(160, "universityShort"),
});

export const englishSchema = z.object({ english_level: z.enum(ENGLISH_LEVELS, { error: "englishRequired" }) });

export const programsSchema = z.object({
  program_ids: z.array(z.string().uuid()).min(1, "programsRequired").max(10),
});

export const preferencesSchema = z.object({
  countries: z.array(z.enum(COUNTRIES)).max(COUNTRIES.length).default([]),
  workTypes: z.array(z.enum(WORK_TYPES)).max(WORK_TYPES.length).default([]),
  note: z.string().trim().max(500, "noteLong").default(""),
});

export const avatarSchema = z.object({
  avatar_path: z.string().max(300).nullable(),
});

export const profileSchema = personalSchema
  .merge(englishSchema)
  .merge(programsSchema)
  .extend({ preferences: preferencesSchema });

export type ProfileInput = z.infer<typeof profileSchema>;
