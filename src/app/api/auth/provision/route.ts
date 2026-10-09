import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/api-auth";
import { canAccessTenant, canManageWorkspaces } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { generateTempPassword } from "@/lib/platform/billing";
import {
  appendPlatformAudit,
  createOrResetPortalAccount,
} from "@/lib/db/platform-repo";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

function roleToPortal(role: string): {
  portal: string;
  role: string;
} {
  switch (role) {
    case "teacher":
      return { portal: "teacher", role: "teacher" };
    case "accountant":
      return { portal: "accountant", role: "accountant" };
    case "parent":
      return { portal: "parent", role: "parent" };
    case "student":
      return { portal: "student", role: "student" };
    case "principal":
      return { portal: "principal", role: "principal" };
    case "librarian":
      return { portal: "librarian", role: "librarian" };
    case "receptionist":
      return { portal: "receptionist", role: "receptionist" };
    case "institute_admin":
    default:
      return { portal: "admin", role: role || "institute_admin" };
  }
}

/**
 * Provision (or reset) a portal AuthAccount for a school tenant.
 * Allowed: Super Admin (workspace manage) OR school admin for own tenant.
 */
export async function POST(request: Request) {
  const req = request as NextRequest;
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      tenantId?: string;
      email?: string;
      name?: string;
      role?: UserRole | string;
      resetPassword?: boolean;
      linkedStaffId?: string;
    };

    if (!body.tenantId || !body.email?.trim() || !body.name?.trim()) {
      return NextResponse.json(
        { error: "tenantId, email and name are required" },
        { status: 400 },
      );
    }

    const tenantId = body.tenantId;
    const isPlatform = auth.session.portal === "super" && canManageWorkspaces(auth.session);
    const isSchoolAdmin =
      (auth.session.portal === "admin" || !!auth.session.impersonatingSchoolId) &&
      canAccessTenant(auth.session, tenantId);

    if (!isPlatform && !isSchoolAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // School admins may only create school portal users (not super_admin)
    const role = body.role ?? "institute_admin";
    if (!isPlatform && role === "super_admin") {
      return NextResponse.json({ error: "Cannot create super admin" }, { status: 403 });
    }

    const mapped = roleToPortal(role);
    const password = generateTempPassword();
    const hashed = await hashPassword(password);

    const account = await createOrResetPortalAccount({
      tenantId,
      email: body.email.trim().toLowerCase(),
      name: body.name.trim(),
      passwordHash: hashed,
      role: mapped.role,
      portal: mapped.portal,
      linkedStaffId: body.linkedStaffId ?? null,
      description: `${mapped.role} for ${tenantId}`,
    });

    if (isPlatform) {
      await appendPlatformAudit({
        actor: auth.session.email,
        action: body.resetPassword ? "reset_portal_password" : "provision_portal_account",
        target: body.email.trim().toLowerCase(),
        detail: `Tenant ${tenantId} · ${mapped.portal}/${mapped.role}`,
      });
    }

    return NextResponse.json({
      ok: true,
      email: account.email,
      password,
      tenantId,
      portal: mapped.portal,
      role: mapped.role,
      message: "Share these credentials with the user. Password is shown once.",
    });
  } catch (error) {
    console.error("[api/auth/provision POST]", error);
    return NextResponse.json({ error: "Failed to provision account" }, { status: 500 });
  }
}
