import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Profile = Tables<"profiles">;
export type Program = Tables<"programs">;

/** Текущий пользователь и его профиль. Один запрос на рендер (React cache). */
export const getSession = cache(async () => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  if (!profile) return null;
  return { user: data.user, profile, supabase };
});

export async function requireSession() {
  const session = await getSession();
  // Через /auth/signout, чтобы стереть куки битой сессии: иначе прокси вернёт на /dashboard
  if (!session) redirect("/auth/signout");
  return session;
}

/** Для кабинета: студент без онбординга отправляется его проходить. */
export async function requireOnboardedSession() {
  const session = await requireSession();
  if (session.profile.role === "student" && !session.profile.onboarded_at) redirect("/onboarding");
  return session;
}

export const getActivePrograms = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("programs").select("*").eq("is_active", true).order("sort");
  return data ?? [];
});

export async function getMyProgramIds(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("enrollments").select("program_id").eq("user_id", userId);
  return (data ?? []).map((e) => e.program_id);
}

/** Подписанная ссылка на аватар (бакет приватный). */
export async function getAvatarUrl(path: string | null) {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
