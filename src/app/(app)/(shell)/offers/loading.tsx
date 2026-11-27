import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      <Skeleton className="mt-5 h-12 w-full rounded-2xl" />
      <div className="mt-3 flex gap-2">
        {[80, 130, 110, 140].map((w) => (
          <Skeleton key={w} className="h-9 rounded-full" style={{ width: w }} />
        ))}
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface">
            <Skeleton className="h-24 rounded-none" />
            <div className="flex flex-col gap-2.5 p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-1.5">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="mt-3 h-2 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
