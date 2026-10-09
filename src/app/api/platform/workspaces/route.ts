import { NextResponse } from "next/server";
import { requireWorkspaceManage } from "@/lib/auth/api-auth";
import { ensureSchoolWorkspace } from "@/lib/db/platform-repo";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireWorkspaceManage(request as import("next/server").NextRequest);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      tenantId?: string;
      school?: {
        name: string;
        shortName: string;
        type: string;
        city: string;
        address: string;
        phone: string;
        email: string;
        countryCode?: string;
      };
    };
    if (!body.tenantId || !body.school) {
      return NextResponse.json({ error: "tenantId and school required" }, { status: 400 });
    }
    await ensureSchoolWorkspace(body.tenantId, body.school);
    return NextResponse.json({ ok: true, tenantId: body.tenantId });
  } catch (error) {
    console.error("[api/platform/workspaces POST]", error);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
