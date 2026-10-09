/** Billing helpers for Super Admin Phase 2 */

export function addDaysIso(fromIso: string, days: number): string {
  const d = new Date(`${fromIso.includes("T") ? fromIso : `${fromIso}T00:00:00.000Z`}`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(isoDate: string): number {
  const target = new Date(`${isoDate}T00:00:00.000Z`).getTime();
  const now = new Date(`${todayIso()}T00:00:00.000Z`).getTime();
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

export function periodLabel(billingCycle: "monthly" | "yearly", startIso: string): string {
  const start = startIso.slice(0, 10);
  const end = addDaysIso(start, billingCycle === "yearly" ? 365 : 30);
  return `${start} → ${end}`;
}

export function invoiceAmount(
  priceMonthly: number,
  priceYearly: number,
  billingCycle: "monthly" | "yearly",
): number {
  return billingCycle === "yearly" ? priceYearly : priceMonthly;
}

export function nextInvoiceId(existingIds: string[]): string {
  let max = 1000;
  for (const id of existingIds) {
    const m = /^INV-(\d+)$/i.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `INV-${max + 1}`;
}

/** Generate a readable temporary password for new school admins */
export function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "Ims!";
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}
