import type { PlatformModuleId, SchoolTenant } from "@/types/platform";
import type { PlatformPlan } from "@/types/platform";

export interface TenantAccess {
  tenantId: string;
  schoolName: string;
  status: SchoolTenant["status"];
  planId: string;
  planName: string;
  modules: PlatformModuleId[];
  maxStudents: number;
  maxStaff: number;
  maxCampuses: number;
  studentsCount: number;
  staffCount: number;
  campusesCount: number;
  canOperate: boolean;
  blockReason?: string;
}

export function resolveEffectiveModules(
  school: Pick<SchoolTenant, "modulesOverride" | "planId">,
  plan?: Pick<PlatformPlan, "modules"> | null,
): PlatformModuleId[] {
  if (school.modulesOverride?.length) return school.modulesOverride;
  return (plan?.modules ?? []) as PlatformModuleId[];
}

export function buildTenantAccess(
  school: SchoolTenant,
  plan: PlatformPlan | undefined,
): TenantAccess {
  const modules = resolveEffectiveModules(school, plan);
  const maxStudents = school.maxStudentsOverride ?? plan?.maxStudents ?? 999999;
  const maxStaff = school.maxStaffOverride ?? plan?.maxStaff ?? 999999;
  const maxCampuses = plan?.maxCampuses ?? 1;

  let canOperate = true;
  let blockReason: string | undefined;

  if (school.status === "suspended") {
    canOperate = false;
    blockReason = "This school has been suspended by the platform administrator.";
  } else if (school.status === "expired") {
    canOperate = false;
    blockReason = "Subscription expired. Contact platform support to renew.";
  } else if (school.status === "pending" || school.status === "rejected") {
    canOperate = false;
    blockReason = "School is not yet active on the platform.";
  }

  return {
    tenantId: school.id,
    schoolName: school.name,
    status: school.status,
    planId: school.planId,
    planName: plan?.name ?? "—",
    modules,
    maxStudents,
    maxStaff,
    maxCampuses,
    studentsCount: school.studentsCount,
    staffCount: school.staffCount,
    campusesCount: school.campusesCount,
    canOperate,
    blockReason,
  };
}

/** Admin nav module id → platform module id (same for most) */
export function navModuleToPlatform(navId: string): PlatformModuleId | null {
  const map: Record<string, PlatformModuleId> = {
    dashboard: "dashboard",
    admissions: "admissions",
    students: "students",
    academics: "academics",
    attendance: "attendance",
    exams: "exams",
    fees: "fees",
    accounts: "accounts",
    staff: "staff",
    library: "library",
    transport: "transport",
    hostel: "hostel",
    inventory: "inventory",
    communication: "communication",
    reports: "reports",
    settings: "settings",
  };
  return map[navId] ?? null;
}

export function portalModuleKey(
  portal:
    | "teacher"
    | "accountant"
    | "parent"
    | "student"
    | "principal"
    | "librarian"
    | "receptionist",
): PlatformModuleId {
  return `${portal}_portal` as PlatformModuleId;
}
