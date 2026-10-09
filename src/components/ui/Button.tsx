import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--ims-primary)] text-white hover:bg-[var(--ims-primary-hover)] shadow-sm",
  secondary:
    "bg-[var(--ims-surface-elevated)] text-[var(--ims-text)] border border-[var(--ims-border)] hover:bg-[var(--ims-muted)]",
  ghost: "text-[var(--ims-text-muted)] hover:bg-[var(--ims-muted)] hover:text-[var(--ims-text)]",
  danger: "bg-[var(--ims-danger)] text-white hover:opacity-90",
  outline:
    "border border-[var(--ims-primary)] text-[var(--ims-primary)] hover:bg-[var(--ims-primary-soft)]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
