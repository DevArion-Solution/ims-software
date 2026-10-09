import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { buildSessionPayload, sessionToClient, setSessionCookie } from "@/lib/auth/session";
import { findAuthAccountByEmail, getPlatformUserPermissions } from "@/lib/db/platform-repo";
import { getTenantAccessById } from "@/lib/db/platform-repo";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email?.trim() || !body.password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const account = await findAuthAccountByEmail(body.email);
    if (!account || !account.active) {
      return NextResponse.json({ ok: false, error: "Account not found" }, { status: 401 });
    }

    const valid = await verifyPassword(body.password, account.password);
    if (!valid) {
      return NextResponse.json({ ok: false, error: "Incorrect password" }, { status: 401 });
    }

    // Block suspended/expired schools at login for all school portals
    if (account.portal !== "super" && account.tenantId) {
      const access = await getTenantAccessById(account.tenantId);
      if (access && !access.canOperate) {
        return NextResponse.json(
          { ok: false, error: access.blockReason ?? "School access is blocked." },
          { status: 403 },
        );
      }
    }

    const permissions =
      account.portal === "super"
        ? await getPlatformUserPermissions(account.email)
        : [];

    const payload = buildSessionPayload(account, permissions);
    await setSessionCookie(payload);

    return NextResponse.json({
      ok: true,
      session: sessionToClient(payload),
      portal: account.portal,
    });
  } catch (error) {
    console.error("[api/auth/login POST]", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
