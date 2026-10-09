import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, requireTenantAccess } from "@/lib/auth/api-auth";
import { resolveEffectiveTenantId } from "@/lib/auth/session";
import { getSchoolBillingBundle } from "@/lib/db/platform-repo";

export const dynamic = "force-dynamic";

/** School Admin — own plan + platform invoices */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const portal = auth.session.portal;
  if (portal !== "admin" && portal !== "super" && portal !== "accountant") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = resolveEffectiveTenantId(auth.session);
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant on session" }, { status: 400 });
  }

  const tenantAuth = await requireTenantAccess(request, tenantId);
  if (!tenantAuth.ok) return tenantAuth.response;

  try {
    const bundle = await getSchoolBillingBundle(tenantId);
    if (!bundle) {
      return NextResponse.json({ error: "School not found on platform" }, { status: 404 });
    }
    return NextResponse.json(bundle);
  } catch (error) {
    console.error("[api/school/billing GET]", error);
    return NextResponse.json({ error: "Failed to load billing" }, { status: 500 });
  }
}
