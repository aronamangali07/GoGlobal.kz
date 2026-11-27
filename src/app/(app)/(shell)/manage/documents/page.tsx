import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { OpenDocument } from "@/features/documents/open-document";
import { formatDate } from "@/features/offers/format";
import { DocReview } from "@/features/students/student-tools";
import { requireStaffSession } from "@/lib/data/staff";

export default async function ManageDocumentsPage() {
  const t = await getTranslations("manageDocs");
  const td = await getTranslations("documents");
  const { supabase } = await requireStaffSession();
  const { data: docs } = await supabase
    .from("documents")
    .select("id, status, file_name, created_at, user_id, type:document_types ( name ), program:programs ( name, color ), student:profiles!documents_user_id_fkey ( full_name )")
    .eq("status", "pending")
    .order("created_at");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
      <p className="mb-5 mt-1.5 text-fg-muted">{t("subtitle")}</p>
      {docs?.length ? (
        <ul className="flex flex-col gap-2.5">
          {docs.map((d) => (
            <li key={d.id}>
              <Card className="p-4">
                <p className="text-xs font-semibold" style={{ color: d.program?.color }}>{d.program?.name}</p>
                <p className="font-semibold">{d.type?.name}</p>
                <p className="text-sm text-fg-muted">
                  <Link href={`/manage/students/${d.user_id}`} className="font-medium text-fg hover:underline">{d.student?.full_name}</Link>
                  {" · "}{formatDate(d.created_at)}
                </p>
                <p className="truncate text-xs text-fg-subtle">{d.file_name}</p>
                <div className="flex flex-wrap items-start gap-2">
                  <div className="mt-3"><OpenDocument id={d.id} label={td("view")} /></div>
                  <DocReview documentId={d.id} status={d.status} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="py-10 text-center text-fg-muted">{t("empty")}</Card>
      )}
    </div>
  );
}
