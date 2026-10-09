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
import { buildStaffReport } from "@/lib/reports/person";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";

type Tab =
  | "overview"
  | "salary"
  | "leaves"
  | "teaching"
  | "timetable"
  | "papers"
  | "docs";

export default function StaffDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = useData();
  const [tab, setTab] = useState<Tab>("overview");

  const report = useMemo(
    () =>
      buildStaffReport(
        {
          ...data,
          classes: data.classes,
          papers: data.papers,
        },
        params.id,
      ),
    [data, params.id],
  );

  if (!report) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-[var(--ims-text-muted)]">Staff not found</p>
        <Button className="mt-4" onClick={() => router.push("/staff")}>
          Back to staff
        </Button>
      </div>
    );
  }

  const { member } = report;
  const isTeacherLike =
    /teacher|principal|lecturer|instructor/i.test(member.role) ||
    report.subjects.length > 0 ||
    report.timetable.length > 0;

  return (
    <div>
      <PageHeader
        title={member.name}
        subtitle={`${member.employeeNo} · ${member.role} · ${member.department} · A–Z staff report`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => router.push("/staff")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Basic salary" value={formatCurrency(member.salary ?? 0)} />
        <StatCard label="Paid payroll" value={report.paidNetLabel} tone="success" />
        <StatCard label="Pending payroll" value={report.pendingNetLabel} tone="warning" />
        <StatCard label="Leave days (approved)" value={report.leaveDays} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["overview", "Overview"],
            ["salary", "Salary history"],
            ["leaves", "Leaves"],
            ...(isTeacherLike
              ? ([
                  ["teaching", "Classes / Subjects"],
                  ["timetable", "Timetable"],
                  ["papers", "Papers"],
                ] as const)
              : []),
            ["docs", "Documents"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? "primary" : "secondary"}
            onClick={() => setTab(id as Tab)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Profile" action={<Badge status={member.status}>{labelize(member.status)}</Badge>} />
            <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Employee No" value={member.employeeNo} />
              <Field label="Role" value={member.role} />
              <Field label="Department" value={member.department} />
              <Field label="Phone" value={member.phone} />
              <Field label="Email" value={member.email} />
              <Field label="Join date" value={formatDate(member.joinDate)} />
              <Field label="CNIC" value={member.cnic ?? "—"} />
              <Field label="Salary" value={formatCurrency(member.salary ?? 0)} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Quick summary" />
            <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Subjects taught" value={String(report.subjectCount)} />
              <Field label="Timetable periods" value={String(report.teachingLoad)} />
              <Field label="Students in scope" value={String(report.myStudents.length)} />
              <Field label="Papers prepared" value={String(report.papers.length)} />
              <Field
                label="Class teacher of"
                value={report.classTeacherOf.map((c) => `${c.name}-${c.section}`).join(", ") || "—"}
              />
              <Field label="Leave requests" value={String(report.leaves.length)} />
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "salary" && (
        <Card>
          <Table headers={["Month", "Basic", "Allowances", "Deductions", "Net", "Status", "Paid on", "Slip"]}>
            {report.payroll.map((p) => (
              <tr key={p.id}>
                <Td>{p.month}</Td>
                <Td>{formatCurrency(p.basic)}</Td>
                <Td>{formatCurrency(p.allowances)}</Td>
                <Td>{formatCurrency(p.deductions)}</Td>
                <Td className="font-semibold">{formatCurrency(p.net)}</Td>
                <Td>
                  <Badge status={p.status === "paid" ? "paid" : "pending"}>{labelize(p.status)}</Badge>
                </Td>
                <Td>{p.paidOn ? formatDate(p.paidOn) : "—"}</Td>
                <Td>
                  <Link href={`/payslip/${p.id}`}>
                    <Button size="sm" variant="secondary">
                      Payslip
                    </Button>
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
          {!report.payroll.length ? (
            <p className="p-4 text-sm text-[var(--ims-text-muted)]">No payroll history</p>
          ) : null}
        </Card>
      )}

      {tab === "leaves" && (
        <Card>
          <Table headers={["From", "To", "Days", "Type", "Status"]}>
            {report.leaves.map((l) => (
              <tr key={l.id}>
                <Td>{formatDate(l.from)}</Td>
                <Td>{formatDate(l.to)}</Td>
                <Td>{l.days}</Td>
                <Td>{labelize(l.type)}</Td>
                <Td>
                  <Badge
                    status={
                      l.status === "approved" ? "paid" : l.status === "rejected" ? "overdue" : "pending"
                    }
                  >
                    {labelize(l.status)}
                  </Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "teaching" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Subjects" />
            <Table headers={["Subject", "Class", "Code", "Periods"]}>
              {report.subjects.map((s) => (
                <tr key={s.id}>
                  <Td className="font-medium">{s.name}</Td>
                  <Td>{s.className}</Td>
                  <Td>{s.code}</Td>
                  <Td>{s.periodsPerWeek}</Td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card>
            <CardHeader title="Class teacher" />
            <Table headers={["Class", "Section", "Room"]}>
              {report.classTeacherOf.map((c) => (
                <tr key={c.id}>
                  <Td>{c.name}</Td>
                  <Td>{c.section}</Td>
                  <Td>{c.room ?? "—"}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}

      {tab === "timetable" && (
        <Card>
          <Table headers={["Day", "Period", "Class", "Subject", "Room"]}>
            {report.timetable.map((t) => (
              <tr key={t.id}>
                <Td>{t.day}</Td>
                <Td>{t.period}</Td>
                <Td>
                  {t.className}-{t.section}
                </Td>
                <Td className="font-medium">{t.subject}</Td>
                <Td>{t.room ?? "—"}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "papers" && (
        <Card>
          <Table headers={["Title", "Class", "Subject", "Marks", "Status"]}>
            {report.papers.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium">{p.title}</Td>
                <Td>{p.className}</Td>
                <Td>{p.subject}</Td>
                <Td>{p.totalMarks}</Td>
                <Td>
                  <Badge status={p.status === "ready" ? "paid" : "pending"}>{labelize(p.status)}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "docs" && (
        <Card>
          <CardHeader title="Proof documents" />
          <CardBody>
            <DocumentsList documents={member.documents} empty="No proofs on file" />
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
