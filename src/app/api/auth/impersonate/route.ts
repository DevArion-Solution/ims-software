import { NextResponse } from "next/server";
import {
  buildSessionPayload,
  clearReturnSessionCookie,
  getReturnSessionFromCookies,
  getSessionFromCookies,
  sessionToClient,
  setReturnSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session";
import { requireImpersonate } from "@/lib/auth/api-auth";
import { appendPlatformAudit, getTenantAccessById } from "@/lib/db/platform-repo";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireImpersonate(request as import("next/server").NextRequest);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      schoolId?: string;
      schoolName?: string;
      adminName?: string;
      adminEmail?: string;
    };

    if (!body.schoolId || !body.schoolName) {
      return NextResponse.json({ error: "schoolId and schoolName required" }, { status: 400 });
    }

    const access = await getTenantAccessById(body.schoolId);
    if (!access) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const current = auth.session;
    await setReturnSessionCookie(current);

    const impersonated = buildSessionPayload(
      {
        id: current.sub,
        email: body.adminEmail ?? current.email,
        name: `${body.adminName ?? "Admin"} (Support)`,
        role: "institute_admin",
        portal: "admin",
        tenantId: body.schoolId,
      },
      current.permissions,
      {
        portal: "admin",
        role: "institute_admin",
        impersonatingSchoolId: body.schoolId,
        impersonatingSchoolName: body.schoolName,
      },
    );

    await setSessionCookie(impersonated);

    await appendPlatformAudit({
      actor: current.email,
      action: "impersonate_school",
      target: body.schoolName,
      detail: `Opened as ${body.adminEmail ?? "admin"} · tenant ${body.schoolId}`,
    });

    return NextResponse.json({
      ok: true,
      session: sessionToClient(impersonated),
    });
  } catch (error) {
    console.error("[api/auth/impersonate POST]", error);
    return NextResponse.json({ error: "Impersonation failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const returnSession = await getReturnSessionFromCookies();
    const current = await getSessionFromCookies();

    if (!returnSession) {
      await clearReturnSessionCookie();
      if (current?.impersonatingSchoolId) {
        const restored = buildSessionPayload(
          {
            id: current.sub,
            email: current.email,
            name: current.name.replace(/ \(Support\)$/, ""),
            role: "super_admin",
            portal: "super",
          },
          current.permissions,
        );
        await setSessionCookie(restored);
        await appendPlatformAudit({
          actor: current.email,
          action: "exit_impersonation",
          target: current.impersonatingSchoolName ?? current.impersonatingSchoolId,
          detail: "Restored super admin session (no return cookie)",
        });
        return NextResponse.json({ ok: true, session: sessionToClient(restored) });
      }
      return NextResponse.json({ error: "No return session" }, { status: 400 });
    }

    await setSessionCookie(returnSession);
    await clearReturnSessionCookie();

    await appendPlatformAudit({
      actor: returnSession.email,
      action: "exit_impersonation",
      target: current?.impersonatingSchoolName ?? current?.impersonatingSchoolId ?? "school",
      detail: "Returned to Super Admin",
    });

    return NextResponse.json({ ok: true, session: sessionToClient(returnSession) });
  } catch (error) {
    console.error("[api/auth/impersonate DELETE]", error);
    return NextResponse.json({ error: "Exit impersonation failed" }, { status: 500 });
  }
}
