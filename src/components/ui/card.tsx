import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-soft)]",
        className,
      )}
      {...props}
    />
  );
}
