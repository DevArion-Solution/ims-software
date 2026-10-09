import { randomBytes } from "crypto";
import type { PaymentInitiateInput, PaymentInitiateResult } from "./types";

function txnRef(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/**
 * JazzCash — manual mode for now.
 * Opens in-app instructions page; parent pays in JazzCash app, then confirms with TID.
 * Live merchant API can be wired later when school has JazzCash merchant keys.
 */
export async function initiateJazzCash(
  input: PaymentInitiateInput,
): Promise<PaymentInitiateResult> {
  const ref = txnRef("JC");
  const q = new URLSearchParams({
    gateway: "jazzcash",
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
    message: "Open JazzCash manual payment page",
    redirectUrl: `/parent/fees/manual?${q.toString()}`,
  };
}

export function verifyJazzCashWebhook(body: Record<string, string>): {
  ok: boolean;
  txnRef?: string;
  amount?: number;
  feeId?: string;
  error?: string;
} {
  return {
    ok: body.pp_ResponseCode === "000" || body.sandbox === "1" || body.manual === "1",
    txnRef: body.pp_TxnRefNo ?? body.txnRef,
    amount: body.pp_Amount ? Number(body.pp_Amount) / 100 : Number(body.amount),
    feeId: body.pp_BillReference ?? body.feeId,
  };
}
