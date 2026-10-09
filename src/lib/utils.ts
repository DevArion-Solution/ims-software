import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(
  amount: number,
  symbol = "Rs",
  locale = "en-PK",
): string {
  const safe = Math.round((Number.isFinite(amount) ? amount : 0) * 100) / 100;
  return `${symbol} ${safe.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(value: number, decimals = 1): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toFixed(decimals)}%`;
}

export function formatDate(date: string, locale = "en-GB"): string {
  return new Date(date).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function statusTone(
  status: string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  const map: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
    active: "success",
    paid: "success",
    approved: "success",
    enrolled: "success",
    present: "success",
    trial: "info",
    due: "warning",
    partial: "warning",
    pending: "warning",
    under_review: "warning",
    applied: "info",
    inquiry: "info",
    late: "warning",
    overdue: "danger",
    rejected: "danger",
    absent: "danger",
    expelled: "danger",
    suspended: "danger",
    expired: "danger",
    inactive: "neutral",
    transferred: "neutral",
    alumni: "neutral",
    withdrawn: "neutral",
    waived: "neutral",
    void: "neutral",
  };
  return map[status] ?? "neutral";
}

export function labelize(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
