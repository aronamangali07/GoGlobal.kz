"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setProgramActive } from "./actions";

export function ProgramToggle({ id, active, labels }: { id: string; active: boolean; labels: { close: string; reopen: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant={active ? "ghost" : "secondary"} loading={pending}
      onClick={() => {
        if (active && !confirm(`${labels.close}? Студенты больше не смогут выбрать эту программу.`)) return;
        start(async () => {
          const r = await setProgramActive(id, !active);
          if (r.ok) { toast.success(active ? labels.close : labels.reopen); router.refresh(); }
        });
      }}>
      {active ? labels.close : labels.reopen}
    </Button>
  );
}
