"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/components/providers/DataProvider";
import { Button } from "@/components/ui/Button";
import { formatDate, formatPercent } from "@/lib/utils";
import { averageOf } from "@/lib/calc";

export default function ReportCardPage() {
  const params = useParams<{ studentId: string }>();
  const router = useRouter();
  const { data } = useData();
  const student = data.students.find((s) => s.id === params.studentId);
  const results = useMemo(
    () => data.results.filter((r) => r.studentId === params.studentId),
    [data.results, params.studentId],
  );
  const institute = data.institute;

  if (!student) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-[var(--ims-text-muted)]">Student not found</p>
        <Button onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const overall = results.length ? averageOf(results.map((r) => r.percentage), 2) : 0;
  const passed = results.length > 0 && results.every((r) => r.passed);

  return (
    <div className="min-h-screen bg-[var(--ims-bg)] p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end gap-2 print:hidden">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
        <Button onClick={() => window.print()}>Print report card</Button>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg border border-[var(--ims-border)] bg-white p-6 shadow-sm print:border-0 print:shadow-none sm:p-8">
        <div className="border-b border-dashed border-[var(--ims-border)] pb-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ims-primary)]">
            Student Report Card
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
            {institute.name}
          </h1>
          <p className="mt-1 text-xs text-[var(--ims-text-muted)]">
            Academic Year {institute.academicYear} · {institute.address}
          </p>
        </div>

        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <p>
            <span className="text-[var(--ims-text-muted)]">Student: </span>
            <span className="font-semibold">
              {student.firstName} {student.lastName}
            </span>
          </p>
          <p>
            <span className="text-[var(--ims-text-muted)]">Admission: </span>
            {student.admissionNo}
          </p>
          <p>
            <span className="text-[var(--ims-text-muted)]">Class: </span>
            {student.className} - {student.section}
          </p>
          <p>
            <span className="text-[var(--ims-text-muted)]">Printed: </span>
            {formatDate(new Date().toISOString().slice(0, 10))}
          </p>
        </div>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--ims-border)] text-left">
              <th className="py-2">Subject</th>
              <th className="py-2">Exam</th>
              <th className="py-2 text-right">Marks</th>
              <th className="py-2 text-right">%</th>
              <th className="py-2 text-center">Grade</th>
              <th className="py-2 text-center">Result</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const exam = data.exams.find((e) => e.id === r.examId);
              return (
                <tr key={r.id} className="border-b border-[var(--ims-border)]">
                  <td className="py-2.5 font-medium">{r.subject}</td>
                  <td className="py-2.5 text-[var(--ims-text-muted)]">
                    {exam?.name ?? r.examId}
                  </td>
                  <td className="py-2.5 text-right">
                    {r.obtained}/{r.total}
                  </td>
                  <td className="py-2.5 text-right">{formatPercent(r.percentage, 1)}</td>
                  <td className="py-2.5 text-center font-semibold">{r.grade}</td>
                  <td className="py-2.5 text-center">{r.passed ? "Pass" : "Fail"}</td>
                </tr>
              );
            })}
            {!results.length ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--ims-text-muted)]">
                  No results recorded yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {results.length ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-md bg-[var(--ims-muted)]/50 px-4 py-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--ims-text-muted)]">
                Overall average
              </p>
              <p className="mt-1 text-xl font-semibold">{formatPercent(overall, 2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-[var(--ims-text-muted)]">
                Final status
              </p>
              <p
                className={`mt-1 text-xl font-semibold ${
                  passed ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {passed ? "PASS" : "FAIL"}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <div className="border-t border-dashed border-[var(--ims-border)] pt-6 text-center text-xs text-[var(--ims-text-muted)]">
            Class teacher signature
          </div>
          <div className="border-t border-dashed border-[var(--ims-border)] pt-6 text-center text-xs text-[var(--ims-text-muted)]">
            Principal signature
          </div>
        </div>
      </div>
    </div>
  );
}
