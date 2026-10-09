"use client";

import { useMemo } from "react";
import { PortalShell, PRINCIPAL_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table, Td } from "@/components/ui/Table";
import { formatCurrency, labelize } from "@/lib/utils";

export default function PrincipalReportsPage() {
  const { data } = useData();

  const classStrength = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of data.students.filter((x) => x.status === "active")) {
      const key = `${s.className}-${s.section}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data.students]);

  const feeByStatus = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const f of data.fees) {
      const bal = Math.max(0, f.amount - f.paid);
      const cur = map.get(f.status) ?? { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += bal;
      map.set(f.status, cur);
    }
    return [...map.entries()].map(([status, v]) => ({ status, ...v }));
  }, [data.fees]);

  const attendanceRate = useMemo(() => {
    const present = data.attendance.filter(
      (a) => a.status === "present" || a.status === "late",
    ).length;
    const absent = data.attendance.filter((a) => a.status === "absent").length;
    const total = present + absent;
    return total ? Math.round((present / total) * 100) : 0;
  }, [data.attendance]);

  const resultAvg = useMemo(() => {
    if (!data.results.length) return 0;
    return Math.round(
      data.results.reduce((s, r) => s + (r.percentage ?? 0), 0) / data.results.length,
    );
  }, [data.results]);

  return (
    <PortalShell title="Principal Portal" subtitle="School leadership" nav={PRINCIPAL_NAV}>
      <PageHeader title="Reports" subtitle="High-level academic and finance pulse" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attendance rate" value={`${attendanceRate}%`} tone="success" />
        <StatCard label="Result avg" value={`${resultAvg}%`} tone="accent" />
        <StatCard
          label="Active classes"
          value={classStrength.length}
        />
        <StatCard
          label="Open library issues"
          value={data.bookIssues.filter((i) => i.status !== "returned").length}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Class strength" />
          <Table headers={["Class", "Students"]}>
            {classStrength.map((c) => (
              <tr key={c.name}>
                <Td className="font-medium">{c.name}</Td>
                <Td>{c.count}</Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card>
          <CardHeader title="Fee status mix" />
          <Table headers={["Status", "Challans", "Outstanding"]}>
            {feeByStatus.map((f) => (
              <tr key={f.status}>
                <Td>{labelize(f.status)}</Td>
                <Td>{f.count}</Td>
                <Td>{formatCurrency(f.amount)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </PortalShell>
  );
}
