import { AdminTabs } from "@/features/admin/admin-tabs";
import { requireAdminSession } from "@/lib/data/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminSession();
  return (
    <div className="mx-auto max-w-5xl">
      <AdminTabs />
      {children}
    </div>
  );
}
