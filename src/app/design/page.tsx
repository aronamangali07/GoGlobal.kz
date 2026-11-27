import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DesignShowcase } from "./design-showcase";

export default async function DesignPage() {
  const t = await getTranslations("design");
  return (
    <main className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo />
        <ThemeToggle />
      </header>
      <h1 className="mt-10 font-display text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-2 text-fg-muted">{t("subtitle")}</p>
      <DesignShowcase />
    </main>
  );
}
