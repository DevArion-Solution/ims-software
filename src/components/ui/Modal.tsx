"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-[61] max-h-[92vh] w-full overflow-y-auto rounded-t-xl border border-[var(--ims-border)] bg-white shadow-xl sm:rounded-xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-[var(--ims-border)] bg-white px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--ims-text)]">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-[var(--ims-text-muted)]">{description}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" className="px-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--ims-text)]">{label}</span>
      {children}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--ims-text)]">{label}</span>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3 text-sm outline-none focus:border-[var(--ims-primary)] focus:ring-2 focus:ring-[var(--ims-primary-soft)]"
      >
        {children}
      </select>
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--ims-text)]">{label}</span>
      <textarea
        required={required}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--ims-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ims-primary)] focus:ring-2 focus:ring-[var(--ims-primary-soft)]"
      />
    </label>
  );
}
