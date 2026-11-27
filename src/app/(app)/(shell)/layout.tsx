import { AppShell } from "@/features/shell/app-shell";
import { getAvatarUrl, requireOnboardedSession } from "@/lib/data/session";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireOnboardedSession();
  const avatarUrl = await getAvatarUrl(profile.avatar_path);
  return (
    <AppShell
      user={{
        name: profile.full_name || profile.email,
        email: profile.email,
        avatarUrl,
        role: profile.role,
      }}
    >
      {children}
    </AppShell>
  );
}
