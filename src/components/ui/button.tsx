"use client";
import { motion, type HTMLMotionProps } from "motion/react";
import { Loader2 } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-primary text-primary-fg shadow-[0_8px_24px_-10px_var(--primary)] hover:bg-primary-hover",
  secondary: "bg-surface-2 text-fg hover:bg-surface-3",
  outline: "border border-border-strong bg-transparent text-fg hover:bg-surface-2",
  ghost: "bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg",
  accent: "bg-accent text-white shadow-[0_8px_24px_-10px_var(--accent)] hover:brightness-105",
  danger: "bg-danger text-white hover:brightness-105",
} as const;

const sizes = {
  sm: "h-9 px-3.5 text-sm rounded-[var(--radius-md)] gap-1.5",
  md: "h-11 px-5 text-[15px] rounded-[var(--radius-md)] gap-2",
  lg: "h-13 px-6 text-base rounded-[var(--radius-lg)] gap-2.5",
  icon: "h-10 w-10 rounded-full",
} as const;

export type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  children?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      whileHover={disabled || loading ? undefined : { y: -1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex select-none items-center justify-center font-semibold whitespace-nowrap",
        "transition-[background-color,color,box-shadow,filter] duration-200",
        "disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </motion.button>
  );
});
