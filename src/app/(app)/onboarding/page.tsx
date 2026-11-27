import { redirect } from "next/navigation";

// Онбординг — этап 3. Пока ведём в кабинет.
export default function OnboardingPage() {
  redirect("/dashboard");
}
