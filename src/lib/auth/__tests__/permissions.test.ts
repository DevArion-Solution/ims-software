import { describe, expect, it } from "vitest";
import {
  canAccessTenant,
  canImpersonate,
  canReadPlatform,
  canWritePlatform,
  hasPermission,
  portalForPath,
  PLATFORM_PERMS,
} from "@/lib/auth/permissions";
import type { SessionPayload } from "@/lib/auth/types";

function session(partial: Partial<SessionPayload>): SessionPayload {
  return {
    sub: "u1",
    email: "test@test.com",
    name: "Test",
    role: "institute_admin",
    portal: "admin",
    permissions: [],
    exp: Date.now() / 1000 + 3600,
    iat: Date.now() / 1000,
    ...partial,
  };
}

describe("hasPermission", () => {
  it("grants all with * permission", () => {
    const s = session({ portal: "super", permissions: [PLATFORM_PERMS.ALL] });
    expect(hasPermission(s, PLATFORM_PERMS.BILLING_MANAGE)).toBe(true);
  });

  it("denies school portal users platform perms", () => {
    const s = session({ portal: "admin", tenantId: "sch_horizon" });
    expect(hasPermission(s, PLATFORM_PERMS.ALL)).toBe(false);
  });
});

describe("canAccessTenant — multi-tenant isolation", () => {
  it("allows school user only their tenant", () => {
    const s = session({ portal: "admin", tenantId: "sch_horizon" });
    expect(canAccessTenant(s, "sch_horizon")).toBe(true);
    expect(canAccessTenant(s, "sch_other")).toBe(false);
  });

  it("allows super admin with impersonate permission for support access", () => {
    const s = session({
      portal: "super",
      permissions: [PLATFORM_PERMS.SCHOOLS_IMPERSONATE],
      impersonatingSchoolId: "sch_green",
    });
    expect(canAccessTenant(s, "sch_green")).toBe(true);
    // impersonate permission also grants cross-tenant read for support tooling
    expect(canAccessTenant(s, "sch_horizon")).toBe(true);
  });

  it("allows super admin with schools.read for any tenant", () => {
    const s = session({
      portal: "super",
      permissions: [PLATFORM_PERMS.SCHOOLS_READ],
    });
    expect(canAccessTenant(s, "sch_any")).toBe(true);
  });
});

describe("platform RBAC", () => {
  it("canReadPlatform with schools.read", () => {
    const s = session({ portal: "super", permissions: [PLATFORM_PERMS.SCHOOLS_READ] });
    expect(canReadPlatform(s)).toBe(true);
    expect(canWritePlatform(s)).toBe(false);
  });

  it("canWritePlatform with billing.manage", () => {
    const s = session({ portal: "super", permissions: [PLATFORM_PERMS.BILLING_MANAGE] });
    expect(canWritePlatform(s)).toBe(true);
  });

  it("canImpersonate requires schools.impersonate or *", () => {
    expect(
      canImpersonate(session({ portal: "super", permissions: [PLATFORM_PERMS.SCHOOLS_READ] })),
    ).toBe(false);
    expect(
      canImpersonate(
        session({ portal: "super", permissions: [PLATFORM_PERMS.SCHOOLS_IMPERSONATE] }),
      ),
    ).toBe(true);
  });
});

describe("portalForPath", () => {
  it("maps admin and role portal routes", () => {
    expect(portalForPath("/dashboard")).toBe("admin");
    expect(portalForPath("/students/123")).toBe("admin");
    expect(portalForPath("/teacher/attendance")).toBe("teacher");
    expect(portalForPath("/parent/fees")).toBe("parent");
    expect(portalForPath("/super-admin/schools")).toBe("super");
    expect(portalForPath("/principal/approvals")).toBe("principal");
    expect(portalForPath("/login")).toBe(null);
  });
});
