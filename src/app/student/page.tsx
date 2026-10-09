"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PortalShell, STUDENT_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { buildStudentReport } from "@/lib/reports/person";
import { formatCurrency, labelize } from "@/lib/utils";

export default function StudentHomePage() {
  const { session } = useAuth();
  const { data } = useData();
  const meId = session?.linkedStudentId ?? data.students[0]?.id;
  const report = useMemo(
    () =>
      meId
        ? buildStudentReport(
            {
              ...data,
              classes: data.classes,
              hostelAllotments: data.hostelAllotments,
              routes: data.routes,
              routeAssignments: data.routeAssignments,
            },
            meId,
          )
        : null,
    [data, meId],
  );
  const me = report?.student;

  return (
    <PortalShell title="Student Portal" subtitle="My academics" nav={STUDENT_NAV} accent="accent">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Hi, {me ? me.firstName : session?.user.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--ims-text-muted)]">
            {me ? `${me.admissionNo} · ${me.className}-${me.section}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/student/homework">
            <Button size="sm" variant="secondary">
              Homework
            </Button>
          </Link>
          <Link href="/student/report">
            <Button size="sm">Open A–Z report</Button>
          </Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attendance" value={report?.attLabel ?? "—"} tone="success" />
        <StatCard label="Progress avg" value={report?.avgLabel ?? "—"} tone="accent" />
        <StatCard label="Fee pending" value={report?.feeDueLabel ?? formatCurrency(0)} tone="warning" />
        <StatCard label="My teachers" value={report?.teachers.length ?? 0} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="My recent results"
            action={
              <Link href="/student/results">
                <Button size="sm" variant="secondary">
                  All
                </Button>
              </Link>
            }
          />
          <Table headers={["Subject", "Marks", "Grade"]}>
            {(report?.results ?? []).slice(0, 5).map((r) => (
              <tr key={r.id}>
                <Td>{r.subject}</Td>
                <Td>
                  {r.obtained}/{r.total}
                </Td>
                <Td>
                  <Badge status="paid">{r.grade}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card>
          <CardHeader
            title="Fee overview"
            action={
              <Link href="/student/fees">
                <Button size="sm" variant="secondary">
                  All
                </Button>
              </Link>
            }
          />
          <Table headers={["Month", "Balance", "Status"]}>
            {(report?.fees ?? []).map((f) => (
              <tr key={f.id}>
                <Td>{f.month}</Td>
                <Td>{formatCurrency(Math.max(0, f.amount - f.paid))}</Td>
                <Td>
                  <Badge status={f.status}>{labelize(f.status)}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </PortalShell>
  );
}
