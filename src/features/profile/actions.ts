"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/data/session";
import type { Json } from "@/lib/supabase/database.types";
import {
  avatarSchema,
  englishSchema,
  personalSchema,
  preferencesSchema,
  profileSchema,
  programsSchema,
} from "./schema";

export type ActionResult = { ok: true } | { ok: false; error: string; field?: string };

type Supabase = Awaited<ReturnType<typeof requireSession>>["supabase"];

function fail(issues: { message: string; path: PropertyKey[] }[]): ActionResult {
  return { ok: false, error: issues[0].message, field: String(issues[0].path[0] ?? "") };
}

/** Приводит список программ студента к выбранному: добавляет новые, убирает снятые. */
async function syncPrograms(supabase: Supabase, userId: string, programIds: string[]) {
  const { data: current } = await supabase.from("enrollments").select("program_id, current_stage").eq("user_id", userId);
  const have = new Set((current ?? []).map((e) => e.program_id));
  const want = new Set(programIds);

  const toAdd = programIds.filter((id) => !have.has(id)).map((program_id) => ({ user_id: userId, program_id }));
  if (toAdd.length) {
    const { error } = await supabase.from("enrollments").insert(toAdd);
    if (error) return { ok: false, error: "generic" } as const;
  }
  // Выйти можно только из программ, где ещё не начался процесс (этап «заявка»)
  const toRemove = (current ?? []).filter((e) => !want.has(e.program_id));
  if (toRemove.some((e) => e.current_stage !== "application")) return { ok: false, error: "programLocked" } as const;
  if (toRemove.length) {
    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("user_id", userId)
      .in("program_id", toRemove.map((e) => e.program_id));
    if (error) return { ok: false, error: "generic" } as const;
  }
  return { ok: true } as const;
}

const stepSchemas = {
  personal: personalSchema,
  english: englishSchema,
  avatar: avatarSchema,
  programs: programsSchema,
  preferences: preferencesSchema,
} as const;
export type OnboardingStep = keyof typeof stepSchemas;

/** Сохраняет один шаг онбординга — прогресс не теряется, если закрыть вкладку. */
export async function saveOnboardingStep(step: OnboardingStep, input: unknown): Promise<ActionResult> {
  const { supabase, user, profile } = await requireSession();
  const parsed = stepSchemas[step].safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues);
  const data = parsed.data;

  if (step === "programs") {
    return syncPrograms(supabase, user.id, (data as { program_ids: string[] }).program_ids);
  }
  if (step === "avatar") {
    const path = (data as { avatar_path: string | null }).avatar_path;
    if (path && !path.startsWith(`${user.id}/`)) return { ok: false, error: "generic" };
  }
  const update =
    step === "preferences"
      ? { preferences: { ...(profile.preferences as object), ...(data as object) } as Json }
      : data;
  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return { ok: false, error: "generic" };
  return { ok: true };
}

export async function completeOnboarding(): Promise<ActionResult> {
  const { supabase, user, profile } = await requireSession();
  const { count } = await supabase.from("enrollments").select("*", { count: "exact", head: true }).eq("user_id", user.id);
  const check = profileSchema.omit({ program_ids: true, preferences: true }).safeParse(profile);
  if (!check.success) return fail(check.error.issues);
  if (!count) return { ok: false, error: "programsRequired", field: "program_ids" };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: profile.onboarded_at ?? new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { ok: false, error: "generic" };
  // Без revalidatePath: иначе страница онбординга перерисуется и сразу уведёт в кабинет,
  // не показав финальный экран. Кабинет и так рендерится динамически.
  return { ok: true };
}

/** Сохранение со страницы профиля — все поля сразу. */
export async function updateProfile(input: unknown): Promise<ActionResult> {
  const { supabase, user, profile } = await requireSession();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues);
  const { program_ids, preferences, ...fields } = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({ ...fields, preferences: { ...(profile.preferences as object), ...preferences } as Json })
    .eq("id", user.id);
  if (error) return { ok: false, error: "generic" };

  const sync = await syncPrograms(supabase, user.id, program_ids);
  if (!sync.ok) return { ...sync, field: "program_ids" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setAvatar(path: string | null): Promise<ActionResult> {
  const result = await saveOnboardingStep("avatar", { avatar_path: path });
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
