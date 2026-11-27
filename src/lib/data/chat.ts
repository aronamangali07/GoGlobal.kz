import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Тред студент × программа; создаётся при первом открытии. */
export async function ensureThread(studentId: string, programId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("threads").select("id").eq("student_id", studentId).eq("program_id", programId).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from("threads").insert({ student_id: studentId, program_id: programId }).select("id").single();
  if (error) {
    // гонка: тред уже создан параллельно
    const { data: again } = await supabase.from("threads").select("id").eq("student_id", studentId).eq("program_id", programId).maybeSingle();
    return again?.id ?? null;
  }
  return data.id;
}

export async function getMessages(threadId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("messages").select("id, sender_id, body, created_at, read_at").eq("thread_id", threadId).order("created_at").limit(500);
  return data ?? [];
}

/** Входящие для персонала: треды программ, последнее сообщение, непрочитанные. */
export async function getInbox(meId: string) {
  const supabase = await createClient();
  const { data: threads } = await supabase
    .from("threads")
    .select("id, last_message_at, student:profiles!threads_student_id_fkey ( id, full_name ), program:programs ( name, color )")
    .order("last_message_at", { ascending: false })
    .limit(100);
  const ids = (threads ?? []).map((t) => t.id);
  const { data: msgs } = ids.length
    ? await supabase.from("messages").select("thread_id, body, sender_id, read_at, created_at").in("thread_id", ids).order("created_at", { ascending: false }).limit(1000)
    : { data: [] };
  return (threads ?? []).map((t) => {
    const mine = (msgs ?? []).filter((m) => m.thread_id === t.id);
    return {
      ...t,
      last: mine[0] ?? null,
      unread: mine.filter((m) => m.sender_id !== meId && !m.read_at).length,
    };
  });
}
