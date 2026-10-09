import { NextResponse } from "next/server";
import { clearReturnSessionCookie, clearSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearSessionCookie();
  await clearReturnSessionCookie();
  return NextResponse.json({ ok: true });
}
