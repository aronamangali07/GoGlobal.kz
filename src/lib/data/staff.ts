import "server-only";
import { redirect } from "next/navigation";
import { requireOnboardedSession } from "./session";

/** Только менеджер или админ. */
export async function requireStaffSession() {
  const session = await requireOnboardedSession();
  if (session.profile.role === "student") redirect("/dashboard");
  return session;
}
