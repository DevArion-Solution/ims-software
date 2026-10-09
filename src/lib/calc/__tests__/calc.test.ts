import { describe, expect, it } from "vitest";
import {
  applyPayment,
  attendancePercentage,
  computeExamMarks,
  computeLateFee,
  computePayrollLine,
  daysOverdue,
  deriveFeeStatus,
  feeLedgerReconcile,
  gradeFromPercentage,
  inclusiveDayCount,
  libraryOverdueFine,
  percent,
  rankByScore,
  roundMoney,
  unpaidLeaveDaysForMonth,
} from "@/lib/calc";

describe("roundMoney / percent", () => {
  it("rounds to 2 decimal places", () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(NaN)).toBe(0);
  });

  it("computes percentage with decimals", () => {
    expect(percent(75, 100, 1)).toBe(75);
    expect(percent(1, 0)).toBe(0);
  });
});

describe("daysOverdue / late fees", () => {
  it("returns 0 when not overdue", () => {
    expect(daysOverdue("2099-01-01", new Date("2026-10-01"))).toBe(0);
  });

  it("computes overdue days", () => {
    expect(daysOverdue("2026-10-01", new Date("2026-10-05"))).toBe(4);
  });

  it("computes library fine at Rs 10/day", () => {
    expect(libraryOverdueFine("2026-10-01", new Date("2026-10-04"))).toBe(30);
  });

  it("applies flat + per-day late fee after grace", () => {
    const fee = computeLateFee({
      baseAmount: 10000,
      dueDate: "2026-10-01",
      paid: 0,
      flatLateFee: 200,
      perDayLateFee: 50,
      graceDays: 2,
      onDate: new Date("2026-10-06"),
    });
    // 5 overdue days, 3 billable after grace → 200 + 50*3 = 350
    expect(fee).toBe(350);
  });
});

describe("payroll", () => {
  it("adds 10% allowance and 5% tax above 100k", () => {
    const line = computePayrollLine(120000);
    expect(line.allowances).toBe(12000);
    expect(line.deductions).toBe(6000);
    expect(line.taxDeduction).toBe(6000);
    expect(line.net).toBe(126000);
  });

  it("no tax below 100k basic", () => {
    const line = computePayrollLine(80000);
    expect(line.deductions).toBe(0);
    expect(line.net).toBe(88000);
  });

  it("deducts unpaid leave at basic/30 per day", () => {
    const line = computePayrollLine(90000, { unpaidLeaveDays: 3 });
    expect(line.leaveDeduction).toBe(9000);
    expect(line.deductions).toBe(9000);
    expect(line.net).toBe(90000); // 90k + 9k allow - 9k leave
  });

  it("counts unpaid leave days overlapping month", () => {
    const days = unpaidLeaveDaysForMonth(
      [
        {
          staffId: "st1",
          from: "2026-09-28",
          to: "2026-10-02",
          type: "unpaid",
          status: "approved",
        },
        {
          staffId: "st1",
          from: "2026-10-10",
          to: "2026-10-10",
          type: "casual",
          status: "approved",
        },
      ],
      "st1",
      "October 2026",
    );
    // Oct 1–2 from first leave = 2 days; casual ignored
    expect(days).toBe(2);
  });
});

describe("fee status & payments", () => {
  it("derives paid status", () => {
    expect(
      deriveFeeStatus({ netAmount: 5000, paid: 5000, dueDate: "2026-10-01" }),
    ).toBe("paid");
  });

  it("derives overdue when unpaid past due", () => {
    expect(
      deriveFeeStatus({
        netAmount: 5000,
        paid: 0,
        dueDate: "2026-01-01",
        onDate: new Date("2026-10-01"),
      }),
    ).toBe("overdue");
  });

  it("applyPayment caps at balance and returns change", () => {
    const r = applyPayment(5000, 2000, 5000);
    expect(r.applied).toBe(3000);
    expect(r.paid).toBe(5000);
    expect(r.change).toBe(2000);
  });
});

describe("exam marks & grades", () => {
  it("grades A+ at 90%+", () => {
    expect(gradeFromPercentage(92)).toBe("A+");
    expect(gradeFromPercentage(39)).toBe("F");
  });

  it("computes exam marks and pass at 40%", () => {
    const m = computeExamMarks(80, 100);
    expect(m.percentage).toBe(80);
    expect(m.grade).toBe("A");
    expect(m.passed).toBe(true);

    const fail = computeExamMarks(30, 100);
    expect(fail.passed).toBe(false);
  });
});

describe("attendance", () => {
  it("counts present+late as attended, excludes leave from denominator", () => {
    const stats = attendancePercentage([
      { status: "present" },
      { status: "present" },
      { status: "late" },
      { status: "absent" },
      { status: "leave" },
    ]);
    expect(stats.present).toBe(2);
    expect(stats.late).toBe(1);
    expect(stats.absent).toBe(1);
    expect(stats.counted).toBe(4);
    expect(stats.percentage).toBe(75);
  });
});

describe("rankByScore", () => {
  it("assigns ranks with ties", () => {
    const ranks = rankByScore([
      { id: "a", score: 90 },
      { id: "b", score: 90 },
      { id: "c", score: 80 },
    ]);
    expect(ranks.get("a")).toBe(1);
    expect(ranks.get("b")).toBe(1);
    expect(ranks.get("c")).toBe(3);
  });
});

describe("inclusiveDayCount", () => {
  it("same day counts as 1", () => {
    expect(inclusiveDayCount("2026-10-05", "2026-10-05")).toBe(1);
    expect(inclusiveDayCount("2026-10-05", "2026-10-07")).toBe(3);
  });
});

describe("feeLedgerReconcile", () => {
  it("matches when fee paid equals fee receipts", () => {
    const r = feeLedgerReconcile(
      [{ paid: 10000 }, { paid: 5000 }],
      [
        { type: "receipt", account: "Student Fee Income", amount: 10000 },
        { type: "receipt", account: "Student Fee Income", description: "Fee collection", amount: 5000 },
        { type: "payment", account: "Salaries", amount: 20000 },
      ],
    );
    expect(r.feeCollected).toBe(15000);
    expect(r.feeReceipts).toBe(15000);
    expect(r.gap).toBe(0);
    expect(r.matched).toBe(true);
  });

  it("reports gap when receipts missing", () => {
    const r = feeLedgerReconcile([{ paid: 8000 }], [
      { type: "receipt", account: "Donation", amount: 8000 },
    ]);
    expect(r.feeCollected).toBe(8000);
    expect(r.feeReceipts).toBe(0);
    expect(r.gap).toBe(8000);
    expect(r.matched).toBe(false);
  });
});
