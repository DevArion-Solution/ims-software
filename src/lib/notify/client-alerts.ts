/** Fire-and-forget absence alerts to parent guardians (WhatsApp / SMS / Gmail). */
export async function fireAbsenceAlerts(input: {
  date: string;
  schoolName?: string;
  locale?: "en" | "ur" | "both";
  channels?: ("whatsapp" | "sms" | "email")[];
  period?: number;
  absences: {
    studentId: string;
    studentName: string;
    className: string;
    section: string;
  }[];
}): Promise<{ sent: number; failed: number; detail?: string }> {
  if (!input.absences.length) return { sent: 0, failed: 0 };
  try {
    const res = await fetch("/api/notify/absence-alerts", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as {
      sent?: number;
      failed?: number;
      error?: string;
      message?: string;
    };
    if (!res.ok) {
      return { sent: 0, failed: input.absences.length, detail: json.error };
    }
    return {
      sent: json.sent ?? 0,
      failed: json.failed ?? 0,
      detail: json.message,
    };
  } catch {
    return { sent: 0, failed: input.absences.length, detail: "Network error" };
  }
}
