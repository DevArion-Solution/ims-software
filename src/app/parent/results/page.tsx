"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PortalShell, PARENT_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { useParentChild } from "@/components/providers/ParentChildProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";
import { formatPercent } from "@/lib/utils";

export default function ParentResultsPage() {
  const { data } = useData();
  const { child } = useParentChild();
  const rows = data.results.filter((r) => r.studentId === child?.id);

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
    <PortalShell title="Parent Portal" subtitle="Your child's progress" nav={PARENT_NAV} accent="accent">
      <PageHeader
        title="Results"
        subtitle="Exam-wise breakdown"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ChildSwitcher />
            {child ? (
              <Link href={`/report-card/${child.id}`}>
                <Button size="sm" variant="secondary">
                  Report card
                </Button>
              </Link>
            ) : null}
          </div>
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
