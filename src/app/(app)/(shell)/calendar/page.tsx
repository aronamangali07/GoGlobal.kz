import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CalendarView } from "@/features/calendar/calendar-view";
import { getMyEvents } from "@/lib/data/journey";
import { requireOnboardedSession } from "@/lib/data/session";
import { SITE_URL } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calendar");
  return { title: `${t("title")} · GoGlobal` };
}

export default async function CalendarPage() {
  const t = await getTranslations("calendar");
  const { user, profile } = await requireOnboardedSession();
  const events = await getMyEvents(user.id);
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
      <p className="mb-5 mt-1.5 text-fg-muted">{t("subtitle")}</p>
      <CalendarView
        feedUrl={`${SITE_URL}/api/calendar/${profile.calendar_token}.ics`}
        events={events.map((e) => ({ ...e, color: e.program?.color ?? "var(--primary)", program: e.program?.name ?? "" }))}
      />
    </div>
  );
}
