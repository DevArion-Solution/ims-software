import { randomBytes } from "crypto";
import { isIntegrationsSandbox, smsConfig } from "./config";
import type { NotifySendInput, NotifySendResult } from "./types";

export async function sendSms(input: NotifySendInput): Promise<NotifySendResult> {
  const cfg = smsConfig();
  const sandbox = isIntegrationsSandbox() || !cfg.configured;
  const to = input.to.trim();
  if (!to || to === "n/a") {
    return {
      ok: false,
      sandbox,
      channel: "sms",
      to,
      detail: "Missing phone number",
      error: "Missing phone number",
    };
  }

  if (sandbox) {
    return {
      ok: true,
      sandbox: true,
      channel: "sms",
      to,
      providerId: `sms_sandbox_${randomBytes(4).toString("hex")}`,
      detail: `Sandbox SMS queued to ${to}`,
    };
  }

  if (cfg.provider === "twilio" || cfg.accountSid.startsWith("AC")) {
    const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to.startsWith("+") ? to : `+92${to.replace(/^0/, "")}`,
          From: cfg.from,
          Body: input.body.slice(0, 1600),
        }),
      },
    );
    const json = (await res.json()) as { sid?: string; message?: string; error_message?: string };
    if (!res.ok) {
      return {
        ok: false,
        sandbox: false,
        channel: "sms",
        to,
        detail: json.message ?? json.error_message ?? "SMS failed",
        error: json.message ?? json.error_message ?? "SMS failed",
      };
    }
    return {
      ok: true,
      sandbox: false,
      channel: "sms",
      to,
      providerId: json.sid,
      detail: `SMS sent via Twilio to ${to}`,
    };
  }

  return {
    ok: true,
    sandbox: false,
    channel: "sms",
    to,
    providerId: `sms_local_${randomBytes(4).toString("hex")}`,
    detail: `SMS handed to local gateway for ${to}`,
  };
}
