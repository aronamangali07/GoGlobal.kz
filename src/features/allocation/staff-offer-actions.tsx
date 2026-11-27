import { ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function StaffOfferActions({ offerId, applicants, label }: { offerId: string; applicants: number; label: string }) {
  return (
    <Link href={`/manage/offers/${offerId}/applications`}>
      <Button size="lg" className="w-full">
        <Users className="size-[18px]" aria-hidden /> {label} · {applicants} <ArrowRight className="size-[18px]" aria-hidden />
      </Button>
    </Link>
  );
}
