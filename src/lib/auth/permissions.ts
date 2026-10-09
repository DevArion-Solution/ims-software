import type { SessionPayload } from "./types";

/** Platform permission strings used in PlatformUser.permissions */
export const PLATFORM_PERMS = {
  ALL: "*",
  SCHOOLS_READ: "schools.read",
  SCHOOLS_IMPERSONATE: "schools.impersonate",
  REGISTRATIONS_MANAGE: "registrations.manage",
  PLANS_READ: "plans.read",
  PLANS_MANAGE: "plans.manage",
  BILLING_READ: "billing.read",
  BILLING_MANAGE: "billing.manage",
  INVOICES_MANAGE: "invoices.manage",
  AUDIT_READ: "audit.read",
  USERS_MANAGE: "users.manage",
  SETTINGS_MANAGE: "settings.manage",
} as const;

export function hasPermission(session: SessionPayload, permission: string): boolean {
  if (session.portal !== "super") return false;
  const perms = session.permissions ?? [];
  if (perms.includes(PLATFORM_PERMS.ALL)) return true;
  return perms.includes(permission);
}

export function hasAnyPermission(session: SessionPayload, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(session, p));
}

/** Can read platform data (dashboard, schools list, etc.) */
export function canReadPlatform(session: SessionPayload): boolean {
  return hasAnyPermission(session, [
    PLATFORM_PERMS.ALL,
    PLATFORM_PERMS.SCHOOLS_READ,
    PLATFORM_PERMS.REGISTRATIONS_MANAGE,
    PLATFORM_PERMS.PLANS_READ,
    PLATFORM_PERMS.BILLING_READ,
    PLATFORM_PERMS.AUDIT_READ,
  ]);
}

/** Can write platform data (full save) */
export function canWritePlatform(session: SessionPayload): boolean {
  return hasAnyPermission(session, [
    PLATFORM_PERMS.ALL,
    PLATFORM_PERMS.REGISTRATIONS_MANAGE,
    PLATFORM_PERMS.BILLING_MANAGE,
    PLATFORM_PERMS.INVOICES_MANAGE,
    PLATFORM_PERMS.PLANS_MANAGE,
    PLATFORM_PERMS.USERS_MANAGE,
    PLATFORM_PERMS.SETTINGS_MANAGE,
  ]);
}

export function canImpersonate(session: SessionPayload): boolean {
  return hasAnyPermission(session, [PLATFORM_PERMS.ALL, PLATFORM_PERMS.SCHOOLS_IMPERSONATE]);
}

export function canResetPlatform(session: SessionPayload): boolean {
  return hasPermission(session, PLATFORM_PERMS.ALL);
}

export function canManageWorkspaces(session: SessionPayload): boolean {
  return hasAnyPermission(session, [
    PLATFORM_PERMS.ALL,
    PLATFORM_PERMS.REGISTRATIONS_MANAGE,
    PLATFORM_PERMS.SCHOOLS_IMPERSONATE,
  ]);
}

/** School portal user can access tenant data */
export function canAccessTenant(session: SessionPayload, tenantId: string): boolean {
  if (session.portal === "super") {
    // Super admin can read any tenant when impersonating or for support
    return (
      session.impersonatingSchoolId === tenantId ||
      hasPermission(session, PLATFORM_PERMS.ALL) ||
      hasPermission(session, PLATFORM_PERMS.SCHOOLS_READ) ||
      hasPermission(session, PLATFORM_PERMS.SCHOOLS_IMPERSONATE)
    );
  }
  const ownTenant = session.tenantId;
  return ownTenant === tenantId;
}

export function portalForPath(pathname: string): SessionPayload["portal"] | null {
  if (pathname.startsWith("/super-admin")) return "super";
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admissions") ||
    pathname.startsWith("/students") ||
    pathname.startsWith("/academics") ||
    pathname.startsWith("/attendance") ||
    pathname.startsWith("/exams") ||
    pathname.startsWith("/fees") ||
    pathname.startsWith("/accounts") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/library") ||
    pathname.startsWith("/transport") ||
    pathname.startsWith("/hostel") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/communication") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings")
  ) {
    return "admin";
  }
  if (pathname.startsWith("/teacher")) return "teacher";
  if (pathname.startsWith("/accountant")) return "accountant";
  if (pathname.startsWith("/parent")) return "parent";
  if (pathname.startsWith("/student")) return "student";
  if (pathname.startsWith("/principal")) return "principal";
  if (pathname.startsWith("/librarian")) return "librarian";
  if (pathname.startsWith("/receptionist")) return "receptionist";
  return null;
}
