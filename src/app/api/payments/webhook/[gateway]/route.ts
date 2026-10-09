import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { markPlatformInvoicePaid } from "@/lib/db/platform-repo";
import { verifyEasypaisaWebhook } from "@/lib/integrations/easypaisa";
import { verifyJazzCashWebhook } from "@/lib/integrations/jazzcash";
import { verifyStripeWebhook } from "@/lib/integrations/stripe";

export const dynamic = "force-dynamic";

/**
 * Gateway callback / IPN.
 * Platform invoices settle here; parent fee ledger settles on client confirm.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gateway: string }> },
) {
  const { gateway } = await context.params;
  try {
    if (gateway === "stripe") {
      const rawBody = await request.text();
      const signature = request.headers.get("stripe-signature");
      const verified = verifyStripeWebhook(rawBody, signature);
      console.info(`[payments/webhook/stripe]`, verified);
      if (!verified.ok) {
        return NextResponse.json(
          { ok: false, error: verified.error ?? "Verification failed" },
          { status: 400 },
        );
      }

      if (verified.kind === "platform_invoice" && verified.invoiceId) {
        const paid = await markPlatformInvoicePaid(verified.invoiceId, "stripe-webhook");
        return NextResponse.json({
          ok: paid.ok,
          gateway: "stripe",
          eventType: verified.eventType,
          kind: verified.kind,
          invoiceId: verified.invoiceId,
          txnRef: verified.txnRef,
          amount: verified.amount,
          message: paid.ok ? "Platform invoice marked paid" : paid.error,
        });
      }

      return NextResponse.json({
        ok: true,
        gateway: "stripe",
        eventType: verified.eventType,
        kind: verified.kind,
        txnRef: verified.txnRef,
        feeId: verified.feeId,
        amount: verified.amount,
        message: "Stripe webhook accepted",
      });
    }

    const contentType = request.headers.get("content-type") ?? "";
    let body: Record<string, string> = {};
    if (contentType.includes("application/json")) {
      body = (await request.json()) as Record<string, string>;
    } else {
      const form = await request.formData();
      form.forEach((v, k) => {
        body[k] = String(v);
      });
    }

    const verified =
      gateway === "jazzcash"
        ? verifyJazzCashWebhook(body)
        : gateway === "easypaisa"
          ? verifyEasypaisaWebhook(body)
          : { ok: false, error: "Unknown gateway" };

    console.info(`[payments/webhook/${gateway}]`, verified);

    if (!verified.ok) {
      return NextResponse.json(
        { ok: false, error: verified.error ?? "Verification failed" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      gateway,
      txnRef: verified.txnRef,
      feeId: verified.feeId,
      amount: verified.amount,
      message: "Webhook accepted — settle fee via confirm/client ledger",
    });
  } catch (error) {
    console.error(`[api/payments/webhook/${gateway}]`, error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gateway: string }> },
) {
  // Some gateways redirect with query params
  const { gateway } = await context.params;
  const url = new URL(request.url);
  const body: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    body[k] = v;
  });
  const fake = new Request(request.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(fake as NextRequest, context);
}
