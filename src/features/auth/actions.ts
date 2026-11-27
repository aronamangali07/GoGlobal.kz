"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { isSupabaseConfigured, SITE_URL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, magicLinkSchema, registerSchema, type AuthErrorCode, type AuthResult } from "./schema";

function mapError(error: AuthError): AuthErrorCode {
  switch (error.code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "user_already_exists":
    case "email_exists":
      return "userExists";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rateLimit";
    default:
      return error.status === 429 ? "rateLimit" : "generic";
  }
}

function zodFail(issues: { message: string; path: PropertyKey[] }[]): AuthResult {
  const first = issues[0];
  return {
    ok: false,
    error: first.message as AuthErrorCode,
    field: first.path[0] as "email" | "password" | "confirm",
  };
}

export async function signInWithPassword(input: unknown): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { ok: false, error: "notConfigured" };
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error.issues);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: mapError(error) };
  return { ok: true, kind: "signed-in" };
}

export async function signUp(input: unknown): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { ok: false, error: "notConfigured" };
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error.issues);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=/onboarding` },
  });
  if (error) return { ok: false, error: mapError(error) };
  // Supabase не раскрывает, существует ли email: при повторной регистрации identities пустые.
  if (data.user && data.user.identities?.length === 0) return { ok: false, error: "userExists", field: "email" };
  if (!data.session) return { ok: true, kind: "check-email", email: parsed.data.email, reason: "confirm" };
  return { ok: true, kind: "signed-in" };
}

export async function sendMagicLink(input: unknown): Promise<AuthResult> {
  if (!isSupabaseConfigured) return { ok: false, error: "notConfigured" };
  const parsed = magicLinkSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error.issues);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=/dashboard` },
  });
  if (error) return { ok: false, error: mapError(error) };
  return { ok: true, kind: "check-email", email: parsed.data.email, reason: "magic" };
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

const DEMO_ACCOUNTS = {
  student: "student@demo.goglobal.kz",
  manager: "manager@demo.goglobal.kz",
  admin: "admin@demo.goglobal.kz",
} as const;

/** Вход в демо-аккаунт одной кнопкой. Работает только при NEXT_PUBLIC_DEMO_MODE=true. */
export async function demoSignIn(role: keyof typeof DEMO_ACCOUNTS): Promise<AuthResult> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true" || !process.env.DEMO_PASSWORD) return { ok: false, error: "generic" };
  if (!isSupabaseConfigured) return { ok: false, error: "notConfigured" };
  const email = DEMO_ACCOUNTS[role];
  if (!email) return { ok: false, error: "generic" };
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  const { error } = await supabase.auth.signInWithPassword({ email, password: process.env.DEMO_PASSWORD });
  if (error) return { ok: false, error: mapError(error) };
  return { ok: true, kind: "signed-in" };
}
