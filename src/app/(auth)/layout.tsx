import { AuthHero } from "@/features/auth/auth-hero";
import { AuthPanel } from "@/features/auth/auth-panel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-dvh lg:grid lg:grid-cols-[1.15fr_1fr]">
      <AuthHero />
      <AuthPanel>{children}</AuthPanel>
    </main>
  );
}
