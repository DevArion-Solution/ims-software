import type { NotifySendInput, NotifySendResult } from "./types";

/**
 * WhatsApp — skipped for now (no Cloud API).
 * Re-enable later when Meta WhatsApp Business is configured.
 */
export async function sendWhatsApp(input: NotifySendInput): Promise<NotifySendResult> {
  const to = input.to.trim().replace(/\s+/g, "");
  return {
    ok: false,
    sandbox: true,
    channel: "whatsapp",
    to,
    detail: "WhatsApp skipped for now — use Gmail / SMS",
    error: "WhatsApp disabled (coming later)",
  };
}

export const whatsappTemplates = {
  feeReminder: (student: string, month: string, balance: string) =>
    `Fee reminder: ${student} · ${month} · balance ${balance}. Please pay via Parent Portal.`,
  absenceAlert: (student: string, date: string) =>
    `Absence alert: ${student} marked absent on ${date}.`,
};
