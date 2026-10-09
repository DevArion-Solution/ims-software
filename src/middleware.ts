import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { portalForPath } from "@/lib/auth/permissions";
import { decodeSession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/types";

const PUBLIC_PATHS = ["/login", "/register-school"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (pathname.startsWith("/api/auth/login")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await decodeSession(token) : null;

  // API routes — let route handlers return 401 JSON (except auth endpoints)
  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/auth/session") || pathname.startsWith("/api/auth/logout")) {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // Page routes — redirect to login if no session
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requiredPortal = portalForPath(pathname);
  if (requiredPortal) {
    const effectivePortal =
      session.impersonatingSchoolId && requiredPortal === "admin" ? "admin" : session.portal;

    if (effectivePortal !== requiredPortal) {
      const homes: Record<string, string> = {
        super: "/super-admin",
        admin: "/dashboard",
        teacher: "/teacher",
        accountant: "/accountant",
        parent: "/parent",
        student: "/student",
        principal: "/principal",
        librarian: "/librarian",
        receptionist: "/receptionist",
      };
      return NextResponse.redirect(new URL(homes[session.portal] ?? "/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
