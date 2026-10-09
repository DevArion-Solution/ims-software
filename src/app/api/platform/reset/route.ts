import { NextResponse } from "next/server";
import { execSync } from "node:child_process";
import { requirePlatformReset } from "@/lib/auth/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requirePlatformReset(request as import("next/server").NextRequest);
  if (!auth.ok) return auth.response;

  try {
    const cwd = process.cwd();
    execSync("npx tsx prisma/seed.ts", {
      cwd,
      stdio: "pipe",
      env: process.env,
    });
    return NextResponse.json({ ok: true, message: "Platform reseeded from PostgreSQL seed" });
  } catch (error) {
    console.error("[api/platform/reset POST]", error);
    return NextResponse.json({ error: "Failed to reset platform data" }, { status: 500 });
  }
}
