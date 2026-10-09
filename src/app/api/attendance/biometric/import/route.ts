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

type AttStatus = "present" | "absent" | "late" | "leave" | "holiday";

type Workspace = {
  institute?: { name?: string };
  students?: Student[];
  attendance?: {
    id: string;
    date: string;
    className: string;
    section: string;
    studentId: string;
    studentName: string;
    status: AttStatus;
    remarks?: string;
  }[];
  alertSettings?: {
    absenceAutoNotify?: boolean;
    gmailUser?: string;
    gmailAppPassword?: string;
    gmailFromName?: string;
  };
  [key: string]: unknown;
};

function parseStatus(raw: string | undefined): AttStatus {
  const s = (raw ?? "present").toLowerCase();
  if (s.includes("absent") || s === "a" || s === "0") return "absent";
  if (s.includes("late") || s === "l") return "late";
  if (s.includes("leave")) return "leave";
  if (s.includes("out") && !s.includes("check")) return "absent";
  // ZKTeco Check In / Check Out → present for in
  return "present";
}

/**
 * Import ZKTeco-style attendance logs or biometric ID mappings.
 *
 * mode=mapping: rows [{ admissionNo|studentId, biometricId?, rfidTag? }]
 * mode=logs: rows [{ userId|biometricId|admissionNo, date|dateTime, status? }]
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
    const body = (await request.json()) as {
      mode?: "mapping" | "logs";
      rows?: Record<string, string>[];
      notifyAbsent?: boolean;
    };

    const mode = body.mode ?? "logs";
    const rows = body.rows ?? [];
    if (!rows.length) {
      return NextResponse.json({ error: "rows required" }, { status: 400 });
    }

    const workspace = (await getSchoolWorkspace(tenantId)) as Workspace | null;
    if (!workspace?.students) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const students = [...workspace.students];
    let mapped = 0;
    let marked = 0;
    let unmatched = 0;
    const absences: {
      studentId: string;
      studentName: string;
      className: string;
      section: string;
      date: string;
    }[] = [];

    function findStudent(code: string): Student | undefined {
      const c = code.trim().toLowerCase();
      if (!c) return undefined;
      return students.find(
        (s) =>
          s.biometricId?.toLowerCase() === c ||
          s.rfidTag?.toLowerCase() === c ||
          s.admissionNo.toLowerCase() === c ||
          s.id.toLowerCase() === c ||
          `${s.firstName} ${s.lastName}`.toLowerCase() === c,
      );
    }

    if (mode === "mapping") {
      for (const row of rows) {
        const key = (
          row.admissionNo ??
          row.AdmissionNo ??
          row.studentId ??
          row.StudentID ??
          row["User ID"] ??
          ""
        ).trim();
        const bio = (
          row.biometricId ??
          row.BiometricId ??
          row.userId ??
          row["User ID"] ??
          row.DeviceUserId ??
          ""
        ).trim();
        const rfid = (row.rfidTag ?? row.RFID ?? row["Card No"] ?? row.CardNo ?? "").trim();
        const student =
          findStudent(key) ||
          students.find((s) => s.admissionNo.toLowerCase() === key.toLowerCase());
        if (!student) {
          unmatched += 1;
          continue;
        }
        const idx = students.findIndex((s) => s.id === student.id);
        students[idx] = {
          ...student,
          biometricId: bio || student.biometricId,
          rfidTag: rfid || student.rfidTag,
        };
        mapped += 1;
      }
      await saveSchoolWorkspace(tenantId, { ...workspace, students });
      return NextResponse.json({
        ok: true,
        mode,
        mapped,
        unmatched,
        message: `Mapped ${mapped} student(s); ${unmatched} unmatched`,
      });
    }

    // Attendance logs
    const attendance = Array.isArray(workspace.attendance) ? [...workspace.attendance] : [];
    for (const row of rows) {
      const code = (
        row.userId ??
        row.biometricId ??
        row["User ID"] ??
        row.UserID ??
        row.admissionNo ??
        row.enrollNumber ??
        ""
      ).trim();
      const student = findStudent(code);
      if (!student) {
        unmatched += 1;
        continue;
      }

      const rawDt =
        row.dateTime ?? row.DateTime ?? row.datetime ?? row.date ?? row.Date ?? "";
      const date =
        rawDt.includes("T") || rawDt.includes(" ")
          ? rawDt.slice(0, 10).replace(/\//g, "-")
          : (rawDt.slice(0, 10) || new Date().toISOString().slice(0, 10));
      const normalizedDate = date.includes("-")
        ? date
        : date.length === 8
          ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
          : new Date().toISOString().slice(0, 10);

      const status = parseStatus(row.status ?? row.Status ?? row.state ?? "Check In");
      // Gate / device punch = whole-day slot (period 0); never overwrite period sheets
      const existingIdx = attendance.findIndex(
        (a) =>
          a.studentId === student.id &&
          a.date === normalizedDate &&
          (a.period ?? 0) === 0,
      );
      const rec = {
        id:
          existingIdx >= 0
            ? attendance[existingIdx]!.id
            : `att_zk_${Date.now().toString(36)}_${marked}`,
        date: normalizedDate,
        className: student.className,
        section: student.section,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        status,
        period: 0,
        remarks: `ZKTeco import`,
      };
      if (existingIdx >= 0) attendance[existingIdx] = rec;
      else attendance.unshift(rec);
      marked += 1;
      if (status === "absent") {
        absences.push({
          studentId: student.id,
          studentName: rec.studentName,
          className: student.className,
          section: student.section,
          date: normalizedDate,
        });
      }
    }

    await saveSchoolWorkspace(tenantId, { ...workspace, students, attendance });

    let alertSent = 0;
    const schoolSmtp = schoolSmtpFromSettings(workspace.alertSettings) ?? undefined;
    if (body.notifyAbsent !== false && workspace.alertSettings?.absenceAutoNotify !== false) {
      const schoolName = workspace.institute?.name ?? "School";
      for (const a of absences) {
        const student = students.find((s) => s.id === a.studentId);
        if (!student) continue;
        const contact = guardianContactsForStudent(student);
        const msg = absenceMessage({
          studentName: a.studentName,
          date: a.date,
          className: a.className,
          section: a.section,
          schoolName,
          locale: "both",
        });
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
    }

    return NextResponse.json({
      ok: true,
      mode,
      marked,
      unmatched,
      absences: absences.length,
      alertSent,
      message: `Imported ${marked} punch(es); ${unmatched} unmatched; ${alertSent} absence alerts`,
    });
  } catch (error) {
    console.error("[api/attendance/biometric/import]", error);
    return NextResponse.json({ error: "Biometric import failed" }, { status: 500 });
  }
}
