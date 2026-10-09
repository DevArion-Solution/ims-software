import { randomBytes } from "crypto";
import { emailConfig } from "./config";
import type { NotifySendInput, NotifySendResult, SmtpOverride } from "./types";

function resolveSmtp(input: NotifySendInput): {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  source: "school" | "env" | "none";
} {
  const override = input.smtp;
  if (override?.user && override?.pass) {
    return {
      host: override.host || "smtp.gmail.com",
      port: override.port || 587,
      user: override.user.trim(),
      pass: override.pass.replace(/\s/g, ""),
      from: override.from || override.user.trim(),
      source: "school",
    };
  }
  const cfg = emailConfig();
  if (cfg.configured && cfg.host && cfg.user && cfg.pass) {
    return {
      host: cfg.host,
      port: cfg.port || 587,
      user: cfg.user,
      pass: cfg.pass.replace(/\s/g, ""),
      from: cfg.from || cfg.user,
      source: "env",
    };
  }
  return { host: "", port: 587, user: "", pass: "", from: "", source: "none" };
}

function sandboxForced(): boolean {
  const flag = process.env.INTEGRATIONS_SANDBOX ?? process.env.PAYMENTS_SANDBOX;
  return flag === "true" || flag === "1";
}

async function deliverSmtp(
  smtp: { host: string; port: number; user: string; pass: string; from: string },
  to: string,
  subject: string,
  body: string,
): Promise<NotifySendResult> {
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port || 587,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    const info = await transporter.sendMail({
      from: smtp.from || smtp.user,
      to,
      subject,
      text: body,
    });
    return {
      ok: true,
      sandbox: false,
      channel: "email",
      to,
      providerId: String(info.messageId ?? `mail_${randomBytes(4).toString("hex")}`),
      detail: `Email sent via Gmail/SMTP to ${to}`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "SMTP send failed";
    return {
      ok: false,
      sandbox: false,
      channel: "email",
      to,
      detail: msg,
      error: msg,
    };
  }
}

/** SMTP / Gmail — school Gmail first, then .env SMTP, else sandbox */
export async function sendEmail(input: NotifySendInput): Promise<NotifySendResult> {
  const to = input.to.trim();
  if (!to || !to.includes("@")) {
    return {
      ok: false,
      sandbox: true,
      channel: "email",
      to,
      detail: "Missing or invalid email",
      error: "Missing or invalid email",
    };
  }

  const subject = input.subject ?? "IMS notification";
  const body = input.body;
  const smtp = resolveSmtp(input);

  // School Gmail always live (schools configure in Communication → Auto alerts)
  if (smtp.source === "school") {
    return deliverSmtp(smtp, to, subject, body);
  }

  // Platform .env SMTP — live unless sandbox explicitly forced
  if (smtp.source === "env" && !sandboxForced()) {
    return deliverSmtp(smtp, to, subject, body);
  }

  const webhook = process.env.EMAIL_WEBHOOK_URL;
  if (webhook && !sandboxForced()) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: smtp.from || emailConfig().from,
        to,
        subject,
        text: body,
        name: input.name,
      }),
    });
    if (!res.ok) {
      return {
        ok: false,
        sandbox: false,
        channel: "email",
        to,
        detail: `Email webhook failed (${res.status})`,
        error: `Email webhook failed (${res.status})`,
      };
    }
    return {
      ok: true,
      sandbox: false,
      channel: "email",
      to,
      providerId: `mail_webhook_${randomBytes(4).toString("hex")}`,
      detail: `Email sent via webhook to ${to}`,
    };
  }

  console.info(`[email:sandbox] to=${to} subject=${subject} body=${body.slice(0, 120)}`);
  return {
    ok: true,
    sandbox: true,
    channel: "email",
    to,
    providerId: `mail_sandbox_${randomBytes(4).toString("hex")}`,
    detail:
      smtp.source === "none"
        ? "Sandbox only — add School Gmail in Communication → Auto alerts"
        : `Sandbox email queued to ${to}`,
  };
}

/** Verify school Gmail by sending a short test message */
export async function sendTestEmail(input: {
  smtp: SmtpOverride;
  to: string;
  schoolName?: string;
}): Promise<NotifySendResult> {
  const school = input.schoolName ?? "IMS School";
  return sendEmail({
    channel: "email",
    to: input.to,
    subject: `IMS test — ${school} Gmail OK`,
    body: `Assalam-o-Alaikum.\n\nThis is a test from IMS.\nYour school Gmail is connected and can send parent alerts / fee reminders.\n\n— ${school}`,
    smtp: input.smtp,
  });
}

export const emailTemplates = {
  registrationApproved: (school: string, email: string, password: string) => ({
    subject: `Welcome to IMS — ${school}`,
    body: `Your school "${school}" is approved.\n\nLogin: ${email}\nTemporary password: ${password}\n\nPlease change your password after first login.`,
  }),
  feeReceipt: (student: string, month: string, amount: string, txnRef: string) => ({
    subject: `Fee receipt — ${student} · ${month}`,
    body: `Payment received for ${student} (${month}).\nAmount: ${amount}\nReference: ${txnRef}\nThank you.`,
  }),
  reportCardReady: (student: string, exam: string) => ({
    subject: `Report card ready — ${student}`,
    body: `The report card for ${student} (${exam}) is now available in the Parent / Student portal.`,
  }),
  feeReminder: (student: string, month: string, balance: string) => ({
    subject: `Fee reminder — ${student}`,
    body: `Reminder: outstanding fee for ${student} (${month}) is ${balance}. Please pay via Parent Portal.`,
  }),
};
