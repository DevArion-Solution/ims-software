import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/api-auth";
import { canAccessTenant } from "@/lib/auth/permissions";
import { resolveEffectiveTenantId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export async function POST(request: Request) {
  const auth = await requireAuth(request as NextRequest);
  if (!auth.ok) return auth.response;

  try {
    const form = await request.formData();
    const file = form.get("file");
    const label = String(form.get("label") ?? "Document");
    const tenantOverride = form.get("tenantId");
    const tenantId =
      typeof tenantOverride === "string" && tenantOverride
        ? tenantOverride
        : resolveEffectiveTenantId(auth.session);

    if (!canAccessTenant(auth.session, tenantId)) {
      return NextResponse.json({ error: "Forbidden — wrong tenant" }, { status: 403 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|webp)$/i)) {
      return NextResponse.json({ error: "Only PDF/JPG/PNG/WEBP allowed" }, { status: 400 });
    }

    const safeTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const ext = path.extname(file.name) || ".bin";
    const id = `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const fileName = `${id}${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", safeTenant);
    await mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, fileName), buffer);

    const url = `/uploads/${safeTenant}/${fileName}`;
    return NextResponse.json({
      ok: true,
      document: {
        id,
        label,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: url,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[api/uploads POST]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
