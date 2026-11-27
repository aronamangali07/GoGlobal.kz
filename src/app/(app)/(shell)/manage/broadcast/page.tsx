import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { BroadcastForm } from "@/features/broadcast/broadcast-form";
import { formatDate } from "@/features/offers/format";
import { getManagedPrograms } from "@/lib/data/offers";
import { requireStaffSession } from "@/lib/data/staff";

export default async function BroadcastPage() {
  const t = await getTranslations("broadcast");
  const { user, profile, supabase } = await requireStaffSession();
  const programs = await getManagedPrograms(user.id, profile.role === "admin");
  const { data: history } = await supabase.from("announcements").select("id, title, body, created_at, program:programs ( name )").order("created_at", { ascending: false }).limit(20);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="mt-1.5 text-fg-muted">{t("subtitle")}</p>
      </div>
      <Card><BroadcastForm programs={programs.map((p) => ({ id: p.id, name: p.name }))} canAll={profile.role === "admin"} /></Card>
      {!!history?.length && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">{t("history")}</h2>
          <ul className="flex flex-col gap-2.5">
            {history.map((a) => (
              <li key={a.id}><Card className="p-4">
                <p className="text-xs text-fg-subtle">{a.program?.name ?? t("allStudents")} · {formatDate(a.created_at)}</p>
                <p className="font-semibold">{a.title}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-fg-muted">{a.body}</p>
              </Card></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
