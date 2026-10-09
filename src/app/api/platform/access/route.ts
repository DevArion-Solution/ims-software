import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/api-auth";
import { canAccessTenant } from "@/lib/auth/permissions";
import { getTenantAccessById } from "@/lib/db/platform-repo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const req = request as import("next/server").NextRequest;
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    }

    if (!canAccessTenant(auth.session, tenantId)) {
      return NextResponse.json({ error: "Forbidden — wrong tenant" }, { status: 403 });
    }

    const access = await getTenantAccessById(tenantId);
    if (!access) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    return NextResponse.json(access);
  } catch (error) {
    console.error("[api/platform/access GET]", error);
    return NextResponse.json({ error: "Failed to load tenant access" }, { status: 500 });
  }
}
