import { z } from "zod";

// Коды ошибок — ключи в messages auth.errors.*
export const emailSchema = z.string().trim().toLowerCase().email("emailInvalid");
export const passwordSchema = z.string().min(8, "passwordShort").max(72, "passwordShort");

export const loginSchema = z.object({ email: emailSchema, password: passwordSchema });
export const magicLinkSchema = z.object({ email: emailSchema });
export const registerSchema = z
  .object({ email: emailSchema, password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "passwordMismatch", path: ["confirm"] });

export type AuthErrorCode =
  | "emailInvalid"
  | "passwordShort"
  | "passwordMismatch"
  | "invalidCredentials"
  | "emailNotConfirmed"
  | "userExists"
  | "rateLimit"
  | "notConfigured"
  | "generic";

export type AuthResult =
  | { ok: true; kind: "signed-in" }
  | { ok: true; kind: "check-email"; email: string; reason: "magic" | "confirm" }
  | { ok: false; error: AuthErrorCode; field?: "email" | "password" | "confirm" };
