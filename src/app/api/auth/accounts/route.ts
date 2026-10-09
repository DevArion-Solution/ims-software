import { NextResponse } from "next/server";
import { getAuthAccountPublicList } from "@/lib/db/platform-repo";

export const dynamic = "force-dynamic";

/** Public demo account list for login page — passwords never exposed */
export async function GET() {
  try {
    const accounts = await getAuthAccountPublicList();
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("[api/auth/accounts GET]", error);
    return NextResponse.json({ error: "Failed to load accounts" }, { status: 500 });
  }
}
