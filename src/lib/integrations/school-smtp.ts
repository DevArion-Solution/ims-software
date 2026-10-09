/** Per-school Gmail SMTP (App Password) — used for parent alerts & notices */

export type SchoolSmtp = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export type SchoolGmailSettings = {
  gmailUser?: string;
  gmailAppPassword?: string;
  gmailFromName?: string;
};

/** Normalize App Password (spaces allowed in UI; Gmail accepts 16 chars). */
export function normalizeAppPassword(raw?: string | null): string {
  return (raw ?? "").replace(/\s/g, "");
}

export function isValidGmailUser(email?: string | null): boolean {
  const e = (email ?? "").trim().toLowerCase();
  return Boolean(e && e.includes("@") && e.includes("."));
}

export function isValidAppPassword(pass?: string | null): boolean {
  const p = normalizeAppPassword(pass);
  // Google App Passwords are 16 chars; allow 8–32 for flexibility
  return p.length >= 8 && p.length <= 32;
}

export function schoolSmtpFromSettings(
  settings?: SchoolGmailSettings | null,
): SchoolSmtp | null {
  const user = (settings?.gmailUser ?? "").trim();
  const pass = normalizeAppPassword(settings?.gmailAppPassword);
  if (!isValidGmailUser(user) || !isValidAppPassword(pass)) return null;
  const fromName = settings?.gmailFromName?.trim();
  return {
    host: "smtp.gmail.com",
    port: 587,
    user,
    pass,
    from: fromName ? `"${fromName}" <${user}>` : user,
  };
}

export function isSchoolGmailReady(settings?: SchoolGmailSettings | null): boolean {
  return schoolSmtpFromSettings(settings) != null;
}
