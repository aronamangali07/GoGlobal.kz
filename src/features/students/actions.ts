"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/data/session";
import { onEventScheduled } from "@/lib/notify/events";

async function staff() {
  const s = await requireSession();
  if (s.profile.role === "student") throw new Error("forbidden");
  return s;
}
const uuid = z.string().uuid();
const done = (studentId: string) => {
  revalidatePath(`/manage/students/${studentId}`);
  revalidatePath("/manage/students");
};

export async function setStage(studentId: string, enrollmentId: string, stage: string) {
  const { supabase } = await staff();
  const { error } = await supabase
    .from("enrollments")
    .update({ current_stage: z.enum(["application", "interview", "offer", "documents", "embassy", "visa", "departure"]).parse(stage) })
    .eq("id", uuid.parse(enrollmentId));
  done(uuid.parse(studentId));
  return { ok: !error };
}

const eventSchema = z.object({
  userId: uuid,
  programId: uuid,
  type: z.enum(["interview", "embassy", "deadline", "flight", "other"]),
  title: z.string().trim().min(2).max(200),
  startsAt: z.string().datetime({ offset: true }),
  address: z.string().trim().max(300).default(""),
  notes: z.string().trim().max(1000).default(""),
});

export async function createEvent(raw: unknown) {
  const v = eventSchema.safeParse(raw);
  if (!v.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await staff();
  const { data: ev, error } = await supabase.from("events").insert({
    user_id: v.data.userId, program_id: v.data.programId, type: v.data.type, title: v.data.title,
    starts_at: v.data.startsAt, address: v.data.address, notes: v.data.notes, created_by: user.id,
  }).select("id").single();
  if (ev) await onEventScheduled(ev.id);
  done(v.data.userId);
  return { ok: !error, error: error ? "generic" : undefined };
}

export async function deleteEvent(studentId: string, eventId: string) {
  const { supabase } = await staff();
  const { error } = await supabase.from("events").delete().eq("id", uuid.parse(eventId));
  done(uuid.parse(studentId));
  return { ok: !error };
}

const paymentSchema = z.object({
  userId: uuid,
  programId: uuid,
  title: z.string().trim().min(2).max(200),
  amount: z.coerce.number().positive().max(100_000_000),
  currency: z.enum(["KZT", "USD", "EUR"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export async function createPayment(raw: unknown) {
  const v = paymentSchema.safeParse(raw);
  if (!v.success) return { ok: false, error: "invalid" };
  const { supabase, user } = await staff();
  const { error } = await supabase.from("payments").insert({
    user_id: v.data.userId, program_id: v.data.programId, title: v.data.title, amount: v.data.amount,
    currency: v.data.currency, due_date: v.data.dueDate, created_by: user.id,
  });
  done(v.data.userId);
  return { ok: !error, error: error ? "generic" : undefined };
}

export async function setPaid(studentId: string, paymentId: string, paid: boolean) {
  const { supabase } = await staff();
  const { error } = await supabase.from("payments").update({ paid_at: paid ? new Date().toISOString() : null }).eq("id", uuid.parse(paymentId));
  done(uuid.parse(studentId));
  return { ok: !error };
}

export async function deletePayment(studentId: string, paymentId: string) {
  const { supabase } = await staff();
  const { error } = await supabase.from("payments").delete().eq("id", uuid.parse(paymentId));
  done(uuid.parse(studentId));
  return { ok: !error };
}
