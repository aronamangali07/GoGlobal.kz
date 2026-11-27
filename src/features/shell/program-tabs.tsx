import Link from "next/link";
import { ProgramIcon } from "@/components/ui/program-icon";
import { cn } from "@/lib/utils";

/** Переключатель программ через ?p=<id> — для страниц «Документы», «Оплаты», «Сообщения». */
export function ProgramTabs({ base, programs, active }: { base: string; programs: { id: string; name: string; icon: string; color: string }[]; active: string }) {
  if (programs.length < 2) return null;
  return (
    <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {programs.map((p) => (
        <Link key={p.id} href={`${base}?p=${p.id}`} style={{ ["--pc" as string]: p.color }}
          className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
            p.id === active ? "border-[var(--pc)] bg-[color-mix(in_oklab,var(--pc)_12%,var(--surface))] text-fg" : "border-border-strong text-fg-muted")}>
          <ProgramIcon name={p.icon} className="size-4 text-[var(--pc)]" aria-hidden /> {p.name}
        </Link>
      ))}
    </div>
  );
}
