"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PortalShell, STUDENT_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { studentScope } from "@/lib/portal/scope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPercent } from "@/lib/utils";

export default function StudentResultsPage() {
  const { session } = useAuth();
  const { data } = useData();
  const scope = studentScope(data, session?.linkedStudentId);
  const rows = scope.results;
  const meId = scope.me?.id;

  const byExam = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = map.get(r.examId) ?? [];
      list.push(r);
      map.set(r.examId, list);
    }
    return [...map.entries()].map(([examId, list]) => {
      const exam = data.exams.find((e) => e.id === examId);
      const avg =
        list.length > 0
          ? Math.round(list.reduce((s, x) => s + (x.percentage ?? 0), 0) / list.length)
          : 0;
      return { examId, examName: exam?.name ?? examId, list, avg };
    });
  }, [rows, data.exams]);

  return (
    <PortalShell title="Student Portal" subtitle="My academics" nav={STUDENT_NAV} accent="accent">
      <PageHeader
        title="My Results"
        subtitle="Exam-wise marks with report card print"
        actions={
          meId ? (
            <div className="flex gap-2">
              <Link href={`/report-card/${meId}`}>
                <Button size="sm">Report card</Button>
              </Link>
              <Link href={`/id-card/${meId}`}>
                <Button size="sm" variant="secondary">
                  ID card
                </Button>
              </Link>
            </div>
          ) : null
        }
      />
      <div className="space-y-4">
        {byExam.map((group) => (
          <Card key={group.examId} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--ims-border)] bg-[var(--ims-muted)]/40 px-4 py-3">
              <p className="font-semibold">{group.examName}</p>
              <p className="text-sm text-[var(--ims-text-muted)]">Avg {group.avg}%</p>
            </div>
            <Table headers={["Subject", "Marks", "%", "Grade", "Pass"]}>
              {group.list.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium">{r.subject}</Td>
                  <Td>
                    {r.obtained}/{r.total}
                  </Td>
                  <Td>{formatPercent(r.percentage ?? 0, 1)}</Td>
                  <Td>
                    <Badge status={r.passed ? "paid" : "overdue"}>{r.grade}</Badge>
                  </Td>
                  <Td>{r.passed ? "Yes" : "No"}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        ))}
        {!byExam.length ? (
          <Card className="p-10 text-center text-sm text-[var(--ims-text-muted)]">
            No results published yet
          </Card>
        ) : null}
      </div>
    </PortalShell>
  );
}
