"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PortalShell, TEACHER_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { buildStaffReport } from "@/lib/reports/person";
import { formatCurrency, labelize } from "@/lib/utils";

export default function TeacherHomePage() {
  const { session } = useAuth();
  const { data } = useData();
  const staffId = session?.linkedStaffId ?? "st2";
  const report = useMemo(
    () => buildStaffReport({ ...data, classes: data.classes, papers: data.papers }, staffId),
    [data, staffId],
  );
  const upcoming = (report?.myExams ?? data.exams).filter((e) => e.status !== "completed").slice(0, 4);

  return (
    <PortalShell title="Teacher Portal" subtitle="Classroom workspace" nav={TEACHER_NAV}>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Assalam o Alaikum, {session?.user.name}
        </h1>
        <p className="mt-1 text-sm text-[var(--ims-text-muted)]">
          {report
            ? `${report.member.role} · ${report.subjectCount} subjects · ${report.teachingLoad} periods`
            : "Mark attendance, enter marks, prepare papers."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My subjects" value={report?.subjectCount ?? 0} />
        <StatCard label="Students" value={report?.myStudents.length ?? 0} tone="accent" />
        <StatCard label="Papers" value={report?.papers.length ?? 0} />
        <StatCard label="Salary pending" value={report?.pendingNetLabel ?? formatCurrency(0)} tone="warning" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Quick actions"
            action={
              <Link href="/teacher/report">
                <Button size="sm">Full report</Button>
              </Link>
            }
          />
          <CardBody className="grid gap-2 sm:grid-cols-2">
            <Link href="/teacher/attendance">
              <Button variant="secondary" className="w-full">
                Today&apos;s attendance
              </Button>
            </Link>
            <Link href="/teacher/marks">
              <Button variant="secondary" className="w-full">
                Enter marks
              </Button>
            </Link>
            <Link href="/teacher/report">
              <Button variant="secondary" className="w-full">
                Papers & salary
              </Button>
            </Link>
            <Link href="/teacher/timetable">
              <Button variant="secondary" className="w-full">
                My timetable
              </Button>
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Upcoming exams (my classes)" />
          <Table headers={["Exam", "Class", "Status"]}>
            {upcoming.map((e) => (
              <tr key={e.id}>
                <Td className="font-medium">{e.name}</Td>
                <Td>{e.className}</Td>
                <Td>
                  <Badge status={e.status === "ongoing" ? "pending" : "inquiry"}>{labelize(e.status)}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </PortalShell>
  );
}
