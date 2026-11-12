/** Offline attendance drafts for teacher PWA (localStorage) */

export interface OfflineAttendanceMark {
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  date: string;
  status: "present" | "absent" | "late" | "leave" | "holiday";
  remarks?: string;
  period?: number;
  subject?: string;
  queuedAt: string;
}

const KEY = "ims.offline.attendance";
const CHANGE_EVENT = "ims:offline-attendance-change";

export function loadOfflineAttendance(): OfflineAttendanceMark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OfflineAttendanceMark[]) : [];
  } catch {
    return [];
  }
}

export function getOfflineAttendanceCount(): number {
  return loadOfflineAttendance().length;
}

export function subscribeOfflineAttendance(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function notifyOfflineAttendanceChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveOfflineAttendance(marks: OfflineAttendanceMark[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(marks.slice(0, 500)));
  notifyOfflineAttendanceChange();
}

export function queueOfflineAttendance(mark: Omit<OfflineAttendanceMark, "queuedAt">) {
  const list = loadOfflineAttendance();
  const period = mark.period ?? 0;
  const without = list.filter(
    (m) =>
      !(
        m.studentId === mark.studentId &&
        m.date === mark.date &&
        (m.period ?? 0) === period
      ),
  );
  without.unshift({ ...mark, period, queuedAt: new Date().toISOString() });
  saveOfflineAttendance(without);
}

export function clearOfflineAttendance() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  notifyOfflineAttendanceChange();
}

export async function syncOfflineAttendance(): Promise<{
  ok: boolean;
  applied?: number;
  error?: string;
}> {
  const marks = loadOfflineAttendance();
  if (!marks.length) return { ok: true, applied: 0 };
  try {
    const res = await fetch("/api/attendance/sync", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        marks: marks.map(({ queuedAt: _q, ...rest }) => rest),
      }),
    });
    const json = (await res.json()) as { ok?: boolean; applied?: number; error?: string };
    if (!res.ok) return { ok: false, error: json.error ?? "Sync failed" };
    clearOfflineAttendance();
    return { ok: true, applied: json.applied ?? marks.length };
  } catch {
    return { ok: false, error: "Network unavailable — drafts kept offline" };
  }
}
