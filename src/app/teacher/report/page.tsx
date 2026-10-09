"use client";

import { useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { PortalShell, TEACHER_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Td } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField, TextArea } from "@/components/ui/Modal";
import { DocumentsList } from "@/components/ui/DocumentUpload";
import { buildStaffReport } from "@/lib/reports/person";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";

type Tab =
  | "overview"
  | "classes"
  | "timetable"
  | "papers"
  | "marks"
  | "salary"
  | "leaves"
  | "docs";

export default function TeacherReportPage() {
  const { session } = useAuth();
  const { data, addPaper, updatePaper, deletePaper } = useData();
  const [tab, setTab] = useState<Tab>("overview");
  const [paperOpen, setPaperOpen] = useState(false);
  const [paperForm, setPaperForm] = useState({
    title: "",
    className: "Class 8",
    subject: "Mathematics",
    totalMarks: "100",
    durationMins: "120",
    topics: "",
    status: "draft" as "draft" | "ready" | "used",
    examId: "",
  });

  const staffId = session?.linkedStaffId ?? "st2";
  const report = useMemo(
    () =>
      buildStaffReport(
        {
          ...data,
          classes: data.classes,
          papers: data.papers,
        },
        staffId,
      ),
    [data, staffId],
  );

  if (!report) {
    return (
      <PortalShell title="Teacher Portal" subtitle="Classroom workspace" nav={TEACHER_NAV}>
        <p className="text-sm text-[var(--ims-text-muted)]">Staff profile not linked.</p>
      </PortalShell>
    );
  }

  const { member } = report;

  return (
    <PortalShell title="Teacher Portal" subtitle="Classroom workspace" nav={TEACHER_NAV}>
      <PageHeader
        title="My Teacher Report"
        subtitle={`${member.name} · ${member.employeeNo} · ${member.role}`}
        actions={
          tab === "papers" ? (
            <Button size="sm" onClick={() => setPaperOpen(true)}>
              New paper
            </Button>
          ) : (
            <Link href="/teacher/marks">
              <Button size="sm">Enter marks</Button>
            </Link>
          )
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Subjects" value={report.subjectCount} />
        <StatCard label="Timetable load" value={report.teachingLoad} tone="accent" />
        <StatCard label="My students" value={report.myStudents.length} />
        <StatCard label="Salary pending" value={report.pendingNetLabel} tone="warning" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["overview", "Overview"],
            ["classes", "Classes & Students"],
            ["timetable", "Timetable"],
            ["papers", "Papers"],
            ["marks", "Marks entered"],
            ["salary", "Salary history"],
            ["leaves", "Leaves"],
            ["docs", "Documents"],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} size="sm" variant={tab === id ? "primary" : "secondary"} onClick={() => setTab(id)}>
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
              <Field label="Department" value={member.department} />
              <Field label="Phone" value={member.phone} />
              <Field label="Email" value={member.email} />
              <Field label="Join date" value={formatDate(member.joinDate)} />
              <Field label="Basic salary" value={formatCurrency(member.salary ?? 0)} />
              <Field label="CNIC" value={member.cnic ?? "—"} />
              <Field label="Class teacher of" value={report.classTeacherOf.map((c) => `${c.name}-${c.section}`).join(", ") || "—"} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Teaching subjects" />
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
        </div>
      )}

      {tab === "classes" && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Assigned as class teacher" />
            <Table headers={["Class", "Section", "Room", "Strength"]}>
              {report.classTeacherOf.map((c) => (
                <tr key={c.id}>
                  <Td className="font-medium">{c.name}</Td>
                  <Td>{c.section}</Td>
                  <Td>{c.room ?? "—"}</Td>
                  <Td>
                    {data.students.filter((s) => s.className === c.name && s.section === c.section && s.status === "active").length}
                  </Td>
                </tr>
              ))}
            </Table>
            {!report.classTeacherOf.length ? (
              <p className="p-4 text-sm text-[var(--ims-text-muted)]">Not assigned as class teacher</p>
            ) : null}
          </Card>
          <Card>
            <CardHeader title="Students in my teaching classes" />
            <Table headers={["Admission", "Name", "Class", "Phone"]}>
              {report.myStudents.slice(0, 40).map((s) => (
                <tr key={s.id}>
                  <Td>{s.admissionNo}</Td>
                  <Td className="font-medium">
                    {s.firstName} {s.lastName}
                  </Td>
                  <Td>
                    {s.className}-{s.section}
                  </Td>
                  <Td>{s.phone ?? "—"}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}

      {tab === "timetable" && (
        <Card>
          <CardHeader title="My teaching timetable" />
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
          <CardHeader title="Exam / test papers I prepared" />
          <Table headers={["Title", "Class", "Subject", "Marks", "Duration", "Status", ""]}>
            {report.papers.map((p) => (
              <tr key={p.id}>
                <Td className="font-medium">{p.title}</Td>
                <Td>{p.className}</Td>
                <Td>{p.subject}</Td>
                <Td>{p.totalMarks}</Td>
                <Td>{p.durationMins} min</Td>
                <Td>
                  <Badge status={p.status === "ready" ? "paid" : p.status === "used" ? "partial" : "pending"}>
                    {labelize(p.status)}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex gap-1">
                    {p.status === "draft" && (
                      <Button size="sm" variant="secondary" onClick={() => updatePaper(p.id, { status: "ready" })}>
                        Mark ready
                      </Button>
                    )}
                    {p.status === "ready" && (
                      <Button size="sm" variant="secondary" onClick={() => updatePaper(p.id, { status: "used" })}>
                        Mark used
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600"
                      onClick={() => {
                        if (confirm("Delete paper?")) deletePaper(p.id);
                      }}
                    >
                      Del
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
          {!report.papers.length ? (
            <p className="p-4 text-sm text-[var(--ims-text-muted)]">No papers yet — create one</p>
          ) : null}
        </Card>
      )}

      {tab === "marks" && (
        <Card>
          <CardHeader
            title="Marks I recorded (class subjects)"
            action={
              <Link href="/teacher/marks">
                <Button size="sm">Add marks</Button>
              </Link>
            }
          />
          <Table headers={["Student", "Class", "Subject", "Marks", "Grade"]}>
            {report.myResults.map((r) => (
              <tr key={r.id}>
                <Td className="font-medium">{r.studentName}</Td>
                <Td>{r.className}</Td>
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
      )}

      {tab === "salary" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Basic" value={formatCurrency(member.salary ?? 0)} />
            <StatCard label="Paid to date" value={report.paidNetLabel} tone="success" />
            <StatCard label="Pending" value={report.pendingNetLabel} tone="warning" />
          </div>
          <Card>
            <Table headers={["Month", "Basic", "Allowances", "Deductions", "Net", "Status", "Paid on"]}>
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
                </tr>
              ))}
            </Table>
            {!report.payroll.length ? (
              <p className="p-4 text-sm text-[var(--ims-text-muted)]">No payroll lines yet</p>
            ) : null}
          </Card>
        </div>
      )}

      {tab === "leaves" && (
        <Card>
          <CardHeader title={`Leave history · ${report.leaveDays} approved day(s)`} />
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

      {tab === "docs" && (
        <Card>
          <CardHeader title="My uploaded proofs" />
          <CardBody>
            <DocumentsList documents={member.documents} empty="No documents on file. Ask admin to upload in Staff." />
          </CardBody>
        </Card>
      )}

      <Modal open={paperOpen} onClose={() => setPaperOpen(false)} title="Prepare exam / test paper" wide>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            addPaper({
              title: paperForm.title,
              className: paperForm.className,
              subject: paperForm.subject,
              teacherId: member.id,
              teacherName: member.name,
              totalMarks: Number(paperForm.totalMarks) || 100,
              durationMins: Number(paperForm.durationMins) || 60,
              topics: paperForm.topics,
              status: paperForm.status,
              examId: paperForm.examId || undefined,
            });
            setPaperOpen(false);
            setPaperForm({
              title: "",
              className: "Class 8",
              subject: "Mathematics",
              totalMarks: "100",
              durationMins: "120",
              topics: "",
              status: "draft",
              examId: "",
            });
          }}
        >
          <Input
            label="Paper title"
            required
            className="sm:col-span-2"
            value={paperForm.title}
            onChange={(e) => setPaperForm({ ...paperForm, title: e.target.value })}
          />
          <Input
            label="Class"
            required
            value={paperForm.className}
            onChange={(e) => setPaperForm({ ...paperForm, className: e.target.value })}
          />
          <Input
            label="Subject"
            required
            value={paperForm.subject}
            onChange={(e) => setPaperForm({ ...paperForm, subject: e.target.value })}
          />
          <Input
            label="Total marks"
            type="number"
            value={paperForm.totalMarks}
            onChange={(e) => setPaperForm({ ...paperForm, totalMarks: e.target.value })}
          />
          <Input
            label="Duration (mins)"
            type="number"
            value={paperForm.durationMins}
            onChange={(e) => setPaperForm({ ...paperForm, durationMins: e.target.value })}
          />
          <SelectField
            label="Link exam (optional)"
            value={paperForm.examId}
            onChange={(v) => setPaperForm({ ...paperForm, examId: v })}
          >
            <option value="">— None —</option>
            {data.exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Status"
            value={paperForm.status}
            onChange={(v) => setPaperForm({ ...paperForm, status: v as "draft" | "ready" | "used" })}
          >
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="used">Used</option>
          </SelectField>
          <div className="sm:col-span-2">
            <TextArea
              label="Topics / syllabus covered"
              value={paperForm.topics}
              onChange={(v) => setPaperForm({ ...paperForm, topics: v })}
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setPaperOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save paper</Button>
          </div>
        </form>
      </Modal>
    </PortalShell>
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
