import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/api-auth";
import { resolveEffectiveTenantId } from "@/lib/auth/session";
import { getSchoolWorkspace } from "@/lib/db/platform-repo";
import {
  sendBulkNotifications,
  sendNotification,
  schoolSmtpFromSettings,
} from "@/lib/integrations";
import type { NotifyChannel } from "@/lib/integrations/types";
import type { AlertSettings } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Send SMS / email / WhatsApp.
 * Uses school Gmail from alert settings when channel is email.
 * Body: { channel, to?, name?, subject?, body, recipients?: [{to,name}] }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      channel?: NotifyChannel;
      to?: string;
      name?: string;
      subject?: string;
      body?: string;
      recipients?: { to: string; name?: string }[];
      template?: string;
    };

    if (!body.channel || !body.body?.trim()) {
      return NextResponse.json({ error: "channel and body required" }, { status: 400 });
    }

    let schoolSmtp = undefined;
    if (body.channel === "email") {
      const tenantId = resolveEffectiveTenantId(auth.session);
      if (tenantId) {
        const workspace = (await getSchoolWorkspace(tenantId)) as {
          alertSettings?: Partial<AlertSettings>;
        } | null;
        schoolSmtp = schoolSmtpFromSettings(workspace?.alertSettings) ?? undefined;
      }
    }

    if (body.recipients?.length) {
      const result = await sendBulkNotifications(
        body.channel,
        body.recipients,
        body.body,
        body.subject,
        schoolSmtp,
      );
      return NextResponse.json({ ok: true, ...result });
    }

    if (!body.to) {
      return NextResponse.json({ error: "to or recipients required" }, { status: 400 });
    }

    const result = await sendNotification({
      channel: body.channel,
      to: body.to,
      name: body.name,
      subject: body.subject,
      body: body.body,
      template: body.template,
      smtp: schoolSmtp,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/notify/send]", error);
    return NextResponse.json({ error: "Notify failed" }, { status: 500 });
  }
}
