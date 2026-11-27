import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ChatRoom } from "@/features/chat/chat-room";
import { TZ } from "@/features/offers/format";
import { ProgramTabs } from "@/features/shell/program-tabs";
import { ensureThread, getInbox, getMessages } from "@/lib/data/chat";
import { getMyEnrollments } from "@/lib/data/journey";
import { requireOnboardedSession } from "@/lib/data/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("chat");
  return { title: `${t("title")} · GoGlobal` };
}

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const t = await getTranslations("chat");
  const { user, profile } = await requireOnboardedSession();
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  if (profile.role === "student") {
    const programs = (await getMyEnrollments(user.id)).map((e) => e.program!);
    const active = programs.find((x) => x.id === str(sp.p)) ?? programs[0];
    if (!active) redirect("/journey");
    const threadId = await ensureThread(user.id, active.id);
    if (!threadId) redirect("/dashboard");
    const messages = await getMessages(threadId);
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
        <ProgramTabs base="/messages" programs={programs} active={active.id} />
        <ChatRoom key={threadId} threadId={threadId} meId={user.id} initial={messages} title={`${t("manager")} · ${active.name}`} subtitle={t("subtitle")} />
      </div>
    );
  }

  // Персонал: открыть/создать тред со студентом из карточки студента
  const student = str(sp.student);
  const program = str(sp.program);
  if (student && program) {
    const id = await ensureThread(student, program);
    if (id) redirect(`/messages?t=${id}`);
  }
  const inbox = await getInbox(user.id);
  const activeId = str(sp.t);
  const active = inbox.find((x) => x.id === activeId);
  const messages = active ? await getMessages(active.id) : [];

  return (
    <div>
      <h1 className="mb-4 font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className={cn("max-h-[calc(100dvh-9rem)] overflow-y-auto p-1.5", active && "hidden lg:block")}>
          {inbox.length === 0 && <p className="p-4 text-sm text-fg-muted">{t("noThreads")}</p>}
          {inbox.map((th) => (
            <Link key={th.id} href={`/messages?t=${th.id}`}
              className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors", th.id === activeId ? "bg-primary-soft" : "hover:bg-surface-2")}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-white" style={{ background: th.program?.color }}>
                {(th.student?.full_name ?? "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{th.student?.full_name}</span>
                  {th.last && <span className="shrink-0 text-[11px] text-fg-subtle">{new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(th.last.created_at))}</span>}
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-fg-muted">{th.last?.body ?? th.program?.name}</span>
                  {th.unread > 0 && <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-fg">{th.unread}</span>}
                </span>
              </span>
            </Link>
          ))}
        </Card>
        {active ? (
          <div>
            <Link href="/messages" className="mb-2 inline-block text-sm font-semibold text-fg-muted lg:hidden">← {t("title")}</Link>
            <ChatRoom key={active.id} threadId={active.id} meId={user.id} initial={messages}
              title={active.student?.full_name ?? ""} subtitle={active.program?.name} />
          </div>
        ) : (
          <Card className="hidden place-items-center text-fg-muted lg:grid">{t("choose")}</Card>
        )}
      </div>
    </div>
  );
}
