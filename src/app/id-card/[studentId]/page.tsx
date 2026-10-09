"use client";

import { useParams, useRouter } from "next/navigation";
import { useData } from "@/components/providers/DataProvider";
import { Button } from "@/components/ui/Button";
import { formatDate, labelize } from "@/lib/utils";

export default function IdCardPage() {
  const params = useParams<{ studentId: string }>();
  const router = useRouter();
  const { data } = useData();
  const student = data.students.find((s) => s.id === params.studentId);
  const institute = data.institute;
  const campus = student
    ? institute.campuses.find((c) => c.id === student.campusId)
    : null;

  if (!student) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-[var(--ims-text-muted)]">Student not found</p>
        <Button onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ims-bg)] p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-md justify-end gap-2 print:hidden">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
        <Button onClick={() => window.print()}>Print ID card</Button>
      </div>

      <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-xl border-2 border-[var(--ims-primary)] bg-white shadow-sm print:shadow-none">
        <div className="bg-[var(--ims-primary)] px-4 py-3 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-90">
            Student Identity Card
          </p>
          <h1 className="mt-0.5 font-[family-name:var(--font-display)] text-lg font-semibold leading-tight">
            {institute.shortName}
          </h1>
          <p className="mt-0.5 text-[10px] opacity-90">{institute.name}</p>
        </div>

        <div className="flex gap-3 p-4">
          <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-md border border-[var(--ims-border)] bg-[var(--ims-muted)]/60 text-center text-[10px] text-[var(--ims-text-muted)]">
            Photo
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-semibold">
              {student.firstName} {student.lastName}
            </p>
            <p className="mt-1 text-xs text-[var(--ims-text-muted)]">
              {student.admissionNo}
            </p>
            <p className="mt-2 text-xs">
              {student.className} · {student.section}
            </p>
            <p className="mt-1 text-xs capitalize">{labelize(student.gender)}</p>
            <p className="mt-1 text-xs text-[var(--ims-text-muted)]">
              DOB {formatDate(student.dateOfBirth)}
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--ims-border)] px-4 py-3 text-[11px] text-[var(--ims-text-muted)]">
          <p>Campus: {campus?.name ?? "—"}</p>
          <p className="mt-1">Guardian: {student.guardians[0]?.name ?? "—"}</p>
          <p className="mt-1">Phone: {student.guardians[0]?.phone ?? student.phone ?? "—"}</p>
          <p className="mt-2 text-[10px]">
            Valid for AY {institute.academicYear} · If found return to {institute.phone}
          </p>
        </div>
      </div>
    </div>
  );
}
