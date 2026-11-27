import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { label, error, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const tid = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={tid} className="text-sm font-medium">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={tid}
        aria-invalid={error ? true : undefined}
        className={cn(
          "min-h-24 rounded-[var(--radius-md)] border bg-surface px-3.5 py-3 text-[16px] outline-none placeholder:text-fg-subtle",
          "transition-[border-color,box-shadow] focus:border-primary focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_18%,transparent)]",
          error ? "border-danger" : "border-border-strong",
          className,
        )}
        {...props}
      />
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
});
