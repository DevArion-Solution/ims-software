import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, requireTenantAccess } from "@/lib/auth/api-auth";
import { resolveEffectiveTenantId } from "@/lib/auth/session";
import type { SessionPayload } from "@/lib/auth/types";
import { getSchoolWorkspace } from "@/lib/db/platform-repo";
import {
  homeworkAttachmentPath,
  isHomeworkMimeType,
  MAX_HOMEWORK_FILE_BYTES,
  MAX_HOMEWORK_FILES,
  MAX_HOMEWORK_SUBMISSION_BYTES,
} from "@/lib/school/homework-files";
import type { Homework, Student } from "@/types";

export const dynamic = "force-dynamic";

type HomeworkWorkspace = {
  homework?: Homework[];
  students?: Student[];
};

function getWorkspace(value: unknown): HomeworkWorkspace {
  return value && typeof value === "object" ? (value as HomeworkWorkspace) : {};
}

function canAccessSubmission(
  session: SessionPayload,
  tenantId: string,
  homework: Homework,
  studentId: string,
): boolean {
  if (session.portal === "student") return session.linkedStudentId === studentId;
  if (session.portal === "teacher") return session.linkedStaffId === homework.teacherId;
  if (session.portal === "admin" || session.portal === "principal") return true;
  return session.portal === "super" && session.impersonatingSchoolId === tenantId;
}

function detectMimeType(bytes: Uint8Array): string | null {
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") {
    return "application/pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export async function POST(request: Request) {
  const req = request as NextRequest;
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;
  if (auth.session.portal !== "student" || !auth.session.linkedStudentId) {
    return NextResponse.json({ error: "Only a linked student can submit homework files" }, { status: 403 });
  }
  const effectiveTenantId = resolveEffectiveTenantId(auth.session);
  const tenantAccess = await requireTenantAccess(req, effectiveTenantId);
  if (!tenantAccess.ok) return tenantAccess.response;

  try {
    const form = await request.formData();
    const homeworkId = form.get("homeworkId");
    const file = form.get("file");
    if (typeof homeworkId !== "string" || !homeworkId || !(file instanceof File)) {
      return NextResponse.json({ error: "Homework and file are required" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_HOMEWORK_FILE_BYTES) {
      return NextResponse.json({ error: "File must be between 1 byte and 5MB" }, { status: 400 });
    }

    const workspace = getWorkspace(await getSchoolWorkspace(effectiveTenantId));
    const homework = workspace.homework?.find((row) => row.id === homeworkId);
    const student = workspace.students?.find((row) => row.id === auth.session.linkedStudentId);
    if (!homework || !student) {
      return NextResponse.json({ error: "Homework or student record not found" }, { status: 404 });
    }
    if (
      homework.status !== "assigned" ||
      homework.dueDate < new Date().toISOString().slice(0, 10) ||
      homework.className !== student.className ||
      homework.section !== student.section
    ) {
      return NextResponse.json({ error: "This homework is closed or not assigned to you" }, { status: 403 });
    }

    const previous = homework.submissions?.find((submission) => submission.studentId === student.id);
    if (previous?.gradedAt) {
      return NextResponse.json({ error: "Graded homework cannot be changed" }, { status: 403 });
    }
    const attachments = previous?.attachments ?? [];
    if (
      attachments.length >= MAX_HOMEWORK_FILES ||
      attachments.reduce((total, attachment) => total + attachment.size, 0) + file.size >
        MAX_HOMEWORK_SUBMISSION_BYTES
    ) {
      return NextResponse.json({ error: "Submission attachment limit reached" }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const mimeType = detectMimeType(buffer);
    if (!mimeType) {
      return NextResponse.json(
        { error: "Only valid PDF, JPG, PNG, or WEBP files are allowed" },
        { status: 400 },
      );
    }

    const id = randomUUID();
    const target = homeworkAttachmentPath(effectiveTenantId, homework.id, student.id, id, mimeType);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer, { flag: "wx" });

    return NextResponse.json({
      ok: true,
      attachment: {
        id,
        fileName: file.name.replaceAll("\\", "/").split("/").pop()?.slice(0, 150) || "attachment",
        mimeType,
        size: file.size,
      },
    });
  } catch (error) {
    console.error("[api/homework/attachments POST]", error);
    return NextResponse.json({ error: "Could not upload homework attachment" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const req = request as NextRequest;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const homeworkId = searchParams.get("homeworkId");
  const studentId = searchParams.get("studentId");
  const fileId = searchParams.get("fileId");
  if (!tenantId || !homeworkId || !studentId || !fileId) {
    return NextResponse.json({ error: "Attachment details are required" }, { status: 400 });
  }

  const auth = await requireTenantAccess(req, tenantId);
  if (!auth.ok) return auth.response;
  try {
    const workspace = getWorkspace(await getSchoolWorkspace(tenantId));
    const homework = workspace.homework?.find((row) => row.id === homeworkId);
    const studentSubmission = homework?.submissions?.find(
      (submission) => submission.studentId === studentId,
    );
    const attachment = studentSubmission?.attachments.find((file) => file.id === fileId);
    if (
      !homework ||
      !attachment ||
      !isHomeworkMimeType(attachment.mimeType) ||
      !canAccessSubmission(auth.session, tenantId, homework, studentId)
    ) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const buffer = await readFile(
      homeworkAttachmentPath(tenantId, homework.id, studentId, attachment.id, attachment.mimeType),
    );
    return new Response(new Blob([new Uint8Array(buffer)], { type: attachment.mimeType }), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
        "Content-Length": String(buffer.byteLength),
        "Content-Type": attachment.mimeType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({ error: "Attachment file is no longer available" }, { status: 404 });
    }
    console.error("[api/homework/attachments GET]", error);
    return NextResponse.json({ error: "Could not read homework attachment" }, { status: 500 });
  }
}
