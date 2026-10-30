import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireTenantAccess } from "@/lib/auth/api-auth";
import { getSessionFromRequest, resolveEffectiveTenantId } from "@/lib/auth/session";
import { updateSchoolWorkspace } from "@/lib/db/platform-repo";
import { validateHomeworkUpdate } from "@/lib/school/homework-access";
import {
  homeworkAttachmentPath,
  MAX_HOMEWORK_FILE_BYTES,
  MAX_HOMEWORK_FILES,
  MAX_HOMEWORK_SUBMISSION_BYTES,
} from "@/lib/school/homework-files";
import { stat } from "node:fs/promises";
import type { Homework, HomeworkAttachment, HomeworkSubmission, Student } from "@/types";

export const dynamic = "force-dynamic";

type HomeworkWorkspace = {
  homework?: Homework[];
  students?: Student[];
};

function getWorkspace(value: unknown): HomeworkWorkspace {
  return value && typeof value === "object" ? (value as HomeworkWorkspace) : {};
}

class HomeworkRequestError extends Error {}

function validAttachments(value: unknown): value is HomeworkAttachment[] {
  return (
    Array.isArray(value) &&
    value.length <= 3 &&
    value.every(
      (attachment) =>
        attachment &&
        typeof attachment.id === "string" &&
        /^[0-9a-f-]{36}$/i.test(attachment.id) &&
        typeof attachment.fileName === "string" &&
        attachment.fileName.length > 0 &&
        attachment.fileName.length <= 150 &&
        ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(attachment.mimeType) &&
        Number.isInteger(attachment.size) &&
        attachment.size > 0 &&
        attachment.size <= MAX_HOMEWORK_FILE_BYTES,
    ) &&
    value.reduce((total, attachment) => total + attachment.size, 0) <= MAX_HOMEWORK_SUBMISSION_BYTES
  );
}

export async function POST(request: Request) {
  const req = request as NextRequest;
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = resolveEffectiveTenantId(session);
  const auth = await requireTenantAccess(req, tenantId, { write: true });
  if (!auth.ok) return auth.response;
  if (auth.session.portal !== "student" || !auth.session.linkedStudentId) {
    return NextResponse.json({ error: "Only a linked student can submit homework" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      homeworkId?: string;
      answer?: string;
      attachments?: unknown;
    };
    if (
      !body.homeworkId ||
      typeof body.answer !== "string" ||
      body.answer.length > 20_000 ||
      !validAttachments(body.attachments)
    ) {
      return NextResponse.json({ error: "Invalid homework submission" }, { status: 400 });
    }

    const homeworkId = body.homeworkId;
    const answer = body.answer;
    const attachments = body.attachments;
    const studentId = auth.session.linkedStudentId;
    for (const attachment of attachments) {
      try {
        const file = await stat(
          homeworkAttachmentPath(
            tenantId,
            homeworkId,
            studentId,
            attachment.id,
            attachment.mimeType,
          ),
        );
        if (!file.isFile() || file.size !== attachment.size) {
          throw new HomeworkRequestError("An uploaded attachment is invalid");
        }
      } catch (error) {
        if (error instanceof HomeworkRequestError) throw error;
        throw new HomeworkRequestError("An uploaded attachment is missing or expired");
      }
    }

    let savedSubmission: HomeworkSubmission | undefined;
    await updateSchoolWorkspace(tenantId, (currentData) => {
      const current = getWorkspace(currentData);
      const homework = current.homework?.find((row) => row.id === homeworkId);
      const student = current.students?.find((row) => row.id === studentId);
      if (!homework || !student) throw new HomeworkRequestError("Homework or linked student record not found");
      if (
        homework.status !== "assigned" ||
        homework.dueDate < new Date().toISOString().slice(0, 10) ||
        homework.className !== student.className ||
        homework.section !== student.section
      ) {
        throw new HomeworkRequestError("This homework is closed or not assigned to you");
      }

      const previousSubmission = homework.submissions?.find(
        (submission) => submission.studentId === student.id,
      );
      if (previousSubmission?.gradedAt) throw new HomeworkRequestError("Graded homework cannot be changed");
      if (!answer.trim() && !attachments.length) {
        throw new HomeworkRequestError("Write an answer or attach a file before submitting");
      }
      if (attachments.length > MAX_HOMEWORK_FILES) {
        throw new HomeworkRequestError("A submission can include up to three attachments");
      }

      savedSubmission = {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        answer: answer.trim(),
        attachments,
        submittedAt: new Date().toISOString(),
      };
      const next = {
        ...current,
        homework: current.homework?.map((row) =>
          row.id === homework.id
            ? {
                ...row,
                submissions: [
                  ...(row.submissions ?? []).filter((item) => item.studentId !== student.id),
                  savedSubmission!,
                ],
              }
            : row,
        ),
      };
      const error = validateHomeworkUpdate(auth.session, currentData, next);
      if (error) throw new HomeworkRequestError(error);
      return next;
    });

    return NextResponse.json({ ok: true, submission: savedSubmission });
  } catch (error) {
    if (error instanceof HomeworkRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/homework/submissions POST]", error);
    return NextResponse.json({ error: "Could not save homework submission" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const req = request as NextRequest;
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = resolveEffectiveTenantId(session);
  const auth = await requireTenantAccess(req, tenantId, { write: true });
  if (!auth.ok) return auth.response;
  if (auth.session.portal !== "teacher" || !auth.session.linkedStaffId) {
    return NextResponse.json({ error: "Only a linked teacher can grade homework" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      homeworkId?: string;
      studentId?: string;
      score?: number | null;
      feedback?: string;
    };
    if (
      !body.homeworkId ||
      !body.studentId ||
      (body.score != null && (typeof body.score !== "number" || !Number.isFinite(body.score))) ||
      (body.feedback != null && (typeof body.feedback !== "string" || body.feedback.length > 10_000)) ||
      (body.score == null && !body.feedback?.trim())
    ) {
      return NextResponse.json({ error: "Provide a valid score or feedback" }, { status: 400 });
    }

    let savedSubmission: HomeworkSubmission | undefined;
    await updateSchoolWorkspace(tenantId, (currentData) => {
      const current = getWorkspace(currentData);
      const homework = current.homework?.find((row) => row.id === body.homeworkId);
      const submission = homework?.submissions?.find((item) => item.studentId === body.studentId);
      if (!homework || !submission) throw new HomeworkRequestError("Homework submission not found");
      if (homework.teacherId !== auth.session.linkedStaffId) {
        throw new HomeworkRequestError("Teachers can only grade their own homework");
      }
      if (body.score != null && (body.score < 0 || (homework.maxPoints != null && body.score > homework.maxPoints))) {
        throw new HomeworkRequestError("Score must be between zero and the assignment's maximum points");
      }

      savedSubmission = {
        ...submission,
        score: body.score == null ? undefined : body.score,
        feedback: body.feedback?.trim() ?? "",
        gradedAt: new Date().toISOString(),
        gradedBy: auth.session.linkedStaffId!,
      };
      const next = {
        ...current,
        homework: current.homework?.map((row) =>
          row.id === homework.id
            ? {
                ...row,
                submissions: row.submissions?.map((item) =>
                  item.studentId === body.studentId ? savedSubmission! : item,
                ),
              }
            : row,
        ),
      };
      const error = validateHomeworkUpdate(auth.session, currentData, next);
      if (error) throw new HomeworkRequestError(error);
      return next;
    });

    return NextResponse.json({ ok: true, submission: savedSubmission });
  } catch (error) {
    if (error instanceof HomeworkRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/homework/submissions PATCH]", error);
    return NextResponse.json({ error: "Could not save homework grade" }, { status: 500 });
  }
}
