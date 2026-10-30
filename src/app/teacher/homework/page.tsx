"use client";

import { FormEvent, useState } from "react";
import { FileText } from "lucide-react";
import { PortalShell, TEACHER_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { teacherScope } from "@/lib/portal/scope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, Td } from "@/components/ui/Table";
import { formatDate } from "@/lib/utils";

export default function TeacherHomeworkPage() {
  const { session } = useAuth();
  const { data, addHomework, closeHomework, deleteHomework, gradeHomeworkSubmission } = useData();
  const scope = teacherScope(data, session?.linkedStaffId);
  const [form, setForm] = useState({
    title: "",
    description: "",
    className: scope.myClasses[0]?.name ?? "",
    section: scope.myClasses[0]?.section ?? "A",
    subject: scope.mySubjects[0]?.name ?? "",
    dueDate: new Date().toISOString().slice(0, 10),
    maxPoints: "",
  });
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, { score: string; feedback: string }>>({});
  const [gradeError, setGradeError] = useState("");
  const [savingGrade, setSavingGrade] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!scope.member || !form.title.trim()) return;
    const maxPoints = form.maxPoints.trim() ? Number(form.maxPoints) : undefined;
    if (maxPoints !== undefined && (!Number.isFinite(maxPoints) || maxPoints <= 0)) {
      setGradeError("Maximum points must be greater than zero.");
      return;
    }
    setGradeError("");
    addHomework({
      title: form.title,
      description: form.description,
      className: form.className,
      section: form.section,
      subject: form.subject,
      teacherId: scope.staffId,
      teacherName: scope.member.name,
      dueDate: form.dueDate,
      maxPoints,
    });
    setForm((f) => ({ ...f, title: "", description: "", maxPoints: "" }));
  }

  async function grade(homeworkId: string, studentId: string, maxPoints?: number) {
    const key = `${homeworkId}:${studentId}`;
    const draft = gradeDrafts[key] ?? { score: "", feedback: "" };
    const score = draft.score.trim() ? Number(draft.score) : undefined;
    if (!draft.feedback.trim() && score === undefined) {
      setGradeError("Enter a score or written feedback before returning the work.");
      return;
    }
    if (
      (score !== undefined && (!Number.isFinite(score) || score < 0)) ||
      (score !== undefined && maxPoints != null && score > maxPoints)
    ) {
      setGradeError(maxPoints != null ? `Score must be from 0 to ${maxPoints}.` : "Score must be zero or more.");
      return;
    }
    setGradeError("");
    setSavingGrade(key);
    try {
      const response = await fetch("/api/homework/submissions", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeworkId,
          studentId,
          score,
          feedback: draft.feedback.trim(),
        }),
      });
      const result = (await response.json()) as {
        submission?: {
          score?: number;
          feedback?: string;
          gradedAt?: string;
          gradedBy?: string;
        };
        error?: string;
      };
      if (!response.ok || !result.submission) {
        throw new Error(result.error ?? "Could not save grade");
      }
      gradeHomeworkSubmission(homeworkId, studentId, {
        score: result.submission.score,
        feedback: result.submission.feedback,
        gradedAt: result.submission.gradedAt,
        gradedBy: result.submission.gradedBy,
      });
    } catch (error) {
      setGradeError(error instanceof Error ? error.message : "Could not save grade");
    } finally {
      setSavingGrade("");
    }
  }

  return (
    <PortalShell title="Teacher Portal" subtitle="Classroom workspace" nav={TEACHER_NAV}>
      <PageHeader title="Homework" subtitle="Assign work to your classes" />
      <Card className="mb-6 p-4">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Due date"
            type="date"
            required
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <Input
            label="Maximum points (optional)"
            type="number"
            min="1"
            step="any"
            value={form.maxPoints}
            onChange={(e) => setForm({ ...form, maxPoints: e.target.value })}
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Class</span>
            <select
              value={`${form.className}|${form.section}`}
              onChange={(e) => {
                const [className, section] = e.target.value.split("|");
                setForm({ ...form, className: className!, section: section! });
              }}
              className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3"
            >
              {scope.myClasses.map((c) => (
                <option key={c.id} value={`${c.name}|${c.section}`}>
                  {c.name}-{c.section}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Subject</span>
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3"
            >
              {scope.mySubjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
              {!scope.mySubjects.length ? <option value="General">General</option> : null}
            </select>
          </label>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <Button type="submit">Assign homework</Button>
          </div>
        </form>
      </Card>

      <Card>
        <Table headers={["Title", "Class", "Subject", "Due", "Submissions", "Status", ""]}>
          {scope.myHomework.map((h) => (
            <tr key={h.id}>
              <Td>
                <p className="font-medium">{h.title}</p>
                <p className="text-xs text-[var(--ims-text-muted)]">{h.description}</p>
              </Td>
              <Td>
                {h.className}-{h.section}
              </Td>
              <Td>{h.subject}</Td>
              <Td>{formatDate(h.dueDate)}</Td>
              <Td>{h.submissions?.length ?? 0}</Td>
              <Td>{h.status}</Td>
              <Td>
                <div className="flex gap-1">
                  {h.status === "assigned" ? (
                    <Button size="sm" variant="secondary" onClick={() => closeHomework(h.id)}>
                      Close
                    </Button>
                  ) : null}
                  {!(h.submissions?.length) ? (
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => deleteHomework(h.id)}>
                      Del
                    </Button>
                  ) : null}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
        {!scope.myHomework.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">No homework yet</p>
        ) : null}
      </Card>

      <div className="mt-6 space-y-4">
        <PageHeader title="Student submissions" subtitle="Review work and return a score or feedback" />
        {gradeError ? (
          <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {gradeError}
          </p>
        ) : null}
        {scope.myHomework.map((homework) => {
          const submissions = homework.submissions ?? [];
          if (!submissions.length) return null;
          return (
            <Card key={homework.id} className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-semibold">{homework.title}</h2>
                <p className="text-sm text-[var(--ims-text-muted)]">
                  {homework.className}-{homework.section} · {homework.subject}
                </p>
              </div>
              <div className="mt-4 space-y-4">
                {submissions.map((submission) => {
                  const key = `${homework.id}:${submission.studentId}`;
                  const draft = gradeDrafts[key] ?? {
                    score: submission.score === undefined ? "" : String(submission.score),
                    feedback: submission.feedback ?? "",
                  };
                  const tenantId = session?.impersonatingSchoolId ?? session?.tenantId ?? "";
                  return (
                    <div key={submission.studentId} className="rounded-lg border border-[var(--ims-border)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{submission.studentName}</p>
                          <p className="text-xs text-[var(--ims-text-muted)]">
                            Submitted {formatDate(submission.submittedAt)}
                          </p>
                        </div>
                        {submission.score !== undefined ? (
                          <p className="text-sm font-semibold">
                            {submission.score}{homework.maxPoints ? ` / ${homework.maxPoints}` : ""}
                          </p>
                        ) : null}
                      </div>
                      {submission.answer ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm">{submission.answer}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-3">
                        {submission.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            className="inline-flex items-center gap-1 text-sm text-[var(--ims-primary)] underline"
                            href={`/api/homework/attachments?tenantId=${encodeURIComponent(tenantId)}&homeworkId=${encodeURIComponent(homework.id)}&studentId=${encodeURIComponent(submission.studentId)}&fileId=${encodeURIComponent(attachment.id)}`}
                          >
                            <FileText size={14} />
                            {attachment.fileName}
                          </a>
                        ))}
                      </div>
                      {submission.feedback ? (
                        <p className="mt-3 rounded-md bg-[var(--ims-muted)]/50 p-3 text-sm">
                          <span className="font-medium">Previous feedback:</span> {submission.feedback}
                        </p>
                      ) : null}
                      <div className="mt-4 grid gap-3 sm:grid-cols-[12rem_1fr]">
                        {homework.maxPoints || submission.score !== undefined ? (
                          <Input
                            label={homework.maxPoints ? `Score (0–${homework.maxPoints})` : "Score"}
                            type="number"
                            min="0"
                            max={homework.maxPoints}
                            step="any"
                            value={draft.score}
                            onChange={(event) =>
                              setGradeDrafts((previous) => ({
                                ...previous,
                                [key]: { ...draft, score: event.target.value },
                              }))
                            }
                          />
                        ) : null}
                        <label className="block text-sm font-medium">
                          Feedback
                          <textarea
                            className="mt-1.5 min-h-20 w-full rounded-md border border-[var(--ims-border)] bg-white p-3 text-sm outline-none focus:border-[var(--ims-primary)]"
                            value={draft.feedback}
                            onChange={(event) =>
                              setGradeDrafts((previous) => ({
                                ...previous,
                                [key]: { ...draft, feedback: event.target.value },
                              }))
                            }
                            placeholder="Add feedback for the student"
                          />
                        </label>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3"
                        disabled={savingGrade === key}
                        onClick={() => void grade(homework.id, submission.studentId, homework.maxPoints)}
                      >
                        {savingGrade === key
                          ? "Saving…"
                          : submission.gradedAt
                            ? "Update feedback"
                            : "Return grade"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
        {!scope.myHomework.some((homework) => homework.submissions?.length) ? (
          <Card className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
            No student submissions to review yet.
          </Card>
        ) : null}
      </div>
    </PortalShell>
  );
}
