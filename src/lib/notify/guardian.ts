import type { Student } from "@/types";
import type { NotifyChannel } from "@/lib/integrations/types";

export type GuardianContact = {
  studentId: string;
  studentName: string;
  guardianName: string;
  phone?: string;
  email?: string;
};

export function guardianContactsForStudent(student: Student): GuardianContact {
  const g = student.guardians[0];
  return {
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    guardianName: g?.name ?? "Guardian",
    phone: g?.phone?.trim() || student.phone?.trim(),
    email: g?.email?.trim() || student.email?.trim(),
  };
}

/** Prefer WhatsApp/SMS phone; email for Gmail channel */
export function addressForChannel(
  contact: GuardianContact,
  channel: NotifyChannel,
): string | null {
  if (channel === "email") {
    const email = contact.email?.trim();
    return email && email.includes("@") ? email : null;
  }
  const phone = contact.phone?.trim();
  return phone || null;
}
