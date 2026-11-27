import { getTranslations } from "next-intl/server";
import { UserTable } from "@/features/admin/user-table";
import { requireAdminSession } from "@/lib/data/admin";

export default async function AdminUsersPage() {
  const t = await getTranslations("admin.users");
  const { supabase, user } = await requireAdminSession();
  const [{ data: profiles }, { data: managers }, { data: programs }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, created_at").order("role").order("created_at"),
    supabase.from("program_managers").select("user_id, program_id"),
    supabase.from("programs").select("id, name, color, icon").order("sort"),
  ]);
  return (
    <div>
      <h1 className="font-display text-[26px] font-semibold sm:text-3xl">{t("title")}</h1>
      <p className="mb-5 mt-1.5 text-fg-muted">{t("subtitle")}</p>
      <UserTable
        meId={user.id}
        programs={programs ?? []}
        users={(profiles ?? []).map((p) => ({
          id: p.id, name: p.full_name || p.email, email: p.email, role: p.role, createdAt: p.created_at,
          programIds: (managers ?? []).filter((m) => m.user_id === p.id).map((m) => m.program_id),
        }))}
      />
    </div>
  );
}
