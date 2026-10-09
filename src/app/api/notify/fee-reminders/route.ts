import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, requireTenantAccess } from "@/lib/auth/api-auth";
import { resolveEffectiveTenantId } from "@/lib/auth/session";
import { getSchoolWorkspace, saveSchoolWorkspace } from "@/lib/db/platform-repo";
import { sendNotification, schoolSmtpFromSettings } from "@/lib/integrations";
import type { NotifyChannel } from "@/lib/integrations/types";
import { addressForChannel, guardianContactsForStudent } from "@/lib/notify/guardian";
import { feeReminderMessage, type AlertLocale } from "@/lib/notify/pk-templates";
import { formatCurrency } from "@/lib/utils";
import type { AlertSettings as FullAlertSettings, FeeInvoice, Student } from "@/types";

export const dynamic = "force-dynamic";

type AlertSettings = Partial<FullAlertSettings> & {
  feeReminderEnabled?: boolean;
  feeReminderChannels?: NotifyChannel[];
  feeReminderLocale?: AlertLocale;
  feeReminderDaysOfMonth?: number[];
  lastFeeReminderAt?: string;
};

/**
 * Send fee reminders to guardians of students with outstanding / overdue balances.
 * Also records lastFeeReminderAt for daily schedule dedupe.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const portal = auth.session.portal;
  if (
    portal !== "admin" &&
    portal !== "accountant" &&
    portal !== "super" &&
    portal !== "principal"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = resolveEffectiveTenantId(auth.session);
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }
  const tenantAuth = await requireTenantAccess(request, tenantId, { write: true });
  if (!tenantAuth.ok) return tenantAuth.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      force?: boolean;
      overdueOnly?: boolean;
      channels?: NotifyChannel[];
      locale?: AlertLocale;
    };

    const workspace = (await getSchoolWorkspace(tenantId)) as {
      institute?: { name?: string };
      students?: Student[];
      fees?: FeeInvoice[];
      alertSettings?: AlertSettings;
      [key: string]: unknown;
    } | null;

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const settings: AlertSettings = workspace.alertSettings ?? {};
    const schoolSmtp = schoolSmtpFromSettings(settings) ?? undefined;
    if (settings.feeReminderEnabled === false && !body.force) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        failed: 0,
        skipped: true,
        message: "Fee reminders disabled",
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const day = new Date().getUTCDate();
    const scheduleDays = settings.feeReminderDaysOfMonth?.length
      ? settings.feeReminderDaysOfMonth
      : [1, 5, 10];

    if (!body.force) {
      if (!scheduleDays.includes(day)) {
        return NextResponse.json({
          ok: true,
          sent: 0,
          failed: 0,
          skipped: true,
          message: `Not a scheduled day (runs on ${scheduleDays.join(", ")} of month)`,
        });
      }
      if (settings.lastFeeReminderAt === today) {
        return NextResponse.json({
          ok: true,
          sent: 0,
          failed: 0,
          skipped: true,
          message: "Already sent fee reminders today",
        });
      }
    }

    const channels: NotifyChannel[] = (
      body.channels?.length
        ? body.channels
        : settings.feeReminderChannels?.length
          ? settings.feeReminderChannels
          : ["email"]
    ).filter((c) => c !== "whatsapp");
    const locale: AlertLocale = body.locale ?? settings.feeReminderLocale ?? "both";
    const schoolName = workspace.institute?.name ?? "School";
    const students = workspace.students ?? [];
    const fees = workspace.fees ?? [];

    const defaulters = new Map<
      string,
      { student: Student; month: string; balance: number }
    >();

    for (const fee of fees) {
      const bal = Math.max(0, fee.amount - fee.paid);
      if (bal <= 0) continue;
      if (body.overdueOnly && fee.status !== "overdue") continue;
      if (
        !body.overdueOnly &&
        fee.status !== "pending" &&
        fee.status !== "partial" &&
        fee.status !== "overdue"
      ) {
        continue;
      }
      const student = students.find((s) => s.id === fee.studentId);
      if (!student || student.status !== "active") continue;
      const prev = defaulters.get(student.id);
      if (!prev) {
        defaulters.set(student.id, { student, month: fee.month, balance: bal });
      } else {
        prev.balance += bal;
        prev.month = `${prev.month}, ${fee.month}`;
      }
    }

    let sent = 0;
    let failed = 0;
    const results: { studentId: string; channel: string; ok: boolean; detail?: string }[] = [];

    for (const { student, month, balance } of defaulters.values()) {
      const contact = guardianContactsForStudent(student);
      const msg = feeReminderMessage({
        studentName: contact.studentName,
        month,
        balance: formatCurrency(balance),
        schoolName,
        locale,
      });

      for (const channel of channels) {
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
          template: "fee_reminder",
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

    await saveSchoolWorkspace(tenantId, {
      ...workspace,
      alertSettings: {
        ...settings,
        lastFeeReminderAt: today,
      },
    });

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      defaulters: defaulters.size,
      message: `Fee reminders: ${sent} sent to ${defaulters.size} defaulter(s), ${failed} failed`,
      results,
    });
  } catch (error) {
    console.error("[api/notify/fee-reminders]", error);
    return NextResponse.json({ error: "Fee reminders failed" }, { status: 500 });
  }
}
