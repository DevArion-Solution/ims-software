import { NextResponse } from "next/server";
import { getSessionFromCookies, sessionToClient } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ session: null });
    }
    return NextResponse.json({ session: sessionToClient(session) });
  } catch (error) {
    console.error("[api/auth/session GET]", error);
    return NextResponse.json({ session: null });
  }
}
