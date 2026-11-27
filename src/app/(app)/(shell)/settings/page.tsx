import { Bell, Send } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { NotificationPrefs } from "@/features/settings/notification-prefs";
import { TelegramConnect } from "@/features/telegram/telegram-connect";
import { InstallCard } from "@/features/pwa/pwa";
import { Smartphone } from "lucide-react";
import { requireOnboardedSession } from "@/lib/data/session";
import { CATEGORIES, type Prefs } from "@/lib/notify/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: `${t("title")} · GoGlobal` };
}

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const tt = await getTranslations("telegram");
  const { profile } = await requireOnboardedSession();
  const categories = CATEGORIES.filter((c) => (profile.role === "student" ? c !== "staff" : true));
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-fg-muted">{t("subtitle")}</p>
      </div>
      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><Send className="size-5 text-[#229ED9]" aria-hidden /> {tt("title")}</h2>
        <TelegramConnect initial={{ connected: !!profile.telegram_chat_id, username: profile.telegram_username }} />
      </Card>
      <Card>
        <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold"><Smartphone className="size-5 text-route" aria-hidden /> {(await getTranslations("pwa"))("settingsTitle")}</h2>
        <InstallCard />
      </Card>
      <Card>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Bell className="size-5 text-primary" aria-hidden /> {t("notifTitle")}</h2>
        <p className="mb-4 mt-1 text-sm text-fg-muted">{t("notifText")}</p>
        <NotificationPrefs initial={(profile.notification_prefs ?? {}) as Prefs} categories={[...categories]} telegramLinked={!!profile.telegram_chat_id} />
      </Card>
    </div>
  );
}
