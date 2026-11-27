import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOut } from "@/features/auth/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// Временная страница: настоящий кабинет появится на этапах 3–6.
export default async function DashboardPage() {
  const t = await getTranslations();
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>
      <Card className="mt-10">
        <h1 className="font-display text-2xl font-semibold">{t("dashboard.greeting")}</h1>
        <p className="mt-2 text-fg-muted">{t("dashboard.signedInAs", { email: data.user.email ?? "" })}</p>
        <p className="mt-4 text-sm text-fg-subtle">{t("dashboard.nextStage")}</p>
        <form action={signOut} className="mt-6">
          <button className="text-sm font-semibold text-primary hover:underline">{t("common.signOut")}</button>
        </form>
      </Card>
    </main>
  );
}
