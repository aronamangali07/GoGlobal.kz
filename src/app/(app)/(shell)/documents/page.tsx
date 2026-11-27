import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { DocumentChecklist } from "@/features/documents/document-checklist";
import { ProgramTabs } from "@/features/shell/program-tabs";
import { getMyEnrollments } from "@/lib/data/journey";
import { requireOnboardedSession } from "@/lib/data/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("documents");
  return { title: `${t("title")} · GoGlobal` };
}

export default async function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  const t = await getTranslations("documents");
  const { user, profile, supabase } = await requireOnboardedSession();
  if (profile.role !== "student") redirect("/manage/documents");
  const { p } = await searchParams;
  const enrollments = await getMyEnrollments(user.id);
  const programs = enrollments.map((e) => e.program!);
  const active = programs.find((x) => x.id === p) ?? programs[0];
  if (!active) redirect("/journey");

  const [{ data: types }, { data: docs }] = await Promise.all([
    supabase.from("document_types").select("id, name, description, required, sort").eq("program_id", active.id).order("sort"),
    supabase.from("documents").select("id, document_type_id, status, reviewer_comment, file_name").eq("user_id", user.id).eq("program_id", active.id),
  ]);
  const byType = Object.fromEntries((docs ?? []).map((d) => [d.document_type_id, d]));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
      <p className="mb-5 mt-1.5 text-fg-muted">{t("subtitle")}</p>
      <ProgramTabs base="/documents" programs={programs} active={active.id} />
      <DocumentChecklist
        userId={user.id}
        items={(types ?? []).map((ty) => {
          const d = byType[ty.id];
          return {
            typeId: ty.id, name: ty.name, description: ty.description, required: ty.required,
            doc: d ? { id: d.id, status: d.status, comment: d.reviewer_comment, fileName: d.file_name } : null,
          };
        })}
      />
    </div>
  );
}
