import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** CSV для Excel: UTF-8 с BOM, разделитель «;» (так Excel с русской локалью откроет без мастера импорта). */
function csv(rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n");
}

const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ru-RU", { timeZone: "Asia/Almaty" }) : "");

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/admin/export/[kind]">) {
  const { kind } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse("unauthorized", { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (me?.role !== "admin") return new NextResponse("forbidden", { status: 403 });

  let rows: (string | number | null)[][] = [];
  if (kind === "students") {
    const { data } = await supabase.from("profiles").select("full_name, email, birth_date, university, english_level, created_at, enrollments ( current_stage, program:programs ( name ) )").eq("role", "student").order("created_at");
    rows = [["ФИО", "Email", "Дата рождения", "Вуз", "Английский", "Программы и этапы", "Зарегистрирован"],
      ...(data ?? []).map((p) => [p.full_name, p.email, p.birth_date, p.university, p.english_level,
        p.enrollments.map((e) => `${e.program?.name}: ${e.current_stage}`).join(", "), dt(p.created_at)])];
  } else if (kind === "applications") {
    const { data } = await supabase.from("applications").select("status, lottery_rank, match_score, created_at, decided_at, offer:offers ( code, title, program:programs ( name ) ), student:profiles!applications_user_id_fkey ( full_name, email )").order("created_at");
    rows = [["Программа", "Оффер", "Студент", "Email", "Статус", "Место в очереди", "Совпадение", "Подана", "Решение"],
      ...(data ?? []).map((a) => [a.offer?.program?.name ?? "", [a.offer?.code, a.offer?.title].filter(Boolean).join(" · "), a.student?.full_name ?? "", a.student?.email ?? "",
        a.status, a.lottery_rank, a.match_score, dt(a.created_at), dt(a.decided_at)])];
  } else if (kind === "payments") {
    const { data } = await supabase.from("payments").select("title, amount, currency, due_date, paid_at, program:programs ( name ), student:profiles!payments_user_id_fkey ( full_name, email )").order("due_date");
    rows = [["Студент", "Email", "Программа", "Назначение", "Сумма", "Валюта", "Срок", "Оплачено"],
      ...(data ?? []).map((p) => [p.student?.full_name ?? "", p.student?.email ?? "", p.program?.name ?? "", p.title, Number(p.amount), p.currency, p.due_date, dt(p.paid_at)])];
  } else if (kind === "audit") {
    const { data } = await supabase.from("audit_log").select("created_at, action, entity_type, entity_id, diff, actor:profiles ( full_name, email ), program:programs ( name )").order("created_at", { ascending: false }).limit(5000);
    rows = [["Когда", "Кто", "Действие", "Объект", "ID", "Программа", "Подробности"],
      ...(data ?? []).map((a) => [dt(a.created_at), a.actor?.full_name ?? "Система", a.action, a.entity_type, a.entity_id, a.program?.name ?? "", JSON.stringify(a.diff)])];
  } else {
    return new NextResponse("not found", { status: 404 });
  }
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="goglobal-${kind}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
