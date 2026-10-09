import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  daysUntil,
  generateTempPassword,
  invoiceAmount,
  nextInvoiceId,
  periodLabel,
} from "@/lib/platform/billing";

describe("platform billing helpers", () => {
  it("addDaysIso advances calendar days", () => {
    expect(addDaysIso("2026-10-01", 30)).toBe("2026-10-31");
  });

  it("daysUntil returns signed day diff", () => {
    const future = addDaysIso(new Date().toISOString().slice(0, 10), 10);
    expect(daysUntil(future)).toBeGreaterThanOrEqual(9);
  });

  it("periodLabel for monthly vs yearly", () => {
    expect(periodLabel("monthly", "2026-10-01")).toContain("2026-10-01");
    expect(periodLabel("yearly", "2026-01-01")).toContain("2027");
  });

  it("invoiceAmount picks cycle price", () => {
    expect(invoiceAmount(5000, 50000, "monthly")).toBe(5000);
    expect(invoiceAmount(5000, 50000, "yearly")).toBe(50000);
  });

  it("nextInvoiceId increments from existing", () => {
    expect(nextInvoiceId(["INV-1005", "INV-1002"])).toBe("INV-1006");
    expect(nextInvoiceId([])).toBe("INV-1001");
  });

  it("generateTempPassword has prefix and length", () => {
    const pwd = generateTempPassword();
    expect(pwd.startsWith("Ims!")).toBe(true);
    expect(pwd.length).toBeGreaterThanOrEqual(12);
  });
});
