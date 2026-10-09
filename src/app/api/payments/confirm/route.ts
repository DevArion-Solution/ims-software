import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/api-auth";
import { resolveEffectiveTenantId } from "@/lib/auth/session";
import { verifyStripeCheckoutSession } from "@/lib/integrations/stripe";
import type { PaymentGateway } from "@/lib/integrations/types";

export const dynamic = "force-dynamic";

/**
 * Confirm a sandbox (or pre-verified) payment intent.
 * Client then applies payFeeOnline with the returned txnRef.
 * GET used for redirect return; POST for modal confirm.
 * Stripe live: pass sessionId from Checkout return URL.
 */
export async function GET(request: NextRequest) {
  return confirm(request);
}

export async function POST(request: NextRequest) {
  return confirm(request);
}

async function confirm(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  let gateway = url.searchParams.get("gateway") as PaymentGateway | null;
  let txnRef = url.searchParams.get("txnRef");
  let feeId = url.searchParams.get("feeId");
  let amount = Number(url.searchParams.get("amount") ?? "0");
  let sandbox = url.searchParams.get("sandbox") === "1";
  let sessionId = url.searchParams.get("session_id") ?? url.searchParams.get("sessionId");

  if (request.method === "POST") {
    try {
      const body = (await request.json()) as {
        gateway?: PaymentGateway;
        txnRef?: string;
        feeId?: string;
        amount?: number;
        sandbox?: boolean;
        sessionId?: string;
        session_id?: string;
      };
      gateway = body.gateway ?? gateway;
      txnRef = body.txnRef ?? txnRef;
      feeId = body.feeId ?? feeId;
      amount = body.amount ?? amount;
      sandbox = body.sandbox ?? sandbox;
      sessionId = body.sessionId ?? body.session_id ?? sessionId;
    } catch {
      // keep query params
    }
  }

  const tenantId = resolveEffectiveTenantId(auth.session);
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant on session" }, { status: 400 });
  }

  // Live Stripe Checkout return — verify session with Stripe API
  if (gateway === "stripe" && sessionId && !sandbox) {
    const verified = await verifyStripeCheckoutSession(sessionId);
    if (!verified.ok) {
      return NextResponse.json(
        { ok: false, error: verified.error ?? "Stripe verification failed" },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      sandbox: false,
      gateway: "stripe",
      txnRef: verified.txnRef,
      feeId: verified.feeId,
      amount: verified.amount,
      tenantId,
      message: "Stripe payment verified — apply to fee ledger on client.",
    });
  }

  if (!gateway || !txnRef || !feeId || !amount) {
    return NextResponse.json(
      { error: "gateway, txnRef, feeId and amount required" },
      { status: 400 },
    );
  }

  // Sandbox / verified intent — client settles ledger via DataProvider
  return NextResponse.json({
    ok: true,
    sandbox,
    gateway,
    txnRef,
    feeId,
    amount,
    tenantId,
    message: sandbox
      ? "Sandbox payment confirmed — apply to fee ledger on client."
      : "Payment verified — apply to fee ledger on client.",
  });
}
