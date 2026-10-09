import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, requireTenantAccess } from "@/lib/auth/api-auth";
import { resolveEffectiveTenantId } from "@/lib/auth/session";
import { getSchoolBillingBundle } from "@/lib/db/platform-repo";
import { initiateStripePlatformInvoice } from "@/lib/integrations/stripe";

export const dynamic = "force-dynamic";

/** Start Stripe Checkout for a platform (IMS plan) invoice */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  if (auth.session.portal !== "admin" && auth.session.portal !== "super") {
    return NextResponse.json({ error: "Only school admin can pay plan invoices" }, { status: 403 });
  }

  if (process.env.STRIPE_DISABLED === "1") {
    return NextResponse.json({ error: "Stripe disabled" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { invoiceId?: string };
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
    if (!bundle) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const inv = bundle.invoices.find((i) => i.id === body.invoiceId);
    if (!inv) {
      return NextResponse.json({ error: "Invoice not found for this school" }, { status: 404 });
    }
    if (inv.status === "paid" || inv.status === "void") {
      return NextResponse.json({ error: `Invoice already ${inv.status}` }, { status: 400 });
    }

    const result = await initiateStripePlatformInvoice({
      invoiceId: inv.id,
      schoolId: inv.schoolId,
      schoolName: inv.schoolName,
      planName: inv.planName,
      amount: inv.amount,
      period: inv.period,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/school/billing/pay]", error);
    return NextResponse.json({ error: "Payment initiate failed" }, { status: 500 });
  }
}
