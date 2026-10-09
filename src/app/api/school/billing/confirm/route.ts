import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, requireTenantAccess } from "@/lib/auth/api-auth";
import { resolveEffectiveTenantId } from "@/lib/auth/session";
import { getSchoolBillingBundle, markPlatformInvoicePaid } from "@/lib/db/platform-repo";
import { verifyStripeCheckoutSession } from "@/lib/integrations/stripe";

export const dynamic = "force-dynamic";

/**
 * Confirm platform invoice payment after Stripe return (or sandbox).
 * Marks invoice paid + extends subscription in PostgreSQL.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  if (auth.session.portal !== "admin" && auth.session.portal !== "super") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      invoiceId?: string;
      sessionId?: string;
      sandbox?: boolean;
      txnRef?: string;
    };

    if (!body.invoiceId) {
      return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
    }

    const tenantId = resolveEffectiveTenantId(auth.session);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant on session" }, { status: 400 });
    }

    const tenantAuth = await requireTenantAccess(request, tenantId);
    if (!tenantAuth.ok) return tenantAuth.response;

    const bundle = await getSchoolBillingBundle(tenantId);
    const inv = bundle?.invoices.find((i) => i.id === body.invoiceId);
    if (!inv) {
      return NextResponse.json({ error: "Invoice not found for this school" }, { status: 404 });
    }

    let txnRef = body.txnRef;

    if (body.sessionId && !body.sandbox) {
      const verified = await verifyStripeCheckoutSession(body.sessionId);
      if (!verified.ok) {
        return NextResponse.json(
          { ok: false, error: verified.error ?? "Stripe verification failed" },
          { status: 400 },
        );
      }
      if (verified.kind === "platform_invoice" && verified.invoiceId !== body.invoiceId) {
        return NextResponse.json({ error: "Invoice mismatch" }, { status: 400 });
      }
      txnRef = verified.txnRef ?? txnRef;
    } else if (!body.sandbox) {
      return NextResponse.json(
        { error: "sessionId required for live Stripe confirm" },
        { status: 400 },
      );
    }

    const actor = auth.session.email || auth.session.name || "school-admin";
    const paid = await markPlatformInvoicePaid(body.invoiceId, actor);
    if (!paid.ok) {
      return NextResponse.json({ ok: false, error: paid.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      sandbox: Boolean(body.sandbox),
      invoice: paid.invoice,
      txnRef,
      message: body.sandbox
        ? "Sandbox plan payment confirmed — invoice marked paid."
        : "Stripe plan payment verified — invoice marked paid.",
    });
  } catch (error) {
    console.error("[api/school/billing/confirm]", error);
    return NextResponse.json({ error: "Confirm failed" }, { status: 500 });
  }
}
