import type { FeeInvoice, FeeStatus, AcademicClass, Student, ExamResult, FeePolicy } from "@/types";
import {
  applyPayment,
  attendancePercentage,
  computeExamMarks,
  computeFeeBalance,
  computeFeeNet,
  computeLateFee,
  currentMonthKey,
  deriveFeeStatus,
  feeBelongsToMonth,
  roundMoney,
  sumMoney,
  todayIso,
} from "@/lib/calc";

export const FEE_POLICY: FeePolicy = {
  flatLateFee: 200,
  perDayLateFee: 50,
  graceDays: 0,
  maxLateFee: 2000,
};

export function resolveFeePolicy(policy?: Partial<FeePolicy> | null): FeePolicy {
  return {
    flatLateFee: policy?.flatLateFee ?? FEE_POLICY.flatLateFee,
    perDayLateFee: policy?.perDayLateFee ?? FEE_POLICY.perDayLateFee,
    graceDays: policy?.graceDays ?? FEE_POLICY.graceDays,
    maxLateFee: policy?.maxLateFee ?? FEE_POLICY.maxLateFee,
  };
}

/** Normalize legacy fee rows missing base/discount/lateFee */
export function normalizeFee(raw: Partial<FeeInvoice> & { amount: number; paid: number; dueDate: string }): FeeInvoice {
  const baseAmount = roundMoney(raw.baseAmount ?? raw.amount ?? 0);
  const discount = roundMoney(raw.discount ?? 0);
  const lateFee = roundMoney(raw.lateFee ?? 0);
  const { netAmount } = computeFeeNet({ baseAmount, discount, lateFee });
  const paid = roundMoney(raw.paid ?? 0);
  const status = (raw.status as FeeStatus) || deriveFeeStatus({
    netAmount,
    paid,
    dueDate: raw.dueDate,
  });

  return {
    id: raw.id || "unknown",
    studentId: raw.studentId || "",
    studentName: raw.studentName || "",
    className: raw.className || "",
    month: raw.month || "",
    baseAmount,
    discount,
    lateFee,
    amount: netAmount,
    paid,
    status,
    dueDate: raw.dueDate,
    remarks: raw.remarks,
    feeHead: raw.feeHead,
  };
}

export function buildFeeInvoice(input: {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  month: string;
  baseAmount: number;
  discount?: number;
  dueDate: string;
  paid?: number;
  feeHead?: string;
  remarks?: string;
  applyLateFee?: boolean;
  policy?: Partial<FeePolicy> | null;
}): FeeInvoice {
  const policy = resolveFeePolicy(input.policy);
  const lateFee = input.applyLateFee === false
    ? 0
    : computeLateFee({
        baseAmount: input.baseAmount,
        dueDate: input.dueDate,
        paid: input.paid ?? 0,
        ...policy,
      });

  const { discount, lateFee: lf, netAmount } = computeFeeNet({
    baseAmount: input.baseAmount,
    discount: input.discount ?? 0,
    lateFee,
  });

  const paid = roundMoney(input.paid ?? 0);
  return {
    id: input.id,
    studentId: input.studentId,
    studentName: input.studentName,
    className: input.className,
    month: input.month,
    baseAmount: roundMoney(input.baseAmount),
    discount,
    lateFee: lf,
    amount: netAmount,
    paid,
    status: deriveFeeStatus({ netAmount, paid, dueDate: input.dueDate }),
    dueDate: input.dueDate,
    feeHead: input.feeHead ?? "Monthly Tuition",
    remarks: input.remarks,
  };
}

/** Refresh late fees + status for all open invoices */
export function refreshFeeLedger(
  fees: FeeInvoice[],
  policy?: Partial<FeePolicy> | null,
): FeeInvoice[] {
  const resolved = resolveFeePolicy(policy);
  return fees.map((f) => {
    if (f.status === "waived" || f.status === "paid") {
      return normalizeFee(f);
    }
    const lateFee = computeLateFee({
      baseAmount: f.baseAmount,
      dueDate: f.dueDate,
      paid: f.paid,
      ...resolved,
    });
    const { discount, lateFee: lf, netAmount } = computeFeeNet({
      baseAmount: f.baseAmount,
      discount: f.discount,
      lateFee,
    });
    const paid = Math.min(roundMoney(f.paid), netAmount);
    return {
      ...f,
      discount,
      lateFee: lf,
      amount: netAmount,
      paid,
      status: deriveFeeStatus({ netAmount, paid, dueDate: f.dueDate }),
    };
  });
}

export function collectAgainstFee(
  fee: FeeInvoice,
  incoming: number,
  policy?: Partial<FeePolicy> | null,
): {
  fee: FeeInvoice;
  applied: number;
  change: number;
} {
  const refreshed = refreshFeeLedger([fee], policy)[0];
  const { paid, applied, change } = applyPayment(refreshed.amount, refreshed.paid, incoming);
  const next: FeeInvoice = {
    ...refreshed,
    paid,
    status: deriveFeeStatus({
      netAmount: refreshed.amount,
      paid,
      dueDate: refreshed.dueDate,
    }),
  };
  return { fee: next, applied, change };
}

export function feeTotals(fees: FeeInvoice[], ref = new Date()) {
  const monthKey = currentMonthKey(ref);
  const monthFees = fees.filter((f) => feeBelongsToMonth(f, monthKey));
  const collectedMonth = sumMoney(monthFees.map((f) => f.paid));
  const pendingMonth = sumMoney(monthFees.map((f) => computeFeeBalance(f.amount, f.paid)));
  const collectedAll = sumMoney(fees.map((f) => f.paid));
  const pendingAll = sumMoney(fees.map((f) => computeFeeBalance(f.amount, f.paid)));
  const overdueAll = sumMoney(
    fees
      .filter((f) => f.status === "overdue")
      .map((f) => computeFeeBalance(f.amount, f.paid)),
  );
  return {
    collectedMonth,
    pendingMonth,
    collectedAll,
    pendingAll,
    overdueAll,
    billedMonth: sumMoney(monthFees.map((f) => f.amount)),
    billedAll: sumMoney(fees.map((f) => f.amount)),
  };
}

export function syncClassEnrolled(classes: AcademicClass[], students: Student[]): AcademicClass[] {
  return classes.map((c) => {
    const enrolled = students.filter(
      (s) =>
        s.status === "active" &&
        s.className === c.name &&
        s.section === c.section,
    ).length;
    return { ...c, enrolled };
  });
}

export function syncHostelOccupancy(
  rooms: { id: string; capacity: number; occupied: number; status: string; [k: string]: unknown }[],
  allotments: { roomId: string; status: string }[],
) {
  return rooms.map((room) => {
    const occupied = allotments.filter(
      (a) => a.roomId === room.id && a.status === "active",
    ).length;
    const status =
      room.status === "maintenance"
        ? "maintenance"
        : occupied >= room.capacity
          ? "full"
          : "available";
    return { ...room, occupied, status };
  });
}

export function buildExamResult(input: {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  className: string;
  subject: string;
  obtained: number;
  total: number;
}): ExamResult {
  const marks = computeExamMarks(input.obtained, input.total);
  return {
    id: input.id,
    examId: input.examId,
    studentId: input.studentId,
    studentName: input.studentName,
    className: input.className,
    subject: input.subject,
    obtained: marks.obtained,
    total: marks.total,
    percentage: marks.percentage,
    grade: marks.grade,
    passed: marks.passed,
  };
}

export function todayAttendanceStats(records: { date: string; status: string }[]) {
  const today = todayIso();
  const todayRecords = records.filter((r) => r.date === today);
  const stats = attendancePercentage(todayRecords);
  return {
    ...stats,
    date: today,
    hasTodayData: todayRecords.length > 0,
  };
}
