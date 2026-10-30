import path from "node:path";
import type { HomeworkAttachment } from "@/types";

export const MAX_HOMEWORK_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_HOMEWORK_SUBMISSION_BYTES = 10 * 1024 * 1024;
export const MAX_HOMEWORK_FILES = 3;

const MIME_EXTENSIONS: Record<HomeworkAttachment["mimeType"], string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function isHomeworkMimeType(value: string): value is HomeworkAttachment["mimeType"] {
  return Object.hasOwn(MIME_EXTENSIONS, value);
}

export function homeworkAttachmentPath(
  tenantId: string,
  homeworkId: string,
  studentId: string,
  fileId: string,
  mimeType: string,
): string {
  if (!isHomeworkMimeType(mimeType)) throw new Error("Unsupported homework attachment type");
  const safe = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(
    process.cwd(),
    "private_uploads",
    safe(tenantId),
    "homework",
    safe(homeworkId),
    safe(studentId),
    `${safe(fileId)}${MIME_EXTENSIONS[mimeType]}`,
  );
}
