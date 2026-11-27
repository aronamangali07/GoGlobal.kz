import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/features/auth/auth-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.tabs");
  return { title: `${t("login")} · GoGlobal` };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return <AuthForm mode="login" initialError={error === "callback" ? "callback" : undefined} />;
}
