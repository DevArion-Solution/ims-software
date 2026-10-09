"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { PortalShell, TEACHER_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { teacherScope } from "@/lib/portal/scope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Modal";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatPercent } from "@/lib/utils";

export default function TeacherMarksPage() {
  const { session } = useAuth();
  const { data, addResult } = useData();
  const scope = teacherScope(data, session?.linkedStaffId);
  const exams = useMemo(
    () => data.exams.filter((e) => scope.classNames.has(e.className) || !scope.classNames.size),
    [data.exams, scope.classNames],
  );
  const [examId, setExamId] = useState(exams[0]?.id ?? data.exams[0]?.id ?? "");
  const [studentId, setStudentId] = useState(scope.myStudents[0]?.id ?? "");
  const [subject, setSubject] = useState(scope.mySubjects[0]?.name ?? "Mathematics");
  const [obtained, setObtained] = useState("");
  const [total, setTotal] = useState("100");
  const [saved, setSaved] = useState(false);

  const myResults = data.results.filter((r) =>
    scope.myStudents.some((s) => s.id === r.studentId),
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const student = scope.myStudents.find((s) => s.id === studentId);
    if (!student) return;
    addResult({
      examId,
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      className: student.className,
      subject,
      obtained: Number(obtained),
      total: Number(total),
    });
    setObtained("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <PortalShell title="Teacher Portal" subtitle="Classroom workspace" nav={TEACHER_NAV}>
      <PageHeader
        title="Marks Entry"
        subtitle="Scoped to your students and subjects"
      />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <form onSubmit={onSubmit} className="space-y-3">
            <SelectField label="Exam" value={examId} onChange={setExamId}>
              {(exams.length ? exams : data.exams).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Student" value={studentId} onChange={setStudentId}>
              {scope.myStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.className})
                </option>
              ))}
            </SelectField>
            <SelectField label="Subject" value={subject} onChange={setSubject}>
              {(scope.mySubjects.length
                ? scope.mySubjects.map((s) => s.name)
                : ["Mathematics", "English", "Science"]
              ).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </SelectField>
            <Input
              label="Obtained"
              type="number"
              required
              min={0}
              value={obtained}
              onChange={(e) => setObtained(e.target.value)}
            />
            <Input
              label="Total"
              type="number"
              required
              min={1}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={!scope.myStudents.length}>
              Save marks
            </Button>
            {saved ? <p className="text-sm text-emerald-700">Marks saved with auto grade</p> : null}
            {studentId ? (
              <Link
                href={`/report-card/${studentId}`}
                className="block text-center text-xs font-medium text-[var(--ims-primary)]"
              >
                Open report card for selected student
              </Link>
            ) : null}
          </form>
        </Card>
        <Card>
          <Table headers={["Student", "Subject", "Marks", "%", "Grade", "Card"]}>
            {myResults.slice(0, 12).map((r) => (
              <tr key={r.id}>
                <Td className="font-medium">{r.studentName}</Td>
                <Td>{r.subject}</Td>
                <Td>
                  {r.obtained}/{r.total}
                </Td>
                <Td>{formatPercent(r.percentage ?? 0, 1)}</Td>
                <Td>
                  <Badge status={r.passed ? "paid" : "overdue"}>{r.grade}</Badge>
                </Td>
                <Td>
                  <Link
                    href={`/report-card/${r.studentId}`}
                    className="text-xs text-[var(--ims-primary)]"
                  >
                    Print
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </PortalShell>
  );
}
