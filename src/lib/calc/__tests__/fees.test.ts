import { describe, expect, it } from "vitest";
import {
  buildFeeInvoice,
  collectAgainstFee,
  feeTotals,
  refreshFeeLedger,
} from "@/lib/calc/fees";
import type { FeeInvoice } from "@/types";

describe("buildFeeInvoice", () => {
  it("builds net amount with discount and late fee", () => {
    const fee = buildFeeInvoice({
      id: "f1",
      studentId: "s1",
      studentName: "Ahmed",
      className: "Class 8-A",
      month: "October 2026",
      baseAmount: 15000,
      discount: 1000,
      dueDate: "2026-01-01",
      applyLateFee: false,
    });
    expect(fee.amount).toBe(14000);
    expect(fee.paid).toBe(0);
    expect(fee.status).toBe("overdue");
  });
});

describe("collectAgainstFee", () => {
  it("applies partial payment and updates status", () => {
    const base: FeeInvoice = buildFeeInvoice({
      id: "f2",
      studentId: "s1",
      studentName: "Ahmed",
      className: "Class 8-A",
      month: "October 2026",
      baseAmount: 10000,
      dueDate: "2099-12-31",
      applyLateFee: false,
    });
    const { fee, applied } = collectAgainstFee(base, 4000);
    expect(applied).toBe(4000);
    expect(fee.paid).toBe(4000);
    expect(fee.status).toBe("partial");
  });

  it("marks paid when full amount collected", () => {
    const base: FeeInvoice = buildFeeInvoice({
      id: "f3",
      studentId: "s1",
      studentName: "Ahmed",
      className: "Class 8-A",
      month: "October 2026",
      baseAmount: 5000,
      dueDate: "2099-12-31",
      applyLateFee: false,
    });
    const { fee } = collectAgainstFee(base, 5000);
    expect(fee.status).toBe("paid");
  });
});

describe("refreshFeeLedger", () => {
  it("recalculates late fee on open invoices", () => {
    const fees: FeeInvoice[] = [
      {
        id: "f4",
        studentId: "s1",
        studentName: "Ahmed",
        className: "8-A",
        month: "Oct",
        baseAmount: 10000,
        discount: 0,
        lateFee: 0,
        amount: 10000,
        paid: 0,
        status: "pending",
        dueDate: "2026-01-01",
      },
    ];
    const refreshed = refreshFeeLedger(fees, {
      flatLateFee: 200,
      perDayLateFee: 50,
      graceDays: 0,
      maxLateFee: 2000,
    });
    expect(refreshed[0]!.lateFee).toBeGreaterThan(0);
    expect(refreshed[0]!.amount).toBeGreaterThan(10000);
  });

  it("skips paid and waived invoices", () => {
    const paid: FeeInvoice = buildFeeInvoice({
      id: "f5",
      studentId: "s1",
      studentName: "Ahmed",
      className: "8-A",
      month: "Oct",
      baseAmount: 5000,
      dueDate: "2099-01-01",
      paid: 5000,
      applyLateFee: false,
    });
    const refreshed = refreshFeeLedger([paid]);
    expect(refreshed[0]!.status).toBe("paid");
  });
});

describe("feeTotals", () => {
  it("aggregates collected and pending", () => {
    const fees: FeeInvoice[] = [
      buildFeeInvoice({
        id: "a",
        studentId: "s1",
        studentName: "A",
        className: "8-A",
        month: "October 2026",
        baseAmount: 10000,
        dueDate: "2026-10-15",
        paid: 10000,
        applyLateFee: false,
      }),
      buildFeeInvoice({
        id: "b",
        studentId: "s2",
        studentName: "B",
        className: "8-A",
        month: "October 2026",
        baseAmount: 8000,
        dueDate: "2026-10-15",
        paid: 2000,
        applyLateFee: false,
      }),
    ];
    const totals = feeTotals(fees, new Date("2026-10-05"));
    expect(totals.collectedAll).toBe(12000);
    expect(totals.pendingAll).toBe(6000);
  });
});
