import { getTranslations } from "next-intl/server";
import { StudentList, type StudentRow } from "@/features/students/student-list";
import { getManagedStudents } from "@/lib/data/students";
import { requireStaffSession } from "@/lib/data/staff";

export default async function StudentsPage() {
  const t = await getTranslations("students");
  await requireStaffSession();
  const { enrollments, pending } = await getManagedStudents();
  const byStudent = new Map<string, StudentRow>();
  for (const e of enrollments) {
    const s = e.student!;
    const row = byStudent.get(s.id) ?? { id: s.id, name: s.full_name ?? s.email, email: s.email, english: s.english_level, programs: [], pendingDocs: pending[s.id] ?? 0 };
    row.programs.push({ id: e.program_id, name: e.program!.name, color: e.program!.color, icon: e.program!.icon, stage: e.current_stage });
    byStudent.set(s.id, row);
  }
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
      <p className="mb-5 mt-1.5 text-fg-muted">{t("subtitle")}</p>
      <StudentList students={[...byStudent.values()]} />
    </div>
  );
}
