import { randomBytes } from "crypto";
import Stripe from "stripe";
import { isIntegrationsSandbox, stripeConfig } from "./config";
import type { PaymentInitiateInput, PaymentInitiateResult } from "./types";

function txnRef() {
  return `ST-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function getStripe(): Stripe | null {
  const cfg = stripeConfig();
  if (!cfg.secretKey) return null;
  return new Stripe(cfg.secretKey, {
    apiVersion: "2026-09-30.endive",
  });
}

/** Stripe Checkout — sandbox demo when keys missing or INTEGRATIONS_SANDBOX */
export async function initiateStripe(
  input: PaymentInitiateInput,
): Promise<PaymentInitiateResult> {
  const cfg = stripeConfig();
  const sandbox = isIntegrationsSandbox() || !cfg.configured;
  const ref = txnRef();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  if (sandbox) {
    return {
      ok: true,
      sandbox: true,
      txnRef: ref,
      message: "Stripe sandbox payment ready — confirm to post ledger receipt.",
      redirectUrl: `/api/payments/confirm?gateway=stripe&txnRef=${encodeURIComponent(ref)}&feeId=${encodeURIComponent(input.feeId)}&amount=${input.amount}&sandbox=1`,
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    return {
      ok: false,
      sandbox: false,
      txnRef: "",
      message: "Stripe not configured",
      error: "Missing STRIPE_SECRET_KEY",
    };
  }

  try {
    const amountMinor = Math.round(input.amount * 100);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (cfg.currency || "pkr").toLowerCase(),
            unit_amount: amountMinor,
            product_data: {
              name: `School fee — ${input.month}`,
              description: `${input.studentName} · challan ${input.feeId}`,
            },
          },
        },
      ],
      metadata: {
        feeId: input.feeId,
        tenantId: input.tenantId,
        txnRef: ref,
        amount: String(input.amount),
      },
      success_url: `${appUrl}/parent/fees?gateway=stripe&session_id={CHECKOUT_SESSION_ID}&feeId=${encodeURIComponent(input.feeId)}&amount=${input.amount}&txnRef=${encodeURIComponent(ref)}`,
      cancel_url: `${appUrl}/parent/fees?gateway=stripe&cancelled=1&feeId=${encodeURIComponent(input.feeId)}`,
    });

    if (!session.url) {
      return {
        ok: false,
        sandbox: false,
        txnRef: ref,
        message: "Stripe session missing URL",
        error: "No checkout URL returned",
      };
    }

    return {
      ok: true,
      sandbox: false,
      txnRef: ref,
      message: "Redirect to Stripe Checkout to complete payment.",
      redirectUrl: session.url,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Stripe initiate failed";
    return {
      ok: false,
      sandbox: false,
      txnRef: ref,
      message: msg,
      error: msg,
    };
  }
}

/** Stripe Checkout for school IMS plan (platform) invoice */
export async function initiateStripePlatformInvoice(input: {
  invoiceId: string;
  schoolId: string;
  schoolName: string;
  planName: string;
  amount: number;
  period: string;
}): Promise<PaymentInitiateResult> {
  const cfg = stripeConfig();
  const sandbox = isIntegrationsSandbox() || !cfg.configured;
  const ref = `PL-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  if (sandbox) {
    return {
      ok: true,
      sandbox: true,
      txnRef: ref,
      message: "Stripe sandbox plan payment ready — confirm to mark invoice paid.",
      redirectUrl: `/subscription?gateway=stripe&sandbox=1&invoiceId=${encodeURIComponent(input.invoiceId)}&txnRef=${encodeURIComponent(ref)}&amount=${input.amount}`,
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    return {
      ok: false,
      sandbox: false,
      txnRef: "",
      message: "Stripe not configured",
      error: "Missing STRIPE_SECRET_KEY",
    };
  }

  try {
    const amountMinor = Math.round(input.amount * 100);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (cfg.currency || "pkr").toLowerCase(),
            unit_amount: amountMinor,
            product_data: {
              name: `IMS plan — ${input.planName}`,
              description: `${input.schoolName} · ${input.period} · ${input.invoiceId}`,
            },
          },
        },
      ],
      metadata: {
        kind: "platform_invoice",
        invoiceId: input.invoiceId,
        schoolId: input.schoolId,
        txnRef: ref,
        amount: String(input.amount),
      },
      success_url: `${appUrl}/subscription?gateway=stripe&session_id={CHECKOUT_SESSION_ID}&invoiceId=${encodeURIComponent(input.invoiceId)}&amount=${input.amount}&txnRef=${encodeURIComponent(ref)}`,
      cancel_url: `${appUrl}/subscription?gateway=stripe&cancelled=1&invoiceId=${encodeURIComponent(input.invoiceId)}`,
    });

    if (!session.url) {
      return {
        ok: false,
        sandbox: false,
        txnRef: ref,
        message: "Stripe session missing URL",
        error: "No checkout URL returned",
      };
    }

    return {
      ok: true,
      sandbox: false,
      txnRef: ref,
      message: "Redirect to Stripe Checkout to pay IMS subscription.",
      redirectUrl: session.url,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Stripe initiate failed";
    return {
      ok: false,
      sandbox: false,
      txnRef: ref,
      message: msg,
      error: msg,
    };
  }
}

/** Verify Stripe Checkout session after return from hosted page */
export async function verifyStripeCheckoutSession(sessionId: string): Promise<{
  ok: boolean;
  txnRef?: string;
  feeId?: string;
  invoiceId?: string;
  kind?: string;
  amount?: number;
  error?: string;
}> {
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false, error: "Stripe not configured" };
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return { ok: false, error: `Payment not complete (${session.payment_status})` };
    }
    const kind = session.metadata?.kind ?? "fee";
    const feeId = session.metadata?.feeId;
    const invoiceId = session.metadata?.invoiceId;
    const txnRef = session.metadata?.txnRef ?? session.payment_intent?.toString() ?? session.id;
    const amount =
      session.metadata?.amount != null
        ? Number(session.metadata.amount)
        : session.amount_total != null
          ? session.amount_total / 100
          : undefined;
    if (kind === "platform_invoice") {
      if (!invoiceId || amount == null || Number.isNaN(amount)) {
        return { ok: false, error: "Missing invoice metadata on Stripe session" };
      }
      return { ok: true, kind, invoiceId, txnRef, amount };
    }
    if (!feeId || amount == null || Number.isNaN(amount)) {
      return { ok: false, error: "Missing fee metadata on Stripe session" };
    }
    return { ok: true, kind: "fee", feeId, txnRef, amount };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Stripe verify failed",
    };
  }
}

export function verifyStripeWebhook(
  rawBody: string,
  signature: string | null,
): {
  ok: boolean;
  eventType?: string;
  kind?: string;
  feeId?: string;
  invoiceId?: string;
  txnRef?: string;
  amount?: number;
  error?: string;
} {
  const cfg = stripeConfig();
  if (!cfg.webhookSecret || !signature) {
    return { ok: false, error: "Missing Stripe webhook secret or signature" };
  }
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Stripe not configured" };

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, cfg.webhookSecret);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        ok: true,
        eventType: event.type,
        kind: session.metadata?.kind ?? "fee",
        feeId: session.metadata?.feeId,
        invoiceId: session.metadata?.invoiceId,
        txnRef: session.metadata?.txnRef ?? session.id,
        amount: session.metadata?.amount
          ? Number(session.metadata.amount)
          : session.amount_total != null
            ? session.amount_total / 100
            : undefined,
      };
    }
    return { ok: true, eventType: event.type };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Webhook verify failed",
    };
  }
}
