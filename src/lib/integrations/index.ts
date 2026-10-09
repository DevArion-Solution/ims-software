import { initiateEasypaisa } from "./easypaisa";
import { initiateJazzCash } from "./jazzcash";
import { initiateStripe } from "./stripe";
import { sendEmail, sendTestEmail, emailTemplates } from "./email";
import { sendSms } from "./sms";
import { sendWhatsApp, whatsappTemplates } from "./whatsapp";
import { integrationStatus, isIntegrationsSandbox } from "./config";
import {
  isSchoolGmailReady,
  schoolSmtpFromSettings,
} from "./school-smtp";
import type {
  NotifyChannel,
  NotifySendInput,
  NotifySendResult,
  PaymentGateway,
  PaymentInitiateInput,
  PaymentInitiateResult,
  SmtpOverride,
} from "./types";
import { randomBytes } from "crypto";

export {
  integrationStatus,
  isIntegrationsSandbox,
  emailTemplates,
  whatsappTemplates,
  sendTestEmail,
  isSchoolGmailReady,
  schoolSmtpFromSettings,
};
export type * from "./types";

export async function initiatePayment(
  input: PaymentInitiateInput,
): Promise<PaymentInitiateResult> {
  if (input.amount <= 0) {
    return {
      ok: false,
      sandbox: isIntegrationsSandbox(),
      txnRef: "",
      message: "Invalid amount",
      error: "Invalid amount",
    };
  }

  if (input.gateway === "jazzcash") return initiateJazzCash(input);
  if (input.gateway === "easypaisa") return initiateEasypaisa(input);
  if (input.gateway === "stripe") return initiateStripe(input);

  // Card — always sandbox demo rail for now
  const ref = `CARD-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  return {
    ok: true,
    sandbox: true,
    txnRef: ref,
    message: "Card sandbox payment ready — confirm to post ledger receipt.",
    redirectUrl: `/api/payments/confirm?gateway=card&txnRef=${encodeURIComponent(ref)}&feeId=${encodeURIComponent(input.feeId)}&amount=${input.amount}&sandbox=1`,
  };
}

export async function sendNotification(input: NotifySendInput): Promise<NotifySendResult> {
  if (input.channel === "sms") return sendSms(input);
  if (input.channel === "whatsapp") return sendWhatsApp(input);
  return sendEmail(input);
}

export async function sendBulkNotifications(
  channel: NotifyChannel,
  recipients: { to: string; name?: string }[],
  body: string,
  subject?: string,
  smtp?: SmtpOverride,
): Promise<{ sent: number; failed: number; results: NotifySendResult[] }> {
  const results: NotifySendResult[] = [];
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const res = await sendNotification({
      channel,
      to: r.to,
      name: r.name,
      body,
      subject,
      smtp,
    });
    results.push(res);
    if (res.ok) sent += 1;
    else failed += 1;
  }
  return { sent, failed, results };
}

export function isGatewayEnabled(
  gateway: PaymentGateway,
  flags: {
    jazzcashEnabled?: boolean;
    easypaisaEnabled?: boolean;
    stripeEnabled?: boolean;
  },
): boolean {
  if (gateway === "jazzcash") return flags.jazzcashEnabled !== false;
  if (gateway === "easypaisa") return flags.easypaisaEnabled !== false;
  if (gateway === "stripe") return flags.stripeEnabled !== false;
  return true;
}
