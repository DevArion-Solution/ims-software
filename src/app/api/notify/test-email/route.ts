import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, requireTenantAccess } from "@/lib/auth/api-auth";
import { resolveEffectiveTenantId } from "@/lib/auth/session";
import { getSchoolWorkspace, saveSchoolWorkspace } from "@/lib/db/platform-repo";
import { sendTestEmail, schoolSmtpFromSettings } from "@/lib/integrations";
import {
  isValidAppPassword,
  isValidGmailUser,
  normalizeAppPassword,
} from "@/lib/integrations/school-smtp";
import type { AlertSettings } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Save (optional) + test school Gmail with App Password.
 * Body: { to?, gmailUser?, gmailAppPassword?, gmailFromName?, save?: boolean }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const portal = auth.session.portal;
  if (portal !== "admin" && portal !== "super" && portal !== "principal") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = resolveEffectiveTenantId(auth.session);
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }
  const tenantAuth = await requireTenantAccess(request, tenantId, { write: true });
  if (!tenantAuth.ok) return tenantAuth.response;

  try {
    const body = (await request.json()) as {
      to?: string;
      gmailUser?: string;
      gmailAppPassword?: string;
      gmailFromName?: string;
      save?: boolean;
    };

    const workspace = (await getSchoolWorkspace(tenantId)) as {
      institute?: { name?: string };
      alertSettings?: Partial<AlertSettings>;
      [key: string]: unknown;
    } | null;

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const prev = workspace.alertSettings ?? {};
    const gmailUser = (body.gmailUser ?? prev.gmailUser ?? "").trim();
    const gmailAppPassword = normalizeAppPassword(
      body.gmailAppPassword || prev.gmailAppPassword,
    );
    const gmailFromName = (body.gmailFromName ?? prev.gmailFromName ?? "").trim();

    if (!isValidGmailUser(gmailUser)) {
      return NextResponse.json(
        { error: "Enter a valid school Gmail address" },
        { status: 400 },
      );
    }
    if (!isValidAppPassword(gmailAppPassword)) {
      return NextResponse.json(
        {
          error:
            "Enter the 16-character Google App Password (not your normal Gmail password)",
        },
        { status: 400 },
      );
    }

    const patch: Partial<AlertSettings> = {
      gmailUser,
      gmailAppPassword,
      gmailFromName: gmailFromName || undefined,
    };

    if (body.save !== false) {
      await saveSchoolWorkspace(tenantId, {
        ...workspace,
        alertSettings: { ...prev, ...patch },
      });
    }

    const smtp = schoolSmtpFromSettings(patch);
    if (!smtp) {
      return NextResponse.json({ error: "Gmail settings incomplete" }, { status: 400 });
    }

    const to = (body.to ?? gmailUser).trim();
    const result = await sendTestEmail({
      smtp,
      to,
      schoolName: workspace.institute?.name ?? "School",
    });

    if (result.ok && !result.sandbox && body.save !== false) {
      await saveSchoolWorkspace(tenantId, {
        ...workspace,
        alertSettings: {
          ...prev,
          ...patch,
          gmailVerifiedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      ok: result.ok,
      sandbox: result.sandbox,
      detail: result.detail,
      error: result.error,
      saved: body.save !== false,
      gmailUser,
      message: result.ok
        ? result.sandbox
          ? "Saved, but send was sandbox — check credentials"
          : `Test email sent to ${to}. School Gmail is ready.`
        : result.error ?? "Send failed",
    });
  } catch (error) {
    console.error("[api/notify/test-email]", error);
    return NextResponse.json({ error: "Test email failed" }, { status: 500 });
  }
}
