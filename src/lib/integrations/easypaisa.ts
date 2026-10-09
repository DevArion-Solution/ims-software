import { randomBytes } from "crypto";
import type { PaymentInitiateInput, PaymentInitiateResult } from "./types";

function txnRef() {
  return `EP-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * Easypaisa — manual mode for now.
 * Opens in-app instructions page; parent pays in Easypaisa app, then confirms with TID.
 */
export async function initiateEasypaisa(
  input: PaymentInitiateInput,
): Promise<PaymentInitiateResult> {
  const ref = txnRef();
  const q = new URLSearchParams({
    gateway: "easypaisa",
    feeId: input.feeId,
    amount: String(input.amount),
    txnRef: ref,
    student: input.studentName,
    month: input.month,
  });
  return {
    ok: true,
    sandbox: true,
    txnRef: ref,
    message: "Open Easypaisa manual payment page",
    redirectUrl: `/parent/fees/manual?${q.toString()}`,
  };
}

export function verifyEasypaisaWebhook(body: Record<string, string>): {
  ok: boolean;
  txnRef?: string;
  amount?: number;
  feeId?: string;
  error?: string;
} {
  return {
    ok:
      body.responseCode === "0000" ||
      body.sandbox === "1" ||
      body.manual === "1" ||
      body.status === "success",
    txnRef: body.transactionId ?? body.orderId ?? body.txnRef,
    amount: Number(body.transactionAmount ?? body.amount),
    feeId: body.feeId ?? body.billReference,
  };
}
