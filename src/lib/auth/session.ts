import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { ClientSession, SessionPayload } from "./types";
import { RETURN_COOKIE, SESSION_COOKIE, SESSION_MAX_AGE } from "./types";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set (min 16 chars) in production");
    }
    return "ims-dev-session-secret-change-me";
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(payload: string): Promise<string> {
  const key = await importKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

async function verifySignature(payload: string, signature: string): Promise<boolean> {
  try {
    const key = await importKey(getSecret());
    const sigBytes = new Uint8Array(fromBase64Url(signature));
    return crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
}

export async function encodeSession(payload: SessionPayload): Promise<string> {
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await signPayload(body);
  return `${body}.${sig}`;
}

export async function decodeSession(token: string): Promise<SessionPayload | null> {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!(await verifySignature(body, sig))) return null;
  try {
    const json = new TextDecoder().decode(fromBase64Url(body));
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionToClient(payload: SessionPayload): ClientSession {
  const tenantId = payload.impersonatingSchoolId ?? payload.tenantId;
  return {
    user: {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      instituteId: payload.portal === "super" ? "platform" : (tenantId ?? "sch_horizon"),
      campusId: payload.portal === "super" ? undefined : "camp1",
    },
    portal: payload.portal,
    tenantId: payload.tenantId,
    linkedStudentId: payload.linkedStudentId,
    linkedStudentIds: payload.linkedStudentIds,
    linkedStaffId: payload.linkedStaffId,
    impersonatingSchoolId: payload.impersonatingSchoolId,
    impersonatingSchoolName: payload.impersonatingSchoolName,
    permissions: payload.permissions ?? [],
  };
}

export function buildSessionPayload(
  account: {
    id: string;
    email: string;
    name: string;
    role: string;
    portal: string;
    tenantId?: string | null;
    linkedStudentId?: string | null;
    linkedStudentIds?: string[];
    linkedStaffId?: string | null;
  },
  permissions: string[],
  overrides?: Partial<
    Pick<SessionPayload, "impersonatingSchoolId" | "impersonatingSchoolName" | "portal" | "role">
  >,
): SessionPayload {
  const now = Date.now();
  return {
    sub: account.id,
    email: account.email,
    name: account.name,
    role: account.role as SessionPayload["role"],
    portal: (overrides?.portal ?? account.portal) as SessionPayload["portal"],
    tenantId: account.tenantId ?? undefined,
    linkedStudentId: account.linkedStudentId ?? undefined,
    linkedStudentIds: account.linkedStudentIds?.length ? account.linkedStudentIds : undefined,
    linkedStaffId: account.linkedStaffId ?? undefined,
    impersonatingSchoolId: overrides?.impersonatingSchoolId,
    impersonatingSchoolName: overrides?.impersonatingSchoolName,
    permissions,
    iat: now,
    exp: now + SESSION_MAX_AGE * 1000,
  };
}

export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function setSessionCookie(payload: SessionPayload): Promise<string> {
  const token = await encodeSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return token;
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function setReturnSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await encodeSession(payload);
  const store = await cookies();
  store.set(RETURN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function getReturnSessionFromCookies(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(RETURN_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function clearReturnSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(RETURN_COOKIE);
}

export function resolveEffectiveTenantId(session: SessionPayload): string {
  if (session.impersonatingSchoolId) return session.impersonatingSchoolId;
  if (session.portal === "super") return session.tenantId ?? "sch_horizon";
  return session.tenantId ?? "sch_horizon";
}
