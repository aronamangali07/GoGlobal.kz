"use server";

import { z } from "zod";
import { requireSession } from "@/lib/data/session";
import { onMessage } from "@/lib/notify/events";

/** Клиент вставил сообщение сам (RLS) — сервер рассылает уведомление получателю. */
export async function notifyNewMessage(messageId: string) {
  const id = z.string().uuid().parse(messageId);
  const { supabase, user } = await requireSession();
  const { data: m } = await supabase.from("messages").select("sender_id").eq("id", id).maybeSingle();
  if (!m || m.sender_id !== user.id) return;
  await onMessage(id);
}
