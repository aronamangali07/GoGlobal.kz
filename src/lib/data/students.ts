import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Студенты программ, которыми управляет пользователь (RLS: manages_program). */
export async function getManagedStudents() {
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, user_id, program_id, current_stage, program:programs ( name, color, icon ), student:profiles!enrollments_user_id_fkey ( id, full_name, email, english_level, birth_date, avatar_path, role )")
    .order("stage_updated_at", { ascending: false });
  const { data: pendingDocs } = await supabase.from("documents").select("user_id").eq("status", "pending");
  const pending: Record<string, number> = {};
  for (const d of pendingDocs ?? []) pending[d.user_id] = (pending[d.user_id] ?? 0) + 1;
  return { enrollments: (enrollments ?? []).filter((e) => e.student?.role === "student"), pending };
}
