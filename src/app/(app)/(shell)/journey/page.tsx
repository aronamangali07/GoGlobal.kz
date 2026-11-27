import { CalendarDays, FileCheck2, MessageCircle, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ProgramIcon } from "@/components/ui/program-icon";
import { EventCountdown } from "@/features/journey/event-countdown";
import { JourneyMap } from "@/features/journey/journey-map";
import { getMyEnrollments, getMyEvents } from "@/lib/data/journey";
import { requireOnboardedSession } from "@/lib/data/session";
import { cn, nowMs } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("journey");
  return { title: `${t("title")} · GoGlobal` };
}

export default async function JourneyPage({ searchParams }: PageProps<"/journey">) {
  const t = await getTranslations("journey");
  const { profile, user, supabase } = await requireOnboardedSession();
  if (profile.role !== "student") redirect("/dashboard");
  const { p } = await searchParams;

  const [enrollments, events, { data: docs }, { data: docTypes }, { data: payments }] = await Promise.all([
    getMyEnrollments(user.id),
    getMyEvents(user.id),
    supabase.from("documents").select("program_id, status").eq("user_id", user.id),
    supabase.from("document_types").select("program_id, required"),
    supabase.from("payments").select("program_id, paid_at, due_date").eq("user_id", user.id),
  ]);
  if (!enrollments.length) return <p className="py-20 text-center text-fg-muted">{t("empty")}</p>;

  // По умолчанию — программа, где студент продвинулся дальше всего
  const order = ["application", "interview", "offer", "documents", "embassy", "visa", "departure"];
  const active =
    enrollments.find((e) => e.program_id === p) ??
    [...enrollments].sort((a, b) => order.indexOf(b.current_stage) - order.indexOf(a.current_stage))[0];
  const program = active.program!;
  const now = nowMs();
  const next = events.find((e) => Date.parse(e.starts_at) > now);

  const requiredDocs = (docTypes ?? []).filter((d) => d.program_id === program.id && d.required).length;
  const acceptedDocs = (docs ?? []).filter((d) => d.program_id === program.id && d.status === "accepted").length;
  const unpaid = (payments ?? []).filter((x) => x.program_id === program.id && !x.paid_at).length;
  const done = order.indexOf(active.current_stage);

  const quick = [
    { href: "/calendar", icon: CalendarDays, label: t("quick.calendar"), hint: events.filter((e) => Date.parse(e.starts_at) > now).length || "" },
    { href: `/documents?p=${program.id}`, icon: FileCheck2, label: t("quick.documents"), hint: `${acceptedDocs}/${requiredDocs}` },
    { href: `/payments?p=${program.id}`, icon: Wallet, label: t("quick.payments"), hint: unpaid ? `${unpaid}` : "✓" },
    { href: `/messages?p=${program.id}`, icon: MessageCircle, label: t("quick.messages"), hint: "" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
      <p className="mt-1.5 text-fg-muted">{t("subtitle")}</p>

      {enrollments.length > 1 && (
        <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {enrollments.map((e) => (
            <Link
              key={e.id}
              href={`/journey?p=${e.program_id}`}
              style={{ ["--pc" as string]: e.program!.color }}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                e.id === active.id ? "border-[var(--pc)] bg-[color-mix(in_oklab,var(--pc)_12%,var(--surface))] text-fg" : "border-border-strong text-fg-muted",
              )}
            >
              <ProgramIcon name={e.program!.icon} className="size-4 text-[var(--pc)]" aria-hidden /> {e.program!.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5">
        {next ? (
          <EventCountdown color={next.program?.color ?? program.color} event={{ ...next, type: next.type }} />
        ) : (
          <Card className="text-sm text-fg-muted">{t("noEvents")}</Card>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {quick.map(({ href, icon: Icon, label, hint }) => (
          <Link key={href} href={href} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3.5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5">
            <span className="flex items-center justify-between">
              <Icon className="size-5 text-primary" aria-hidden />
              {hint !== "" && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold">{hint}</span>}
            </span>
            <span className="text-sm font-semibold">{label}</span>
          </Link>
        ))}
      </div>

      <Card className="mt-6 overflow-hidden px-3 py-6 sm:px-6">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="inline-flex items-center gap-2 font-semibold" style={{ color: program.color }}>
            <ProgramIcon name={program.icon} className="size-5" aria-hidden /> {program.name}
          </span>
          <span className="text-sm text-fg-muted">{t("progress", { done: done + 1, total: order.length })}</span>
        </div>
        <JourneyMap key={active.id} enrollmentId={active.id} stage={active.current_stage} color={program.color} />
      </Card>
    </div>
  );
}
