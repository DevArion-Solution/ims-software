import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, requireTenantAccess } from "@/lib/auth/api-auth";
import { resolveEffectiveTenantId } from "@/lib/auth/session";
import { getSchoolWorkspace, saveSchoolWorkspace } from "@/lib/db/platform-repo";
import { sendNotification, schoolSmtpFromSettings } from "@/lib/integrations";
import { addressForChannel, guardianContactsForStudent } from "@/lib/notify/guardian";
import { absenceMessage } from "@/lib/notify/pk-templates";
import type { Student } from "@/types";

export const dynamic = "force-dynamic";

type AttendanceStatus = "present" | "absent" | "late" | "leave" | "holiday";

/**
 * Hardware attendance hook (biometric / RFID / QR / ZKTeco).
 * Auth: session cookie OR `x-device-key` matching ATTENDANCE_DEVICE_KEY.
 *
 * Body: { deviceId, studentCode | admissionNo | rfidTag | biometricId, status?, date? }
 */
export async function POST(request: NextRequest) {
  const deviceKey = request.headers.get("x-device-key");
  const expected = process.env.ATTENDANCE_DEVICE_KEY;
  let tenantId: string | null = null;

  if (deviceKey && expected && deviceKey === expected) {
    tenantId = request.headers.get("x-tenant-id");
    if (!tenantId) {
      return NextResponse.json({ error: "x-tenant-id required for device auth" }, { status: 400 });
    }
  } else {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    tenantId = resolveEffectiveTenantId(auth.session);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }
    const tenantAuth = await requireTenantAccess(request, tenantId, { write: true });
    if (!tenantAuth.ok) return tenantAuth.response;
  }

  try {
    const body = (await request.json()) as {
      deviceId?: string;
      studentCode?: string;
      admissionNo?: string;
      rfidTag?: string;
      biometricId?: string;
      status?: AttendanceStatus;
      date?: string;
      className?: string;
      section?: string;
    };

    const code = (
      body.biometricId ??
      body.admissionNo ??
      body.studentCode ??
      body.rfidTag ??
      ""
    ).trim();
    if (!code) {
      return NextResponse.json(
        { error: "biometricId, admissionNo, studentCode or rfidTag required" },
        { status: 400 },
      );
    }

    const workspace = (await getSchoolWorkspace(tenantId!)) as {
      institute?: { name?: string };
      students?: Student[];
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
      alertSettings?: {
        absenceAutoNotify?: boolean;
        gmailUser?: string;
        gmailAppPassword?: string;
        gmailFromName?: string;
      };
      [key: string]: unknown;
    } | null;

    if (!workspace?.students) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    const schoolSmtp = schoolSmtpFromSettings(workspace.alertSettings) ?? undefined;

    const c = code.toLowerCase();
    const student =
      workspace.students.find(
        (s) =>
          s.biometricId?.toLowerCase() === c ||
          s.rfidTag?.toLowerCase() === c ||
          s.admissionNo.toLowerCase() === c ||
          s.id === code ||
          `${s.firstName} ${s.lastName}`.toLowerCase() === c,
      ) ?? null;

    if (!student) {
      return NextResponse.json({ error: "Student not found for device code" }, { status: 404 });
    }

    const date = body.date ?? new Date().toISOString().slice(0, 10);
    const status: AttendanceStatus = body.status ?? "present";
    const className = body.className ?? student.className;
    const section = body.section ?? student.section;
    const attendance = Array.isArray(workspace.attendance) ? [...workspace.attendance] : [];
    // Gate punch = day period 0 only (does not replace class period sheets)
    const existingIdx = attendance.findIndex(
      (a) => a.studentId === student.id && a.date === date && (a.period ?? 0) === 0,
    );
    const row = {
      id: existingIdx >= 0 ? attendance[existingIdx]!.id : `att_dev_${Date.now().toString(36)}`,
      date,
      className,
      section,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      status,
      period: 0,
      remarks: `Device ${body.deviceId ?? "ZKTeco"}`,
    };
    if (existingIdx >= 0) attendance[existingIdx] = row;
    else attendance.unshift(row);

    await saveSchoolWorkspace(tenantId!, { ...workspace, attendance });

    let alertSent = 0;
    if (status === "absent" && workspace.alertSettings?.absenceAutoNotify !== false) {
      const contact = guardianContactsForStudent(student);
      const msg = absenceMessage({
        studentName: row.studentName,
        date,
        className,
        section,
        schoolName: workspace.institute?.name ?? "School",
        locale: "both",
      });
      // WhatsApp skipped for now — email (and SMS if configured elsewhere)
      for (const channel of ["email"] as const) {
        const to = addressForChannel(contact, channel);
        if (!to) continue;
        const res = await sendNotification({
          channel,
          to,
          name: contact.guardianName,
          subject: msg.subject,
          body: msg.body,
          smtp: schoolSmtp,
        });
        if (res.ok) alertSent += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      studentId: student.id,
      studentName: row.studentName,
      date,
      status,
      deviceId: body.deviceId ?? null,
      alertSent,
      message: "Attendance recorded from device",
    });
  } catch (error) {
    console.error("[api/attendance/device]", error);
    return NextResponse.json({ error: "Device attendance failed" }, { status: 500 });
  }
}
