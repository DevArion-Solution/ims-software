import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "accent";
}) {
  const tones = {
    default: "text-[var(--ims-primary)] bg-[var(--ims-primary-soft)]",
    success: "text-emerald-700 bg-emerald-50",
    warning: "text-amber-700 bg-amber-50",
    accent: "text-[var(--ims-accent)] bg-[var(--ims-accent-soft)]",
  };

  return (
    <div className="rounded-lg border border-[var(--ims-border)] bg-[var(--ims-surface)] p-4 shadow-[var(--ims-shadow-sm)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--ims-text-muted)]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--ims-text)]">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-[var(--ims-text-muted)]">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <div className={cn("rounded-md p-2", tones[tone])}>{icon}</div>
        ) : null}
      </div>
    </div>
  );
}
