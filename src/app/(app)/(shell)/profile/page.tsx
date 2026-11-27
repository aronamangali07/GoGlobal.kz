import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import type { EnglishLevel, Preferences } from "@/features/profile/constants";
import { ProfileForm } from "@/features/profile/profile-form";
import { getActivePrograms, getAvatarUrl, getMyProgramIds, requireOnboardedSession } from "@/lib/data/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: `${t("title")} · GoGlobal` };
}

export default async function ProfilePage() {
  const t = await getTranslations("profile");
  const { profile, user } = await requireOnboardedSession();
  if (profile.role !== "student") redirect("/dashboard");
  const [programs, programIds, avatarUrl] = await Promise.all([
    getActivePrograms(),
    getMyProgramIds(user.id),
    getAvatarUrl(profile.avatar_path),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
      <p className="mb-6 mt-1.5 text-fg-muted">{t("subtitle")}</p>
      <ProfileForm
        programs={programs.map(({ id, name, tagline, color, icon }) => ({ id, name, tagline, color, icon }))}
        initial={{
          userId: user.id,
          email: profile.email,
          full_name: profile.full_name ?? "",
          birth_date: profile.birth_date ?? "",
          university: profile.university ?? "",
          english_level: (profile.english_level as EnglishLevel | null) ?? null,
          avatar_path: profile.avatar_path,
          avatar_url: avatarUrl,
          program_ids: programIds,
          preferences: (profile.preferences ?? {}) as Preferences,
          telegram_connected: !!profile.telegram_chat_id,
          telegram_username: profile.telegram_username,
        }}
      />
    </div>
  );
}
