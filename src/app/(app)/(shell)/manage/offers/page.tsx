import { ManagedOffers } from "@/features/manage/managed-offers";
import { getManagedOffers } from "@/lib/data/offers";
import { requireStaffSession } from "@/lib/data/staff";

export default async function ManageOffersPage() {
  await requireStaffSession();
  const { offers, counts } = await getManagedOffers();
  return <ManagedOffers offers={offers} counts={counts} />;
}
