import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label ? (
        <span className="font-medium text-[var(--ims-text)]">{label}</span>
      ) : null}
      <input
        id={inputId}
        className={cn(
          "h-10 rounded-md border border-[var(--ims-border)] bg-white px-3 text-[var(--ims-text)] outline-none transition focus:border-[var(--ims-primary)] focus:ring-2 focus:ring-[var(--ims-primary-soft)] placeholder:text-[var(--ims-text-subtle)]",
          className,
        )}
        {...props}
      />
      {hint ? <span className="text-xs text-[var(--ims-text-muted)]">{hint}</span> : null}
    </label>
  );
}
