/** Central IMS calculation engine — all money/percent/grade math lives here. */

export type Money = number;

export function roundMoney(value: number): Money {
  // PKR school fees are whole rupees; avoid float drift
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function safeDiv(numerator: number, denominator: number): number {
  if (!denominator || !Number.isFinite(denominator)) return 0;
  if (!Number.isFinite(numerator)) return 0;
  return numerator / denominator;
}

export function percent(part: number, whole: number, decimals = 1): number {
  if (whole <= 0) return 0;
  const raw = (part / whole) * 100;
  const factor = 10 ** decimals;
  return Math.round(raw * factor) / factor;
}

export function parseDateOnly(iso: string): Date {
  // Force local date-only comparison (avoid UTC off-by-one)
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayIso(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function sameMonth(isoDate: string, ref = new Date()): boolean {
  const d = parseDateOnly(isoDate);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function daysOverdue(dueDate: string, onDate = new Date()): number {
  const due = parseDateOnly(dueDate);
  const on = new Date(onDate.getFullYear(), onDate.getMonth(), onDate.getDate());
  const diff = on.getTime() - due.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / 86400000);
}

/** Inclusive calendar-day span (from–to). Same day = 1. */
export function inclusiveDayCount(fromIso: string, toIso: string): number {
  const from = parseDateOnly(fromIso);
  const to = parseDateOnly(toIso);
  const diff = Math.floor((to.getTime() - from.getTime()) / 86400000);
  return Math.max(0, diff) + 1;
}

/** Library overdue fine: Rs 10 per overdue day */
export function libraryOverdueFine(dueDate: string, onDate = new Date(), perDay = 10): number {
  return roundMoney(Math.max(0, daysOverdue(dueDate, onDate)) * perDay);
}

/** Payroll: allowances 10% of basic; tax 5% if basic > 100000; unpaid leave = basic/30 per day */
export function computePayrollLine(
  basicSalary: number,
  options: boolean | {
    withAllowances?: boolean;
    unpaidLeaveDays?: number;
    daysInMonth?: number;
    allowancesOverride?: number;
    extraDeductions?: number;
  } = true,
): {
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  taxDeduction: number;
  leaveDeduction: number;
  unpaidLeaveDays: number;
} {
  const opts =
    typeof options === "boolean"
      ? { withAllowances: options }
      : options;
  const withAllowances = opts.withAllowances !== false;
  const unpaidLeaveDays = Math.max(0, opts.unpaidLeaveDays ?? 0);
  const daysInMonth = Math.max(1, opts.daysInMonth ?? 30);
  const basic = roundMoney(Math.max(0, basicSalary));
  const allowances =
    opts.allowancesOverride !== undefined
      ? roundMoney(Math.max(0, opts.allowancesOverride))
      : withAllowances
        ? roundMoney(basic * 0.1)
        : 0;
  const taxDeduction = basic > 100000 ? roundMoney(basic * 0.05) : 0;
  const leaveDeduction = roundMoney((basic / daysInMonth) * unpaidLeaveDays);
  const extra = roundMoney(Math.max(0, opts.extraDeductions ?? 0));
  const deductions = roundMoney(taxDeduction + leaveDeduction + extra);
  const net = roundMoney(Math.max(0, basic + allowances - deductions));
  return {
    basic,
    allowances,
    deductions,
    net,
    taxDeduction,
    leaveDeduction,
    unpaidLeaveDays,
  };
}

/** Count inclusive calendar days of [from,to] that fall inside YYYY-MM */
export function daysOverlapMonth(fromIso: string, toIso: string, yyyyMm: string): number {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (!y || !m) return 0;
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0);
  const from = parseDateOnly(fromIso);
  const to = parseDateOnly(toIso);
  const start = from > monthStart ? from : monthStart;
  const end = to < monthEnd ? to : monthEnd;
  if (end < start) return 0;
  const toLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return inclusiveDayCount(toLocal(start), toLocal(end));
}

/** Approved unpaid leave days for a staff member in a payroll month label / ISO key */
export function unpaidLeaveDaysForMonth(
  leaves: {
    staffId: string;
    from: string;
    to: string;
    type: string;
    status: string;
  }[],
  staffId: string,
  monthLabelOrKey: string,
): number {
  const key = monthKey(monthLabelOrKey);
  let total = 0;
  for (const leave of leaves) {
    if (leave.staffId !== staffId) continue;
    if (leave.status !== "approved") continue;
    if (leave.type !== "unpaid") continue;
    total += daysOverlapMonth(leave.from, leave.to, key);
  }
  return total;
}

/** Staff attendance totals for a month (YYYY-MM or label) */
export function staffAttendanceMonthSummary(
  records: { staffId: string; date: string; status: string }[],
  staffId: string,
  monthLabelOrKey: string,
): { present: number; absent: number; late: number; leave: number; holiday: number } {
  const key = monthKey(monthLabelOrKey);
  const summary = { present: 0, absent: 0, late: 0, leave: 0, holiday: 0 };
  for (const r of records) {
    if (r.staffId !== staffId) continue;
    if (monthKey(r.date) !== key) continue;
    if (r.status === "present") summary.present += 1;
    else if (r.status === "absent") summary.absent += 1;
    else if (r.status === "late") summary.late += 1;
    else if (r.status === "leave") summary.leave += 1;
    else if (r.status === "holiday") summary.holiday += 1;
  }
  return summary;
}

/** Late fee: flat + per-day after grace, capped */
export function computeLateFee(params: {
  baseAmount: number;
  dueDate: string;
  paid: number;
  flatLateFee?: number;
  perDayLateFee?: number;
  graceDays?: number;
  maxLateFee?: number;
  onDate?: Date;
}): number {
  const balance = roundMoney(params.baseAmount - params.paid);
  if (balance <= 0) return 0;

  const overdueDays = daysOverdue(params.dueDate, params.onDate);
  const grace = params.graceDays ?? 0;
  if (overdueDays <= grace) return 0;

  const flat = params.flatLateFee ?? 0;
  const perDay = params.perDayLateFee ?? 0;
  const daysBillable = overdueDays - grace;
  const raw = flat + perDay * daysBillable;
  const capped = params.maxLateFee != null ? Math.min(raw, params.maxLateFee) : raw;
  return roundMoney(Math.max(0, capped));
}

export function computeFeeNet(params: {
  baseAmount: number;
  discount?: number;
  lateFee?: number;
}): { discount: number; lateFee: number; netAmount: number } {
  const base = roundMoney(params.baseAmount);
  const discount = roundMoney(clamp(params.discount ?? 0, 0, base));
  const lateFee = roundMoney(Math.max(0, params.lateFee ?? 0));
  const netAmount = roundMoney(Math.max(0, base - discount + lateFee));
  return { discount, lateFee, netAmount };
}

export function computeFeeBalance(netAmount: number, paid: number): number {
  return roundMoney(Math.max(0, netAmount - paid));
}

export type DerivedFeeStatus = "pending" | "partial" | "paid" | "overdue" | "waived";

export function deriveFeeStatus(params: {
  netAmount: number;
  paid: number;
  dueDate: string;
  waived?: boolean;
  onDate?: Date;
}): DerivedFeeStatus {
  if (params.waived) return "waived";
  const paid = roundMoney(params.paid);
  const net = roundMoney(params.netAmount);
  if (paid >= net && net > 0) return "paid";
  if (paid <= 0) {
    return daysOverdue(params.dueDate, params.onDate) > 0 ? "overdue" : "pending";
  }
  if (paid < net) {
    // partial but past due still overdue for collection priority
    return daysOverdue(params.dueDate, params.onDate) > 0 ? "overdue" : "partial";
  }
  return "pending";
}

export function applyPayment(netAmount: number, alreadyPaid: number, incoming: number): {
  paid: number;
  applied: number;
  change: number;
} {
  const net = roundMoney(netAmount);
  const prev = roundMoney(Math.max(0, alreadyPaid));
  const incomingSafe = roundMoney(Math.max(0, incoming));
  const due = Math.max(0, net - prev);
  const applied = Math.min(due, incomingSafe);
  const paid = roundMoney(prev + applied);
  const change = roundMoney(incomingSafe - applied);
  return { paid, applied, change };
}

/** Pakistan-style school grading */
export function gradeFromPercentage(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  if (pct >= 40) return "E";
  return "F";
}

export function computeExamMarks(obtained: number, total: number): {
  obtained: number;
  total: number;
  percentage: number;
  grade: string;
  passed: boolean;
} {
  const t = Math.max(0, roundMoney(total));
  const o = clamp(roundMoney(obtained), 0, t || obtained);
  const percentage = percent(o, t || 1, 2);
  const grade = gradeFromPercentage(percentage);
  return {
    obtained: o,
    total: t,
    percentage,
    grade,
    passed: percentage >= 40,
  };
}

export function classAverage(scores: number[]): number {
  return averageOf(scores, 2);
}

export function averageOf(values: number[], decimals = 2): number {
  if (!values.length) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  const factor = 10 ** decimals;
  return Math.round((sum / values.length) * factor) / factor;
}

export function rankByScore(scores: { id: string; score: number }[]): Map<string, number> {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const ranks = new Map<string, number>();
  let rank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].score < sorted[i - 1].score) {
      rank = i + 1;
    }
    ranks.set(sorted[i].id, rank);
  }
  return ranks;
}

/**
 * Attendance % rules:
 * - present + late count as attended
 * - leave & holiday excluded from denominator (authorized)
 * - absent counts against
 */
export function attendancePercentage(
  records: { status: string }[],
): { percentage: number; present: number; absent: number; late: number; leave: number; counted: number } {
  let present = 0;
  let absent = 0;
  let late = 0;
  let leave = 0;
  let holiday = 0;

  for (const r of records) {
    switch (r.status) {
      case "present":
        present += 1;
        break;
      case "absent":
        absent += 1;
        break;
      case "late":
        late += 1;
        break;
      case "leave":
        leave += 1;
        break;
      case "holiday":
        holiday += 1;
        break;
      default:
        break;
    }
  }

  const attended = present + late;
  const counted = present + late + absent; // exclude leave/holiday
  return {
    percentage: percent(attended, counted, 1),
    present,
    absent,
    late,
    leave: leave + holiday,
    counted,
  };
}

export function sumMoney(values: number[]): Money {
  return roundMoney(values.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0));
}

/** Fee collections vs ledger receipts posted to Student Fee Income (or fee-like accounts). */
export function feeLedgerReconcile(
  fees: Array<{ paid: number }>,
  vouchers: Array<{ type: string; account: string; description?: string; amount: number }>,
): { feeCollected: Money; feeReceipts: Money; gap: Money; matched: boolean } {
  const feeCollected = sumMoney(fees.map((f) => f.paid));
  const feeReceipts = sumMoney(
    vouchers
      .filter((v) => {
        if (v.type !== "receipt") return false;
        const hay = `${v.account} ${v.description ?? ""}`.toLowerCase();
        return hay.includes("fee");
      })
      .map((v) => v.amount),
  );
  const gap = roundMoney(feeCollected - feeReceipts);
  return { feeCollected, feeReceipts, gap, matched: Math.abs(gap) < 0.01 };
}

export function monthKey(isoOrLabel: string): string {
  // Accept ISO date or "April 2026"
  if (/^\d{4}-\d{2}/.test(isoOrLabel)) {
    return isoOrLabel.slice(0, 7);
  }
  const parsed = Date.parse(isoOrLabel);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return isoOrLabel;
}

export function currentMonthKey(ref = new Date()): string {
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
}

export function feeBelongsToMonth(fee: { month: string; dueDate: string }, key: string): boolean {
  if (monthKey(fee.dueDate) === key) return true;
  // also match label months roughly via dueDate primary
  const labelKey = monthKey(fee.month);
  return labelKey === key;
}
