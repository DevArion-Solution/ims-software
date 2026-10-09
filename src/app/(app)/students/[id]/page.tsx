"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Td } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { DocumentsList } from "@/components/ui/DocumentUpload";
import { buildStudentReport } from "@/lib/reports/person";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";

type Tab =
  | "overview"
  | "progress"
  | "fees"
  | "class"
  | "teachers"
  | "timetable"
  | "exams"
  | "attendance"
  | "docs";

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = useData();
  const [tab, setTab] = useState<Tab>("overview");

  const report = useMemo(
    () =>
      buildStudentReport(
        {
          ...data,
          classes: data.classes,
          hostelAllotments: data.hostelAllotments,
          routes: data.routes,
          routeAssignments: data.routeAssignments,
        },
        params.id,
      ),
    [data, params.id],
  );

  if (!report) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-[var(--ims-text-muted)]">Student not found</p>
        <Button className="mt-4" onClick={() => router.push("/students")}>
          Back to students
        </Button>
      </div>
    );
  }

  const { student } = report;
  const campus = data.institute.campuses.find((c) => c.id === student.campusId);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "progress", label: "Progress" },
    { id: "fees", label: "Fees" },
    { id: "class", label: "Class & Fellows" },
    { id: "teachers", label: "Teachers" },
    { id: "timetable", label: "Timetable" },
    { id: "exams", label: "Exams & Tests" },
    { id: "attendance", label: "Attendance" },
    { id: "docs", label: "Documents" },
  ];

  return (
    <div>
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        subtitle={`${student.admissionNo} · ${student.className}-${student.section} · A–Z student report`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => router.push("/students")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Link href={`/id-card/${student.id}`}>
              <Button variant="secondary" size="sm">
                ID card
              </Button>
            </Link>
            <Link href={`/report-card/${student.id}`}>
              <Button variant="secondary" size="sm">
                Report card
              </Button>
            </Link>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attendance" value={report.attLabel} tone="success" hint={`${report.attStats.present}P / ${report.attStats.absent}A`} />
        <StatCard label="Academic avg" value={report.avgLabel} tone={report.progressTone} hint={`${report.results.length} result rows`} />
        <StatCard label="Fee due" value={report.feeDueLabel} tone="warning" />
        <StatCard label="Class fellows" value={report.fellows.length} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "primary" : "secondary"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Profile" action={<Badge status={student.status}>{labelize(student.status)}</Badge>} />
            <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Gender" value={labelize(student.gender)} />
              <Field label="Date of birth" value={formatDate(student.dateOfBirth)} />
              <Field label="CNIC / B-Form" value={student.cnicOrBForm ?? "—"} />
              <Field label="Phone" value={student.phone ?? "—"} />
              <Field label="Email" value={student.email ?? "—"} />
              <Field label="Enrollment" value={formatDate(student.enrollmentDate)} />
              <Field label="Campus" value={campus?.name ?? "—"} />
              <Field label="Class teacher" value={report.classInfo?.classTeacher ?? "—"} />
              <Field label="Room" value={report.classInfo?.room ?? "—"} />
              <Field label="Hostel" value={report.hostel?.roomLabel ?? "Day scholar"} />
              <Field label="Transport" value={report.route?.name ?? "—"} />
              <div className="sm:col-span-2">
                <Field label="Address" value={student.address ?? "—"} />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Guardian / Parent" />
            <CardBody className="space-y-3">
              {student.guardians.map((g, idx) => (
                <div key={idx} className="rounded-md border border-[var(--ims-border)] p-3 text-sm">
                  <p className="font-medium">{g.name}</p>
                  <p className="mt-1 text-[var(--ims-text-muted)]">
                    {g.relation} · {g.phone}
                  </p>
                  {g.occupation ? <p className="mt-1 text-xs text-[var(--ims-text-subtle)]">{g.occupation}</p> : null}
                  {g.cnic ? <p className="mt-1 text-xs">CNIC: {g.cnic}</p> : null}
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "progress" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Average %" value={report.avgLabel} tone={report.progressTone} />
            <StatCard label="Passed papers" value={report.passed} tone="success" />
            <StatCard label="Failed / below" value={report.failed} tone="warning" />
          </div>
          <Card>
            <CardHeader title="Subject-wise progress" />
            <Table headers={["Subject", "Obtained", "Total", "%", "Grade", "Result"]}>
              {report.results.map((r) => (
                <tr key={r.id}>
                  <Td className="font-medium">{r.subject}</Td>
                  <Td>{r.obtained}</Td>
                  <Td>{r.total}</Td>
                  <Td>{r.percentage}%</Td>
                  <Td>
                    <Badge status="paid">{r.grade}</Badge>
                  </Td>
                  <Td>
                    <Badge status={r.passed ? "paid" : "overdue"}>{r.passed ? "Pass" : "Fail"}</Badge>
                  </Td>
                </tr>
              ))}
            </Table>
            {!report.results.length ? (
              <p className="p-4 text-sm text-[var(--ims-text-muted)]">No marks yet</p>
            ) : null}
          </Card>
        </div>
      )}

      {tab === "fees" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total billed" value={formatCurrency(report.feeTotal)} />
            <StatCard label="Paid" value={report.feePaidLabel} tone="success" />
            <StatCard label="Outstanding" value={report.feeDueLabel} tone="warning" />
          </div>
          <Card>
            <Table headers={["Month", "Head", "Net", "Paid", "Balance", "Status", "Challan"]}>
              {report.fees.map((f) => (
                <tr key={f.id}>
                  <Td>{f.month}</Td>
                  <Td>{f.feeHead ?? "Fee"}</Td>
                  <Td>{formatCurrency(f.amount)}</Td>
                  <Td>{formatCurrency(f.paid)}</Td>
                  <Td>{formatCurrency(Math.max(0, f.amount - f.paid))}</Td>
                  <Td>
                    <Badge status={f.status}>{labelize(f.status)}</Badge>
                  </Td>
                  <Td>
                    <Link href={`/challan/${f.id}`} className="text-xs font-medium text-[var(--ims-primary)]">
                      Print
                    </Link>
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}

      {tab === "class" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Class info" />
            <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Class" value={`${student.className}-${student.section}`} />
              <Field label="Class teacher" value={report.classInfo?.classTeacher ?? "—"} />
              <Field label="Room" value={report.classInfo?.room ?? "—"} />
              <Field label="Fellows" value={String(report.fellows.length)} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Class fellows" />
            <Table headers={["Admission", "Name", "Phone"]}>
              {report.fellows.map((f) => (
                <tr key={f.id}>
                  <Td>
                    <Link href={`/students/${f.id}`} className="text-[var(--ims-primary)]">
                      {f.admissionNo}
                    </Link>
                  </Td>
                  <Td className="font-medium">
                    {f.firstName} {f.lastName}
                  </Td>
                  <Td>{f.phone ?? "—"}</Td>
                </tr>
              ))}
            </Table>
            {!report.fellows.length ? (
              <p className="p-4 text-sm text-[var(--ims-text-muted)]">No other active students in this section</p>
            ) : null}
          </Card>
        </div>
      )}

      {tab === "teachers" && (
        <Card>
          <CardHeader title="Subject teachers" description="Teachers assigned to this class subjects" />
          <Table headers={["Subject", "Code", "Teacher", "Periods/week", "Dept / phone"]}>
            {report.teachers.map((t) => (
              <tr key={`${t.subject}-${t.teacher}`}>
                <Td className="font-medium">{t.subject}</Td>
                <Td>{t.code}</Td>
                <Td>{t.teacher}</Td>
                <Td>{t.periodsPerWeek}</Td>
                <Td className="text-xs text-[var(--ims-text-muted)]">
                  {t.staff ? `${t.staff.department} · ${t.staff.phone}` : "—"}
                </Td>
              </tr>
            ))}
          </Table>
          {!report.teachers.length ? (
            <p className="p-4 text-sm text-[var(--ims-text-muted)]">No subject teachers mapped yet</p>
          ) : null}
        </Card>
      )}

      {tab === "timetable" && (
        <Card>
          <CardHeader title="Weekly timetable" />
          <Table headers={["Day", "Period", "Subject", "Teacher", "Room"]}>
            {report.timetable.map((t) => (
              <tr key={t.id}>
                <Td>{t.day}</Td>
                <Td>{t.period}</Td>
                <Td className="font-medium">{t.subject}</Td>
                <Td>{t.teacher}</Td>
                <Td>{t.room ?? "—"}</Td>
              </tr>
            ))}
          </Table>
          {!report.timetable.length ? (
            <p className="p-4 text-sm text-[var(--ims-text-muted)]">No timetable slots</p>
          ) : null}
        </Card>
      )}

      {tab === "exams" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Exams / tests schedule" />
            <Table headers={["Exam", "Term", "Dates", "Status"]}>
              {report.exams.map((e) => (
                <tr key={e.id}>
                  <Td className="font-medium">{e.name}</Td>
                  <Td>{e.term}</Td>
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
          <Card>
            <CardHeader title="Marks / tests scored" />
            <Table headers={["Subject", "Marks", "Grade"]}>
              {report.results.map((r) => (
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
        </div>
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
            <Table headers={["Date", "Period", "Class", "Status", "Remarks"]}>
              {report.attendance.map((a) => (
                <tr key={a.id}>
                  <Td>{formatDate(a.date)}</Td>
                  <Td>{(a.period ?? 0) > 0 ? `Period ${a.period}` : "Day (gate)"}</Td>
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
            {!report.attendance.length ? (
              <p className="p-4 text-sm text-[var(--ims-text-muted)]">No attendance records</p>
            ) : null}
          </Card>
        </div>
      )}

      {tab === "docs" && (
        <Card>
          <CardHeader title="Proof documents" />
          <CardBody>
            <DocumentsList
              documents={student.documents}
              empty="No proofs uploaded. Edit student to attach CNIC, B-Form, photos, certificates."
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--ims-text-muted)]">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
