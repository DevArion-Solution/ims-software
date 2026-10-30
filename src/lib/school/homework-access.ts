import type { Homework, HomeworkSubmission } from "@/types";
import type { SessionPayload } from "@/lib/auth/types";

type WorkspaceWithHomework = {
  homework?: Homework[];
};

function homeworkRows(value: unknown): Homework[] {
  if (!value || typeof value !== "object") return [];
  const rows = (value as WorkspaceWithHomework).homework;
  return Array.isArray(rows) ? rows : [];
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function withoutSubmissions(homework: Homework) {
  return Object.fromEntries(
    Object.entries(homework).filter(([key]) => key !== "submissions"),
  );
}

function submissionWork(submission: HomeworkSubmission) {
  const gradeFields = new Set(["score", "feedback", "gradedAt", "gradedBy"]);
  return Object.fromEntries(
    Object.entries(submission).filter(([key]) => !gradeFields.has(key)),
  );
}

function sameGrade(left: HomeworkSubmission, right: HomeworkSubmission): boolean {
  return (
    left.score === right.score &&
    left.feedback === right.feedback &&
    left.gradedAt === right.gradedAt &&
    left.gradedBy === right.gradedBy
  );
}

function validSubmissions(submissions: HomeworkSubmission[]): boolean {
  const studentIds = new Set<string>();
  for (const submission of submissions) {
    if (!submission.studentId || studentIds.has(submission.studentId)) return false;
    studentIds.add(submission.studentId);
    if (
      !Array.isArray(submission.attachments) ||
      submission.attachments.length > 3 ||
      typeof submission.answer !== "string" ||
      submission.answer.length > 20_000 ||
      typeof submission.studentName !== "string" ||
      submission.studentName.length > 150 ||
      submission.attachments.some(
        (file) =>
          !file.id ||
          !file.fileName ||
          file.fileName.length > 150 ||
          file.size < 0 ||
          file.size > 5 * 1024 * 1024 ||
          !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.mimeType),
      ) ||
      submission.attachments.reduce((total, file) => total + file.size, 0) > 10 * 1024 * 1024
    ) {
      return false;
    }
  }
  return true;
}

function validateStudentHomeworkChange(
  current: Homework[],
  next: Homework[],
  studentId: string | undefined,
): string | null {
  if (!studentId) return "Student account is not linked to a student record";
  if (current.length !== next.length) return "Students cannot create or delete homework";

  const nextById = new Map(next.map((homework) => [homework.id, homework]));
  if (nextById.size !== next.length) return "Homework ids must be unique";

  for (const previous of current) {
    const updated = nextById.get(previous.id);
    if (!updated) return "Students cannot delete homework";
    if (!equal(withoutSubmissions(previous), withoutSubmissions(updated))) {
      return "Students cannot edit homework assignments";
    }

    const oldSubmissions = previous.submissions ?? [];
    const newSubmissions = updated.submissions ?? [];
    if (!validSubmissions(newSubmissions)) return "Invalid homework submission attachments";

    const oldByStudent = new Map(oldSubmissions.map((submission) => [submission.studentId, submission]));
    const newByStudent = new Map(newSubmissions.map((submission) => [submission.studentId, submission]));
    if (newByStudent.size !== newSubmissions.length) return "A student may submit only once per assignment";
    if (
      newSubmissions.some(
        (submission) =>
          submission.studentId !== studentId && !oldByStudent.has(submission.studentId),
      )
    ) {
      return "Students cannot create submissions for other students";
    }

    for (const submission of oldSubmissions) {
      if (submission.studentId === studentId) continue;
      if (!equal(submission, newByStudent.get(submission.studentId))) {
        return "Students cannot edit another student's submission";
      }
    }

    const oldOwnSubmission = oldByStudent.get(studentId);
    const newOwnSubmission = newByStudent.get(studentId);
    if (!newOwnSubmission) {
      if (oldOwnSubmission) return "Submitted homework cannot be deleted";
      continue;
    }
    if (previous.status !== "assigned" || previous.dueDate < new Date().toISOString().slice(0, 10)) {
      return "This homework is closed or past its due date";
    }
    if (newOwnSubmission.studentName !== oldOwnSubmission?.studentName && oldOwnSubmission) {
      return "Student identity cannot be changed";
    }
    if (
      oldOwnSubmission &&
      (!sameGrade(oldOwnSubmission, newOwnSubmission) ||
        (Boolean(oldOwnSubmission.gradedAt) && !equal(oldOwnSubmission, newOwnSubmission)))
    ) {
      return "Graded homework cannot be changed";
    }
    if (!oldOwnSubmission && (newOwnSubmission.score !== undefined || newOwnSubmission.gradedAt)) {
      return "Students cannot grade homework";
    }
    if (
      !oldOwnSubmission &&
      (newOwnSubmission.feedback !== undefined || newOwnSubmission.gradedBy !== undefined)
    ) {
      return "Students cannot write teacher feedback";
    }
  }
  return null;
}

function validateTeacherHomeworkChange(
  current: Homework[],
  next: Homework[],
  staffId: string | undefined,
): string | null {
  if (!staffId) return "Teacher account is not linked to a staff record";
  const currentById = new Map(current.map((homework) => [homework.id, homework]));
  const nextById = new Map(next.map((homework) => [homework.id, homework]));
  if (nextById.size !== next.length) return "Homework ids must be unique";

  for (const homework of current) {
    const updated = nextById.get(homework.id);
    if (!updated) {
      if (homework.teacherId !== staffId) return "Teachers cannot delete another teacher's homework";
      if ((homework.submissions ?? []).length) {
        return "Homework with student submissions cannot be deleted";
      }
      continue;
    }
    if (equal(homework, updated)) continue;
    if (homework.teacherId !== staffId) return "Teachers can only edit their own homework";
    if (updated.teacherId !== staffId) return "Homework ownership cannot be changed";

    const oldSubmissions = homework.submissions ?? [];
    const newSubmissions = updated.submissions ?? [];
    if (!validSubmissions(newSubmissions)) return "Invalid homework submission attachments";
    if (oldSubmissions.length !== newSubmissions.length) {
      return "Teachers cannot create or delete student submissions";
    }
    const newByStudent = new Map(newSubmissions.map((submission) => [submission.studentId, submission]));
    if (newByStudent.size !== newSubmissions.length) return "A student may submit only once per assignment";
    for (const submission of oldSubmissions) {
      const changed = newByStudent.get(submission.studentId);
      if (!changed || !equal(submissionWork(submission), submissionWork(changed))) {
        return "Teachers cannot change student-submitted work";
      }
      if (
        changed.score !== undefined &&
        (typeof changed.score !== "number" ||
          changed.score < 0 ||
          (updated.maxPoints != null && changed.score > updated.maxPoints))
      ) {
        return "Grade must be between zero and the assignment's maximum points";
      }
      const hasGrade = changed.score !== undefined || changed.feedback !== undefined;
      if (hasGrade && (!changed.gradedAt || changed.gradedBy !== staffId)) {
        return "Grade must include the reviewing teacher and review time";
      }
    }
  }

  for (const homework of next) {
    if (!currentById.has(homework.id) && homework.teacherId !== staffId) {
      return "Teachers can only create homework for themselves";
    }
    if (!currentById.has(homework.id) && (homework.submissions ?? []).length) {
      return "New homework cannot include student submissions";
    }
    if (homework.maxPoints != null && (!Number.isFinite(homework.maxPoints) || homework.maxPoints <= 0)) {
      return "Maximum points must be greater than zero";
    }
  }
  return null;
}

export function validateHomeworkUpdate(
  session: Pick<SessionPayload, "portal" | "linkedStudentId" | "linkedStaffId" | "impersonatingSchoolId">,
  currentData: unknown,
  nextData: unknown,
): string | null {
  const current = homeworkRows(currentData);
  const next = homeworkRows(nextData);
  if (equal(current, next)) return null;

  if (session.portal === "admin" || session.portal === "super") return null;
  if (session.portal === "student") {
    return validateStudentHomeworkChange(current, next, session.linkedStudentId);
  }
  if (session.portal === "teacher") {
    return validateTeacherHomeworkChange(current, next, session.linkedStaffId);
  }
  return "This portal cannot change homework";
}
