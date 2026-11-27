import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-52 rounded-[28px]" />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
        <Skeleton className="h-72 rounded-[var(--radius-xl)]" />
        <Skeleton className="h-56 rounded-[var(--radius-xl)]" />
      </div>
    </div>
  );
}
