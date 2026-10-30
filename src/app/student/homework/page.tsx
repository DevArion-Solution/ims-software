"use client";

import { useMemo, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { PortalShell, STUDENT_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { studentScope } from "@/lib/portal/scope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { HomeworkAttachment } from "@/types";

const EMPTY_DRAFT = { answer: "", attachments: [] as HomeworkAttachment[] };

export default function StudentHomeworkPage() {
  const { session } = useAuth();
  const { data, submitHomework } = useData();
  const scope = studentScope(data, session?.linkedStudentId);
  const [drafts, setDrafts] = useState<
    Record<string, { answer: string; attachments: HomeworkAttachment[] }>
  >({});
  const [uploadingId, setUploadingId] = useState("");
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const tenantId = session?.impersonatingSchoolId ?? session?.tenantId ?? "";

  const rows = useMemo(
    () => [...scope.homework].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [scope.homework],
  );

  function getDraft(homeworkId: string, existing?: {
    answer: string;
    attachments: HomeworkAttachment[];
  }) {
    return drafts[homeworkId] ?? existing ?? EMPTY_DRAFT;
  }

  async function uploadFile(homeworkId: string, file: File | undefined) {
    if (!file) return;
    setError("");
    const draft = getDraft(
      homeworkId,
      rows.find((homework) => homework.id === homeworkId)?.submissions?.find(
        (submission) => submission.studentId === scope.me?.id,
      ),
    );
    if (draft.attachments.length >= 3 || draft.attachments.reduce((sum, item) => sum + item.size, 0) + file.size > 10 * 1024 * 1024) {
      setError("A submission can include up to 3 files and 10MB total.");
      return;
    }

    setUploadingId(homeworkId);
    try {
      const form = new FormData();
      form.append("homeworkId", homeworkId);
      form.append("file", file);
      const response = await fetch("/api/homework/attachments", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const result = (await response.json()) as {
        attachment?: HomeworkAttachment;
        error?: string;
      };
      if (!response.ok || !result.attachment) {
        throw new Error(result.error ?? "File upload failed");
      }
      setDrafts((previous) => ({
        ...previous,
        [homeworkId]: {
          ...draft,
          attachments: [...draft.attachments, result.attachment!],
        },
      }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "File upload failed");
    } finally {
      setUploadingId("");
    }
  }

  async function submit(homeworkId: string) {
    if (!scope.me || session?.linkedStudentId !== scope.me.id) {
      setError("Your student account is not linked to a student record. Contact your school administrator.");
      return;
    }
    setError("");
    const draft = getDraft(
      homeworkId,
      rows.find((homework) => homework.id === homeworkId)?.submissions?.find(
        (submission) => submission.studentId === scope.me?.id,
      ),
    );
    if (!draft.answer.trim() && !draft.attachments.length) {
      setError("Write an answer or attach a file before submitting.");
      return;
    }
    setSavingId(homeworkId);
    try {
      const response = await fetch("/api/homework/submissions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeworkId,
          answer: draft.answer.trim(),
          attachments: draft.attachments,
        }),
      });
      const result = (await response.json()) as {
        submission?: import("@/types").HomeworkSubmission;
        error?: string;
      };
      if (!response.ok || !result.submission) {
        throw new Error(result.error ?? "Could not save your submission");
      }
      submitHomework(homeworkId, result.submission);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save your submission");
    } finally {
      setSavingId("");
    }
  }

  return (
    <PortalShell title="Student Portal" subtitle="My academics" nav={STUDENT_NAV} accent="accent">
      <PageHeader
        title="Homework"
        subtitle={scope.me ? `${scope.me.className}-${scope.me.section}` : "Assigned work"}
      />
      {error ? (
        <p role="alert" className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <div className="space-y-4">
        {rows.map((homework) => {
          const submission = homework.submissions?.find(
            (item) => item.studentId === scope.me?.id,
          );
          const draft = getDraft(homework.id, submission);
          const due = homework.dueDate >= new Date().toISOString().slice(0, 10);
          const canSubmit = homework.status === "assigned" && due && !submission?.gradedAt;

          return (
            <Card key={homework.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{homework.title}</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--ims-text-muted)]">
                    {homework.description || "No additional instructions"}
                  </p>
                  <p className="mt-2 text-xs text-[var(--ims-text-muted)]">
                    {homework.subject} · {homework.teacherName}
                    {homework.maxPoints ? ` · ${homework.maxPoints} points` : ""}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">Due {formatDate(homework.dueDate)}</p>
                  <p className={submission ? "text-emerald-700" : "text-amber-700"}>
                    {submission ? (submission.gradedAt ? "Graded" : "Submitted") : homework.status === "closed" ? "Closed" : "Not submitted"}
                  </p>
                </div>
              </div>

              {submission ? (
                <div className="mt-4 rounded-lg bg-[var(--ims-muted)]/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ims-text-muted)]">
                    Your submission · {formatDate(submission.submittedAt)}
                  </p>
                  {submission.answer ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm">{submission.answer}</p>
                  ) : null}
                  {submission.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      className="mt-2 inline-flex items-center gap-2 text-sm text-[var(--ims-primary)] underline"
                      href={`/api/homework/attachments?tenantId=${encodeURIComponent(tenantId)}&homeworkId=${encodeURIComponent(homework.id)}&studentId=${encodeURIComponent(submission.studentId)}&fileId=${encodeURIComponent(attachment.id)}`}
                    >
                      <FileText size={16} />
                      {attachment.fileName}
                    </a>
                  ))}
                  {submission.gradedAt ? (
                    <div className="mt-4 border-t border-[var(--ims-border)] pt-3">
                      {submission.score !== undefined ? (
                        <p className="font-semibold">
                          Score: {submission.score}
                          {homework.maxPoints ? ` / ${homework.maxPoints}` : ""}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm">
                        <span className="font-medium">Teacher feedback:</span>{" "}
                        {submission.feedback || "No written feedback"}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {canSubmit ? (
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium">
                    Your answer
                    <textarea
                      className="mt-1.5 min-h-28 w-full rounded-md border border-[var(--ims-border)] bg-white p-3 text-sm outline-none focus:border-[var(--ims-primary)]"
                      value={draft.answer}
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [homework.id]: { ...draft, answer: event.target.value },
                        }))
                      }
                      placeholder="Write your answer or add a note about your attached work"
                    />
                  </label>
                  <div>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--ims-primary)]">
                      <Upload size={16} />
                      {uploadingId === homework.id ? "Uploading…" : "Attach PDF or image"}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="sr-only"
                        disabled={uploadingId === homework.id || draft.attachments.length >= 3}
                        onChange={(event) => {
                          void uploadFile(homework.id, event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <p className="mt-1 text-xs text-[var(--ims-text-muted)]">
                      Up to 3 PDF/JPG/PNG/WEBP files, 5MB each (10MB total).
                    </p>
                    {draft.attachments.map((attachment) => (
                      <p key={attachment.id} className="mt-1 text-sm">
                        <FileText className="mr-1 inline" size={14} />
                        {attachment.fileName}
                      </p>
                    ))}
                  </div>
                  <Button
                    type="button"
                    disabled={savingId === homework.id || uploadingId === homework.id}
                    onClick={() => submit(homework.id)}
                  >
                    {savingId === homework.id
                      ? "Submitting…"
                      : submission
                        ? "Update submission"
                        : "Submit homework"}
                  </Button>
                </div>
              ) : null}

              {!canSubmit && !submission ? (
                <p className="mt-4 text-sm text-[var(--ims-text-muted)]">
                  {homework.status === "closed" ? "This assignment is closed." : "The due date has passed."}
                </p>
              ) : null}
            </Card>
          );
        })}
        {!rows.length ? (
          <Card className="p-10 text-center text-sm text-[var(--ims-text-muted)]">
            No homework assigned to your class
          </Card>
        ) : null}
      </div>
    </PortalShell>
  );
}
