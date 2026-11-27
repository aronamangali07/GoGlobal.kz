"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/data/session";

const input = z.object({
  documentTypeId: z.string().uuid(),
  path: z.string().max(400),
  name: z.string().max(200),
  mime: z.string().max(100),
  size: z.number().int().min(1).max(10 * 1024 * 1024),
});

/** Файл уже в Storage (загружен с клиента) — регистрируем/заменяем запись документа. */
export async function registerDocument(raw: unknown) {
  const v = input.parse(raw);
  const { supabase, user } = await requireSession();
  if (!v.path.startsWith(`${user.id}/`)) return { ok: false, error: "forbidden" };
  const { data: type } = await supabase.from("document_types").select("program_id").eq("id", v.documentTypeId).single();
  if (!type) return { ok: false, error: "not_found" };

  const { data: existing } = await supabase
    .from("documents").select("id, file_path, status").eq("user_id", user.id).eq("document_type_id", v.documentTypeId).maybeSingle();
  if (existing?.status === "accepted") return { ok: false, error: "document_locked" };

  const row = { file_path: v.path, file_name: v.name, mime: v.mime, size_bytes: v.size, status: "pending" as const };
  const { error } = existing
    ? await supabase.from("documents").update(row).eq("id", existing.id)
    : await supabase.from("documents").insert({ ...row, user_id: user.id, document_type_id: v.documentTypeId, program_id: type.program_id });
  if (error) return { ok: false, error: "generic" };
  if (existing && existing.file_path !== v.path) await supabase.storage.from("documents").remove([existing.file_path]);
  revalidatePath("/documents");
  return { ok: true };
}

/** Временная ссылка на файл (свой — студенту, студентов своей программы — менеджеру). */
export async function documentUrl(documentId: string) {
  const id = z.string().uuid().parse(documentId);
  const { supabase } = await requireSession();
  const { data: doc } = await supabase.from("documents").select("file_path").eq("id", id).single();
  if (!doc) return null;
  const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 300);
  return data?.signedUrl ?? null;
}

export async function reviewDocument(documentId: string, decision: "accepted" | "rework", comment = "") {
  const { supabase, profile } = await requireSession();
  if (profile.role === "student") return { ok: false };
  const { error } = await supabase
    .from("documents")
    .update({ status: z.enum(["accepted", "rework"]).parse(decision), reviewer_comment: z.string().max(500).parse(comment) })
    .eq("id", z.string().uuid().parse(documentId));
  revalidatePath("/manage/documents");
  revalidatePath("/manage/students", "layout");
  return { ok: !error };
}
