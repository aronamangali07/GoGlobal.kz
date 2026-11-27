import { Baby, Briefcase, Globe, Sun, Tent, type LucideProps } from "lucide-react";

const ICONS = { sun: Sun, baby: Baby, briefcase: Briefcase, tent: Tent, globe: Globe } as const;

export function ProgramIcon({ name, ...props }: LucideProps & { name: string }) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? Globe;
  return <Icon {...props} />;
}
