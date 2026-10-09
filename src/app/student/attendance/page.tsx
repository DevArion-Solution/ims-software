"use client";

import { useMemo } from "react";
import { PortalShell, STUDENT_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { studentScope } from "@/lib/portal/scope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { periodLabel } from "@/lib/attendance/periods";
import { formatDate, labelize } from "@/lib/utils";

function dayHighlightStatus(statuses: string[]): string | undefined {
  if (!statuses.length) return undefined;
  if (statuses.includes("absent")) return "absent";
  if (statuses.includes("leave")) return "leave";
  if (statuses.includes("late")) return "late";
  if (statuses.includes("present")) return "present";
  return statuses[0];
}

export default function StudentAttendancePage() {
  const { session } = useAuth();
  const { data } = useData();
  const scope = studentScope(data, session?.linkedStudentId);
  const rows = useMemo(
    () =>
      scope.attendance.slice().sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (a.period ?? 0) - (b.period ?? 0);
      }),
    [scope.attendance],
  );

  const summary = useMemo(() => {
    const present = rows.filter((r) => r.status === "present" || r.status === "late").length;
    const absent = rows.filter((r) => r.status === "absent").length;
    const leave = rows.filter((r) => r.status === "leave").length;
    const counted = present + absent;
    const pct = counted ? Math.round((present / counted) * 100) : 0;
    return { present, absent, leave, pct };
  }, [rows]);

  const byDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of rows) {
      const list = map.get(r.date) ?? [];
      list.push(r.status);
      map.set(r.date, list);
    }
    return map;
  }, [rows]);

  const calendarDays = useMemo(() => {
    const days: { date: string; status?: string }[] = [];
    const end = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, status: dayHighlightStatus(byDate.get(key) ?? []) });
    }
    return days;
  }, [byDate]);

  return (
    <PortalShell title="Student Portal" subtitle="My academics" nav={STUDENT_NAV} accent="accent">
      <PageHeader title="Attendance" subtitle="Period-wise history" />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <StatCard label="Attendance" value={`${summary.pct}%`} tone="success" />
        <StatCard label="Present / late" value={summary.present} tone="success" />
        <StatCard label="Absent" value={summary.absent} tone="warning" />
        <StatCard label="Leave" value={summary.leave} />
      </div>
      <Card className="mb-6 p-4">
        <p className="mb-3 text-sm font-semibold">Last 28 days</p>
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((d) => {
            const tone =
              d.status === "present" || d.status === "late"
                ? "bg-emerald-500"
                : d.status === "absent"
                  ? "bg-rose-500"
                  : d.status === "leave"
                    ? "bg-amber-400"
                    : "bg-[var(--ims-muted)]";
            return (
              <div
                key={d.date}
                title={`${d.date}${d.status ? ` · ${d.status}` : ""}`}
                className={`aspect-square rounded-md ${tone}`}
              />
            );
          })}
        </div>
      </Card>
      <Card>
        <Table headers={["Date", "Period", "Class", "Status", "Remarks"]}>
          {rows.map((a) => (
            <tr key={a.id}>
              <Td>{formatDate(a.date)}</Td>
              <Td>{periodLabel(a.period)}</Td>
              <Td>
                {a.className}-{a.section}
                {a.subject ? ` · ${a.subject}` : ""}
              </Td>
              <Td>
                <Badge status={a.status}>{labelize(a.status)}</Badge>
              </Td>
              <Td>{a.remarks ?? "—"}</Td>
            </tr>
          ))}
        </Table>
        {!rows.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">No attendance yet</p>
        ) : null}
      </Card>
    </PortalShell>
  );
}
