import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, requireTenantAccess } from "@/lib/auth/api-auth";
import { resolveEffectiveTenantId } from "@/lib/auth/session";
import { getPlatformData, getSchoolWorkspace, getTenantAccessById } from "@/lib/db/platform-repo";
import { initiatePayment, isGatewayEnabled } from "@/lib/integrations";
import type { PaymentGateway } from "@/lib/integrations/types";

export const dynamic = "force-dynamic";

/**
 * Start JazzCash / Easypaisa / Stripe / card payment for a fee challan.
 * Sandbox returns a confirm URL; live returns gateway redirect (Stripe Checkout).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as {
      feeId?: string;
      amount?: number;
      gateway?: PaymentGateway;
    };

    if (!body.feeId || !body.amount || !body.gateway) {
      return NextResponse.json(
        { error: "feeId, amount and gateway are required" },
        { status: 400 },
      );
    }

    const tenantId = resolveEffectiveTenantId(auth.session);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant on session" }, { status: 400 });
    }

    const tenantAuth = await requireTenantAccess(request, tenantId);
    if (!tenantAuth.ok) return tenantAuth.response;

    const access = await getTenantAccessById(tenantId);
    if (access && !access.canOperate) {
      return NextResponse.json(
        { error: access.blockReason ?? "School access blocked" },
        { status: 403 },
      );
    }

    const platform = await getPlatformData();
    const flags = {
      jazzcashEnabled:
        platform.settings.jazzcashEnabled && process.env.JAZZCASH_DISABLED !== "1",
      easypaisaEnabled:
        platform.settings.easypaisaEnabled && process.env.EASYPAISA_DISABLED !== "1",
      stripeEnabled:
        platform.settings.stripeEnabled !== false && process.env.STRIPE_DISABLED !== "1",
    };
    if (!isGatewayEnabled(body.gateway, flags)) {
      return NextResponse.json({ error: "Gateway disabled by platform" }, { status: 403 });
    }

    const workspace = await getSchoolWorkspace(tenantId);
    const fees = (workspace as { fees?: { id: string; studentName: string; month: string; amount: number; paid: number }[] } | null)
      ?.fees;
    const fee = fees?.find((f) => f.id === body.feeId);
    if (!fee) {
      return NextResponse.json({ error: "Fee challan not found" }, { status: 404 });
    }

    const balance = Math.max(0, fee.amount - fee.paid);
    if (body.amount > balance + 0.01) {
      return NextResponse.json(
        { error: `Amount exceeds balance (${balance})` },
        { status: 400 },
      );
    }

    const result = await initiatePayment({
      gateway: body.gateway,
      amount: body.amount,
      feeId: fee.id,
      studentName: fee.studentName,
      month: fee.month,
      tenantId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/payments/initiate]", error);
    return NextResponse.json({ error: "Payment initiate failed" }, { status: 500 });
  }
}
