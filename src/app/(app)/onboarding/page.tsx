import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import type { EnglishLevel, Preferences } from "@/features/profile/constants";
import { getActivePrograms, getAvatarUrl, getMyProgramIds, requireSession } from "@/lib/data/session";

export default async function OnboardingPage() {
  const { profile, user } = await requireSession();
  if (profile.role !== "student" || profile.onboarded_at) redirect("/dashboard");

  const [programs, programIds, avatarUrl] = await Promise.all([
    getActivePrograms(),
    getMyProgramIds(user.id),
    getAvatarUrl(profile.avatar_path),
  ]);

  return (
    <OnboardingWizard
      programs={programs.map(({ id, name, tagline, color, icon }) => ({ id, name, tagline, color, icon }))}
      initial={{
        userId: user.id,
        full_name: profile.full_name ?? "",
        birth_date: profile.birth_date ?? "",
        university: profile.university ?? "",
        english_level: (profile.english_level as EnglishLevel | null) ?? null,
        avatar_path: profile.avatar_path,
        avatar_url: avatarUrl,
        program_ids: programIds,
        preferences: (profile.preferences ?? {}) as Preferences,
      }}
    />
  );
}
