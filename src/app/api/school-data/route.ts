import { NextResponse } from "next/server";
import { requireTenantAccess } from "@/lib/auth/api-auth";
import {
  getSchoolWorkspace,
  getTenantAccessById,
  saveSchoolWorkspace,
  syncTenantCounts,
} from "@/lib/db/platform-repo";
import { validateHomeworkUpdate } from "@/lib/school/homework-access";

export const dynamic = "force-dynamic";

function countArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export async function GET(request: Request) {
  const req = request as import("next/server").NextRequest;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const auth = await requireTenantAccess(req, tenantId);
  if (!auth.ok) return auth.response;

  try {
    const data = await getSchoolWorkspace(tenantId);
    if (!data) {
      return NextResponse.json({ error: "School workspace not found" }, { status: 404 });
    }
    return NextResponse.json({ tenantId, data });
  } catch (error) {
    console.error("[api/school-data GET]", error);
    return NextResponse.json(
      { error: "Failed to load school data from PostgreSQL" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const req = request as import("next/server").NextRequest;

  try {
    const body = (await request.json()) as { tenantId?: string; data?: unknown };
    const tenantId = body.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    }
    if (!body.data) {
      return NextResponse.json({ error: "Missing school data" }, { status: 400 });
    }

    const auth = await requireTenantAccess(req, tenantId, { write: true });
    if (!auth.ok) return auth.response;

    const currentData = await getSchoolWorkspace(tenantId);
    const homeworkError = validateHomeworkUpdate(auth.session, currentData, body.data);
    if (homeworkError) {
      return NextResponse.json({ error: homeworkError }, { status: 403 });
    }
    if (auth.session.portal === "student" && auth.session.linkedStudentId) {
      const currentStudent = (currentData as { students?: Array<{ id: string; firstName: string; lastName: string }> } | null)
        ?.students?.find((student) => student.id === auth.session.linkedStudentId);
      const nextHomework = (body.data as { homework?: Array<{ submissions?: Array<{ studentId: string; studentName: string }> }> })
        .homework ?? [];
      const expectedName = currentStudent
        ? `${currentStudent.firstName} ${currentStudent.lastName}`.trim()
        : "";
      if (
        expectedName &&
        nextHomework.some((homework) =>
          homework.submissions?.some(
            (submission) =>
              submission.studentId === auth.session.linkedStudentId &&
              submission.studentName !== expectedName,
          ),
        )
      ) {
        return NextResponse.json({ error: "Submission name does not match your student account" }, { status: 403 });
      }
    }

    // Plan / seat enforcement (Phase 2.3)
    const access = await getTenantAccessById(tenantId);
    if (access) {
      if (!access.canOperate) {
        return NextResponse.json(
          { error: access.blockReason ?? "School access blocked" },
          { status: 403 },
        );
      }

      const payload = body.data as { students?: unknown; staff?: unknown };
      const studentsCount = countArray(payload.students);
      const staffCount = countArray(payload.staff);

      if (studentsCount > access.maxStudents) {
        return NextResponse.json(
          {
            error: `Student seat limit exceeded (${studentsCount}/${access.maxStudents}). Upgrade plan or ask Super Admin to raise the limit.`,
            code: "SEAT_LIMIT_STUDENTS",
            maxStudents: access.maxStudents,
            studentsCount,
          },
          { status: 403 },
        );
      }
      if (staffCount > access.maxStaff) {
        return NextResponse.json(
          {
            error: `Staff seat limit exceeded (${staffCount}/${access.maxStaff}). Upgrade plan or ask Super Admin to raise the limit.`,
            code: "SEAT_LIMIT_STAFF",
            maxStaff: access.maxStaff,
            staffCount,
          },
          { status: 403 },
        );
      }
    }

    await saveSchoolWorkspace(tenantId, body.data);
    await syncTenantCounts(tenantId);
    return NextResponse.json({ ok: true, tenantId });
  } catch (error) {
    console.error("[api/school-data PUT]", error);
    return NextResponse.json(
      { error: "Failed to save school data" },
      { status: 500 },
    );
  }
}
