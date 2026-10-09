import type { ClientSession } from "@/lib/auth/types";

export const DEFAULT_TENANT_ID = "sch_horizon";

/** Maps auth session → PostgreSQL tenant id for school workspace */
export function resolveTenantId(session: ClientSession | null): string {
  if (!session) return DEFAULT_TENANT_ID;
  if (session.impersonatingSchoolId) return session.impersonatingSchoolId;
  if (session.tenantId) return session.tenantId;
  if (session.portal === "super") return DEFAULT_TENANT_ID;
  const id = session.user.instituteId;
  if (!id || id === "inst1" || id === "platform") return DEFAULT_TENANT_ID;
  return id;
}
