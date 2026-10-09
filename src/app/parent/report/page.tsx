"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PortalShell, PARENT_NAV } from "@/components/layout/PortalShell";
import { useParentChild } from "@/components/providers/ParentChildProvider";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Td } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { buildStudentReport } from "@/lib/reports/person";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";

type Tab =
  | "progress"
  | "fees"
  | "class"
  | "teachers"
  | "timetable"
  | "exams"
  | "attendance";

export default function ParentReportPage() {
  const { child } = useParentChild();
  const { data } = useData();
  const [tab, setTab] = useState<Tab>("progress");

  const report = useMemo(
    () =>
      child
        ? buildStudentReport(
            {
              ...data,
              classes: data.classes,
              hostelAllotments: data.hostelAllotments,
              routes: data.routes,
              routeAssignments: data.routeAssignments,
            },
            child.id,
          )
        : null,
    [data, child],
  );

  if (!report || !child) {
    return (
      <PortalShell title="Parent Portal" subtitle="Your child's progress" nav={PARENT_NAV} accent="accent">
        <p className="text-sm text-[var(--ims-text-muted)]">No child linked.</p>
      </PortalShell>
    );
  }

  return (
    <PortalShell title="Parent Portal" subtitle="Your child's progress" nav={PARENT_NAV} accent="accent">
      <PageHeader
        title="Child A–Z Report"
        subtitle={`${child.firstName} ${child.lastName} · ${child.className}-${child.section}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ChildSwitcher />
            <Link href={`/report-card/${child.id}`}>
              <Button size="sm" variant="secondary">
                Report card
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attendance" value={report.attLabel} tone="success" />
        <StatCard label="Progress avg" value={report.avgLabel} tone={report.progressTone} />
        <StatCard label="Fee due" value={report.feeDueLabel} tone="warning" />
        <StatCard label="Teachers" value={report.teachers.length} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["progress", "Progress"],
            ["fees", "Fees"],
            ["class", "Class & Fellows"],
            ["teachers", "Teachers"],
            ["timetable", "Timetable"],
            ["exams", "Exams"],
            ["attendance", "Attendance"],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} size="sm" variant={tab === id ? "primary" : "secondary"} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>

      {tab === "progress" && (
        <Card>
          <Table headers={["Subject", "Marks", "%", "Grade", "Pass"]}>
            {report.results.map((r) => (
              <tr key={r.id}>
                <Td className="font-medium">{r.subject}</Td>
                <Td>
                  {r.obtained}/{r.total}
                </Td>
                <Td>{r.percentage}%</Td>
                <Td>
                  <Badge status="paid">{r.grade}</Badge>
                </Td>
                <Td>
                  <Badge status={r.passed ? "paid" : "overdue"}>{r.passed ? "Yes" : "No"}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "fees" && (
        <Card>
          <Table headers={["Month", "Amount", "Paid", "Balance", "Status"]}>
            {report.fees.map((f) => (
              <tr key={f.id}>
                <Td>{f.month}</Td>
                <Td>{formatCurrency(f.amount)}</Td>
                <Td>{formatCurrency(f.paid)}</Td>
                <Td>{formatCurrency(Math.max(0, f.amount - f.paid))}</Td>
                <Td>
                  <Badge status={f.status}>{labelize(f.status)}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "class" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Class" />
            <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
              <p>
                <span className="text-xs text-[var(--ims-text-muted)]">Class</span>
                <br />
                <span className="font-medium">
                  {child.className}-{child.section}
                </span>
              </p>
              <p>
                <span className="text-xs text-[var(--ims-text-muted)]">Class teacher</span>
                <br />
                <span className="font-medium">{report.classInfo?.classTeacher ?? "—"}</span>
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Class fellows" />
            <Table headers={["Name", "Admission"]}>
              {report.fellows.map((f) => (
                <tr key={f.id}>
                  <Td>
                    {f.firstName} {f.lastName}
                  </Td>
                  <Td>{f.admissionNo}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}

      {tab === "teachers" && (
        <Card>
          <Table headers={["Subject", "Teacher", "Periods"]}>
            {report.teachers.map((t) => (
              <tr key={`${t.subject}-${t.teacher}`}>
                <Td className="font-medium">{t.subject}</Td>
                <Td>{t.teacher}</Td>
                <Td>{t.periodsPerWeek}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "timetable" && (
        <Card>
          <Table headers={["Day", "Period", "Subject", "Teacher"]}>
            {report.timetable.map((t) => (
              <tr key={t.id}>
                <Td>{t.day}</Td>
                <Td>{t.period}</Td>
                <Td className="font-medium">{t.subject}</Td>
                <Td>{t.teacher}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "exams" && (
        <Card>
          <Table headers={["Exam", "Dates", "Status"]}>
            {report.exams.map((e) => (
              <tr key={e.id}>
                <Td className="font-medium">{e.name}</Td>
                <Td className="text-xs">
                  {formatDate(e.startDate)} → {formatDate(e.endDate)}
                </Td>
                <Td>
                  <Badge status={e.status === "completed" ? "paid" : "pending"}>{labelize(e.status)}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "attendance" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="%" value={report.attLabel} tone="success" />
            <StatCard label="Present" value={report.attStats.present} />
            <StatCard label="Absent" value={report.attStats.absent} tone="warning" />
            <StatCard label="Late" value={report.attStats.late} />
          </div>
          <Card>
            <Table headers={["Date", "Period", "Status", "Remarks"]}>
              {report.attendance.map((a) => (
                <tr key={a.id}>
                  <Td>{formatDate(a.date)}</Td>
                  <Td>{(a.period ?? 0) > 0 ? `Period ${a.period}` : "Day (gate)"}</Td>
                  <Td>
                    <Badge status={a.status}>{labelize(a.status)}</Badge>
                  </Td>
                  <Td>{a.remarks ?? "—"}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}
    </PortalShell>
  );
}
