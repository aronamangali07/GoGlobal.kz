import { Soon } from "@/components/soon";
import { requireStaffSession } from "@/lib/data/staff";

export default async function Page() {
  await requireStaffSession();
  return <Soon stage="этап 5–6 — студенты и их этапы" />;
}
