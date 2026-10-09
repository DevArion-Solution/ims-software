import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, requireTenantAccess } from "@/lib/auth/api-auth";
import { resolveEffectiveTenantId } from "@/lib/auth/session";
import { getSchoolWorkspace, saveSchoolWorkspace } from "@/lib/db/platform-repo";

export const dynamic = "force-dynamic";

type AttendanceStatus = "present" | "absent" | "late" | "leave" | "holiday";

interface OfflineMark {
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
  period?: number;
  subject?: string;
}

/**
 * Flush offline / PWA attendance drafts into school workspace.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const tenantId = resolveEffectiveTenantId(auth.session);
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }
  const tenantAuth = await requireTenantAccess(request, tenantId, { write: true });
  if (!tenantAuth.ok) return tenantAuth.response;

  try {
    const body = (await request.json()) as { marks?: OfflineMark[] };
    const marks = body.marks ?? [];
    if (!marks.length) {
      return NextResponse.json({ error: "marks[] required" }, { status: 400 });
    }

    const workspace = (await getSchoolWorkspace(tenantId)) as {
      attendance?: {
        id: string;
        date: string;
        className: string;
        section: string;
        studentId: string;
        studentName: string;
        status: AttendanceStatus;
        remarks?: string;
      }[];
      [key: string]: unknown;
    } | null;

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const attendance = Array.isArray(workspace.attendance)
      ? ([...workspace.attendance] as {
          id: string;
          date: string;
          className: string;
          section: string;
          studentId: string;
          studentName: string;
          status: AttendanceStatus;
          remarks?: string;
          period?: number;
          subject?: string;
        }[])
      : [];
    let applied = 0;
    for (const m of marks) {
      const period = m.period ?? 0;
      const idx = attendance.findIndex(
        (a) =>
          a.studentId === m.studentId &&
          a.date === m.date &&
          a.className === m.className &&
          (a.period ?? 0) === period,
      );
      const row = {
        id: idx >= 0 ? attendance[idx]!.id : `att_off_${Date.now().toString(36)}_${applied}`,
        date: m.date,
        className: m.className,
        section: m.section,
        studentId: m.studentId,
        studentName: m.studentName,
        status: m.status,
        remarks: m.remarks ?? "Offline sync",
        period,
        subject: m.subject,
      };
      if (idx >= 0) attendance[idx] = row;
      else attendance.unshift(row);
      applied += 1;
    }

    await saveSchoolWorkspace(tenantId, { ...workspace, attendance });
    return NextResponse.json({ ok: true, applied });
  } catch (error) {
    console.error("[api/attendance/sync]", error);
    return NextResponse.json({ error: "Offline sync failed" }, { status: 500 });
  }
}
