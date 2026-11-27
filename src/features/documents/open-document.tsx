"use client";

import { ExternalLink } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { documentUrl } from "./actions";

export function OpenDocument({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      loading={pending}
      onClick={() =>
        start(async () => {
          // окно открываем сразу (иначе браузер заблокирует попап), адрес подставим после
          const w = window.open("", "_blank");
          const url = await documentUrl(id);
          if (url && w) w.location.href = url;
          else w?.close();
        })
      }
    >
      <ExternalLink className="size-4" aria-hidden /> {label}
    </Button>
  );
}
