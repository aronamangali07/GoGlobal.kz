import { cn } from "@/lib/utils";

export function Logo({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <defs>
          <linearGradient id="lg-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={mono ? "currentColor" : "var(--primary)"} />
            <stop offset="1" stopColor={mono ? "currentColor" : "var(--route)"} />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="14" fill="none" stroke="url(#lg-logo)" strokeWidth="2.2" />
        <path d="M4 18c6-6 18-6 24 0" fill="none" stroke="url(#lg-logo)" strokeWidth="1.6" opacity=".6" />
        <path d="M9 22c4-11 10-15 17-14" fill="none" stroke={mono ? "currentColor" : "var(--accent)"} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 4" />
        <path d="M26 8l-3.2 1.1 2 2.4z" fill={mono ? "currentColor" : "var(--accent)"} />
      </svg>
      <span>
        GoGlobal<span className="text-fg-subtle">.kz</span>
      </span>
    </span>
  );
}
