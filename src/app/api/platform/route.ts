import { NextResponse } from "next/server";
import { requirePlatformRead, requirePlatformWrite } from "@/lib/auth/api-auth";
import { getPlatformData, savePlatformData } from "@/lib/db/platform-repo";
import type { PlatformData } from "@/types/platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePlatformRead(request as import("next/server").NextRequest);
  if (!auth.ok) return auth.response;

  try {
    const data = await getPlatformData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/platform GET]", error);
    return NextResponse.json(
      { error: "Failed to load platform data from PostgreSQL" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requirePlatformWrite(request as import("next/server").NextRequest);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as PlatformData;
    if (!body?.settings || !Array.isArray(body.schools)) {
      return NextResponse.json({ error: "Invalid platform payload" }, { status: 400 });
    }
    await savePlatformData(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/platform PUT]", error);
    return NextResponse.json({ error: "Failed to save platform data" }, { status: 500 });
  }
}
