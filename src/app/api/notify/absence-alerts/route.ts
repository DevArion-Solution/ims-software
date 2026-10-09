import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, requireTenantAccess } from "@/lib/auth/api-auth";
import { resolveEffectiveTenantId } from "@/lib/auth/session";
import { getSchoolWorkspace } from "@/lib/db/platform-repo";
import { sendNotification, schoolSmtpFromSettings } from "@/lib/integrations";
import type { NotifyChannel } from "@/lib/integrations/types";
import { addressForChannel, guardianContactsForStudent } from "@/lib/notify/guardian";
import { absenceMessage, type AlertLocale } from "@/lib/notify/pk-templates";
import type { AlertSettings, Student } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Auto-notify guardians when students are marked absent (same day).
 * Channels: whatsapp, sms, email (Gmail/SMTP).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const tenantId = resolveEffectiveTenantId(auth.session);
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }
  const tenantAuth = await requireTenantAccess(request, tenantId);
  if (!tenantAuth.ok) return tenantAuth.response;

  try {
    const body = (await request.json()) as {
      date?: string;
      schoolName?: string;
      locale?: AlertLocale;
      channels?: NotifyChannel[];
      period?: number;
      absences?: {
        studentId: string;
        studentName?: string;
        className?: string;
        section?: string;
      }[];
    };

    const date = body.date ?? new Date().toISOString().slice(0, 10);
    const period = body.period;
    const channels: NotifyChannel[] = (
      body.channels?.length ? body.channels : ["email"]
    ).filter((c) => c !== "whatsapp");
    const locale: AlertLocale = body.locale ?? "both";
    const absences = body.absences ?? [];
    if (!absences.length) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, message: "No absences" });
    }

    const workspace = (await getSchoolWorkspace(tenantId)) as {
      institute?: { name?: string };
      students?: Student[];
      alertSettings?: Partial<AlertSettings>;
    } | null;

    const settings = workspace?.alertSettings;
    if (settings?.absenceAutoNotify === false) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        failed: 0,
        skipped: true,
        message: "Absence auto-notify disabled in alert settings",
      });
    }

    const useChannels = (
      settings?.absenceChannels?.length ? settings.absenceChannels : channels
    ).filter((c) => c !== "whatsapp");
    const useLocale = settings?.absenceLocale ?? locale;
    const schoolName =
      body.schoolName ?? workspace?.institute?.name ?? "School";
    const students = workspace?.students ?? [];
    const schoolSmtp = schoolSmtpFromSettings(settings) ?? undefined;

    let sent = 0;
    let failed = 0;
    const results: { studentId: string; channel: string; ok: boolean; detail?: string }[] = [];

    for (const row of absences) {
      const student = students.find((s) => s.id === row.studentId);
      if (!student) {
        failed += 1;
        results.push({ studentId: row.studentId, channel: "-", ok: false, detail: "Student not found" });
        continue;
      }
      const contact = guardianContactsForStudent(student);
      const msg = absenceMessage({
        studentName: row.studentName ?? contact.studentName,
        date,
        className: row.className ?? student.className,
        section: row.section ?? student.section,
        schoolName,
        locale: useLocale,
        period,
      });

      for (const channel of useChannels) {
        if (channel === "notice_board" as NotifyChannel) continue;
        const to = addressForChannel(contact, channel);
        if (!to) {
          failed += 1;
          results.push({
            studentId: student.id,
            channel,
            ok: false,
            detail: `No ${channel} contact`,
          });
          continue;
        }
        const res = await sendNotification({
          channel,
          to,
          name: contact.guardianName,
          subject: msg.subject,
          body: msg.body,
          template: "absence_alert",
          smtp: channel === "email" ? schoolSmtp : undefined,
        });
        if (res.ok) sent += 1;
        else failed += 1;
        results.push({
          studentId: student.id,
          channel,
          ok: res.ok,
          detail: res.detail ?? res.error,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      date,
      message: `Absence alerts: ${sent} sent, ${failed} failed`,
      results,
    });
  } catch (error) {
    console.error("[api/notify/absence-alerts]", error);
    return NextResponse.json({ error: "Absence alerts failed" }, { status: 500 });
  }
}
