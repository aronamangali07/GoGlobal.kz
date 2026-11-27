import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "@/features/auth/auth-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.tabs");
  return { title: `${t("register")} · GoGlobal` };
}

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
