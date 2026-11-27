import { AppShell } from "@/features/shell/app-shell";
import { getAvatarUrl, requireOnboardedSession } from "@/lib/data/session";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireOnboardedSession();
  const [avatarUrl, { count }] = await Promise.all([
    getAvatarUrl(profile.avatar_path),
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", profile.id).is("read_at", null),
  ]);
  return (
    <AppShell
      user={{
        id: profile.id,
        unread: count ?? 0,
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
