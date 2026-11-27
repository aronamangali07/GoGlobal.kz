import { ManagedOffers } from "@/features/manage/managed-offers";
import { getManagedOffers } from "@/lib/data/offers";
import { requireStaffSession } from "@/lib/data/staff";

export default async function ManageOffersPage() {
  const { profile } = await requireStaffSession();
  const { offers, counts } = await getManagedOffers();
  return <ManagedOffers offers={offers} counts={counts} isAdmin={profile.role === "admin"} />;
}
