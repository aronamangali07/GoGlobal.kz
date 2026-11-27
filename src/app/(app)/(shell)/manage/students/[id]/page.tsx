import { ArrowLeft, CalendarDays, FileText, GraduationCap, MapPin, MessageCircle, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgramIcon } from "@/components/ui/program-icon";
import { OpenDocument } from "@/features/documents/open-document";
import { EVENT_ICONS } from "@/features/journey/event-icons";
import { formatDate } from "@/features/offers/format";
import { PaymentList } from "@/features/payments/payment-list";
import { ageFrom, COUNTRY_FLAGS, type Preferences } from "@/features/profile/constants";
import { DeleteEventButton, DocReview, EventForm, PaymentActions, PaymentForm, StageSelect } from "@/features/students/student-tools";
import { getAvatarUrl } from "@/lib/data/session";
import { requireStaffSession } from "@/lib/data/staff";

function Section({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold"><Icon className="size-5 text-primary" aria-hidden /> {title}</h2>
      {children}
    </Card>
  );
}

export default async function StudentCardPage({ params }: PageProps<"/manage/students/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const t = await getTranslations("students.card");
  const tp = await getTranslations("profile");
  const te = await getTranslations("events");
  const td = await getTranslations("documents");
  const ta = await getTranslations("apply");
  const { supabase } = await requireStaffSession();

  const { data: student } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!student) notFound();
  const [{ data: enrollments }, { data: events }, { data: docs }, { data: payments }, { data: apps }] = await Promise.all([
    supabase.from("enrollments").select("id, program_id, current_stage, program:programs ( name, color, icon )").eq("user_id", id),
    supabase.from("events").select("id, type, title, starts_at, address, notes").eq("user_id", id).order("starts_at"),
    supabase.from("documents").select("id, status, reviewer_comment, file_name, created_at, type:document_types ( name ), program_id").eq("user_id", id).order("created_at"),
    supabase.from("payments").select("id, title, amount, currency, due_date, paid_at").eq("user_id", id).order("due_date"),
    supabase.from("applications").select("id, status, lottery_rank, offer:offers ( id, code, title )").eq("user_id", id).neq("status", "withdrawn"),
  ]);
  // Менеджер видит только свои программы студента (RLS)
  const managed = (enrollments ?? []).filter((e) => e.program);
  if (!managed.length) notFound();
  const programs = managed.map((e) => ({ id: e.program_id, name: e.program!.name }));
  const avatar = await getAvatarUrl(student.avatar_path);
  const prefs = (student.preferences ?? {}) as Preferences;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link href="/manage/students" className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> {(await getTranslations("students"))("title")}
      </Link>

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- подписанная ссылка
          <img src={avatar} alt="" className="size-20 rounded-full object-cover" />
        ) : (
          <span className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-primary to-route text-2xl font-semibold text-white">
            {(student.full_name ?? "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold">{student.full_name}</h1>
          <p className="text-sm text-fg-muted">{student.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <Badge tone="primary">{t("english")}: {student.english_level ?? "—"}</Badge>
            <Badge>{t("age")}: {ageFrom(student.birth_date) ?? "—"}</Badge>
            {student.university && <Badge><GraduationCap className="size-3" aria-hidden /> {student.university}</Badge>}
          </div>
        </div>
        <Link href={`/messages?student=${id}&program=${programs[0].id}`}>
          <Button variant="secondary" className="w-full sm:w-auto"><MessageCircle className="size-4" aria-hidden /> {t("chat")}</Button>
        </Link>
      </Card>

      <Section icon={MapPin} title={t("programs")}>
        <ul className="flex flex-col gap-3">
          {managed.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3">
              <span className="inline-flex items-center gap-2 font-semibold" style={{ color: e.program!.color }}>
                <ProgramIcon name={e.program!.icon} className="size-5" aria-hidden /> {e.program!.name}
              </span>
              <StageSelect studentId={id} enrollmentId={e.id} stage={e.current_stage} />
            </li>
          ))}
        </ul>
        {(prefs.countries?.length || prefs.workTypes?.length || prefs.note) && (
          <div className="mt-4 text-sm">
            <p className="font-semibold">{t("preferences")}</p>
            <p className="mt-1 text-fg-muted">
              {prefs.countries?.map((c) => `${COUNTRY_FLAGS[c] ?? ""} ${tp(`country.${c}` as "country.us")}`).join(", ")}
              {prefs.workTypes?.length ? ` · ${prefs.workTypes.map((w) => tp(`work.${w}` as "work.hotel")).join(", ")}` : ""}
            </p>
            {prefs.note && <p className="mt-1 italic text-fg-muted">«{prefs.note}»</p>}
          </div>
        )}
        {!!apps?.length && (
          <div className="mt-4">
            <p className="text-sm font-semibold">{t("applications")}</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {apps.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/manage/offers/${a.offer?.id}/applications`} className="truncate hover:underline">{[a.offer?.code, a.offer?.title].filter(Boolean).join(" · ")}</Link>
                  <Badge tone={a.status === "selected" || a.status === "approved" ? "success" : a.status === "pending" ? "route" : "warning"}>{ta(`status.${a.status}` as "status.pending")}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section icon={CalendarDays} title={t("events")}>
        <ul className="mb-4 flex flex-col gap-2">
          {(events ?? []).map((ev) => {
            const Icon = EVENT_ICONS[ev.type];
            return (
              <li key={ev.id} className="flex items-start gap-3 rounded-2xl bg-surface-2 p-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">{te(`types.${ev.type}`)}: {ev.title}</p>
                  <p className="text-fg-muted">{formatDate(ev.starts_at)}{ev.address ? ` · ${ev.address}` : ""}</p>
                </div>
                <DeleteEventButton studentId={id} eventId={ev.id} />
              </li>
            );
          })}
        </ul>
        <EventForm studentId={id} programs={programs} />
      </Section>

      <Section icon={FileText} title={t("documents")}>
        {docs?.length ? (
          <ul className="flex flex-col gap-2.5">
            {docs.map((d) => (
              <li key={d.id} className="rounded-2xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{d.type?.name}</p>
                  <Badge tone={d.status === "accepted" ? "success" : d.status === "rework" ? "danger" : "warning"}>{td(`status.${d.status}`)}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-fg-subtle">{d.file_name} · {formatDate(d.created_at)}</p>
                {d.reviewer_comment && d.status === "rework" && <p className="mt-1 text-sm text-danger">{d.reviewer_comment}</p>}
                <div className="flex flex-wrap items-start gap-2">
                  <div className="mt-3"><OpenDocument id={d.id} label={td("view")} /></div>
                  <DocReview documentId={d.id} status={d.status} />
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-fg-muted">—</p>}
      </Section>

      <Section icon={Wallet} title={t("payments")}>
        <div className="mb-4">
          <PaymentList payments={payments ?? []} actions={(p) => <PaymentActions studentId={id} paymentId={p.id} paid={!!p.paid_at} />} />
        </div>
        <PaymentForm studentId={id} programs={programs} />
      </Section>
    </div>
  );
}
