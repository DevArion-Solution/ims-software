/** Class periods 1–8; 0 = whole-day / gate biometric */

export const CLASS_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const DAY_PERIOD = 0;

export function normalizePeriod(period?: number | null): number {
  if (period == null || Number.isNaN(Number(period))) return DAY_PERIOD;
  return Number(period);
}

export function periodLabel(period?: number | null): string {
  const p = normalizePeriod(period);
  return p === DAY_PERIOD ? "Day (gate)" : `Period ${p}`;
}

export function sameAttendanceSlot(
  a: { studentId: string; date: string; className?: string; period?: number | null },
  b: { studentId: string; date: string; className?: string; period?: number | null },
): boolean {
  return (
    a.studentId === b.studentId &&
    a.date === b.date &&
    (a.className ?? "") === (b.className ?? "") &&
    normalizePeriod(a.period) === normalizePeriod(b.period)
  );
}
