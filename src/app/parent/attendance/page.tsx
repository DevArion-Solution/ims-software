"use client";

import { useMemo } from "react";
import { PortalShell, PARENT_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { useParentChild } from "@/components/providers/ParentChildProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";
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

export default function ParentAttendancePage() {
  const { data } = useData();
  const { child } = useParentChild();
  const rows = useMemo(
    () =>
      data.attendance
        .filter((a) => a.studentId === child?.id)
        .slice()
        .sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return (a.period ?? 0) - (b.period ?? 0);
        }),
    [data.attendance, child?.id],
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
    <PortalShell title="Parent Portal" subtitle="Your child's progress" nav={PARENT_NAV} accent="accent">
      <PageHeader
        title="Attendance"
        subtitle="Period-wise history · calendar shows worst status of the day"
        actions={<ChildSwitcher />}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{summary.pct}%</p>
          <p className="text-xs text-[var(--ims-text-muted)]">Attendance</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold text-emerald-700">{summary.present}</p>
          <p className="text-xs text-[var(--ims-text-muted)]">Present / late</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold text-rose-600">{summary.absent}</p>
          <p className="text-xs text-[var(--ims-text-muted)]">Absent</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{summary.leave}</p>
          <p className="text-xs text-[var(--ims-text-muted)]">Leave</p>
        </Card>
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
        <p className="mt-2 text-xs text-[var(--ims-text-muted)]">
          Green present · Red absent · Amber leave · Grey no record
        </p>
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
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">No attendance records yet</p>
        ) : null}
      </Card>
    </PortalShell>
  );
}
