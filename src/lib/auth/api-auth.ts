import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTenantAccessById } from "@/lib/db/platform-repo";
import {
  canAccessTenant,
  canImpersonate,
  canManageWorkspaces,
  canReadPlatform,
  canResetPlatform,
  canWritePlatform,
} from "./permissions";
import { getSessionFromRequest, resolveEffectiveTenantId } from "./session";
import type { SessionPayload } from "./types";

export type AuthResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, session };
}

export async function requireSuperAdmin(request: NextRequest): Promise<AuthResult> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;
  if (auth.session.impersonatingSchoolId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden — super admin only" }, { status: 403 }),
    };
  }
  if (auth.session.portal !== "super") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden — super admin only" }, { status: 403 }),
    };
  }
  return auth;
}

export async function requirePlatformRead(request: NextRequest): Promise<AuthResult> {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth;
  if (!canReadPlatform(auth.session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden — insufficient permissions" }, { status: 403 }),
    };
  }
  return auth;
}

export async function requirePlatformWrite(request: NextRequest): Promise<AuthResult> {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth;
  if (!canWritePlatform(auth.session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden — insufficient permissions" }, { status: 403 }),
    };
  }
  return auth;
}

export async function requireImpersonate(request: NextRequest): Promise<AuthResult> {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth;
  if (!canImpersonate(auth.session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden — cannot impersonate" }, { status: 403 }),
    };
  }
  return auth;
}

export async function requirePlatformReset(request: NextRequest): Promise<AuthResult> {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth;
  if (!canResetPlatform(auth.session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden — owner only" }, { status: 403 }),
    };
  }
  return auth;
}

export async function requireWorkspaceManage(request: NextRequest): Promise<AuthResult> {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) return auth;
  if (!canManageWorkspaces(auth.session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden — insufficient permissions" }, { status: 403 }),
    };
  }
  return auth;
}

export async function requireTenantAccess(
  request: NextRequest,
  tenantId: string,
  options?: { write?: boolean },
): Promise<AuthResult> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;

  if (!canAccessTenant(auth.session, tenantId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden — wrong tenant" }, { status: 403 }),
    };
  }

  // Super admin reading without impersonation still allowed for support
  if (auth.session.portal === "super" && !auth.session.impersonatingSchoolId) {
    return auth;
  }

  const access = await getTenantAccessById(tenantId);
  if (!access) {
    return {
      ok: false,
      response: NextResponse.json({ error: "School not found" }, { status: 404 }),
    };
  }

  if (!access.canOperate) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: access.blockReason ?? "School access blocked" },
        { status: 403 },
      ),
    };
  }

  void options; // reserved for future granular write ACL

  return auth;
}

export function getSessionTenantId(session: SessionPayload): string {
  return resolveEffectiveTenantId(session);
}
