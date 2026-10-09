import { computeFeeBalance } from "@/lib/calc";
import type {
  FeeInvoice,
  Notice,
  NoticeChannel,
  NoticeFeeFilter,
  StaffMember,
  Student,
} from "@/types";

export type NoticeRecipient = {
  name: string;
  contact: string;
  studentId?: string;
  staffId?: string;
};

export type NoticeTargetInput = Pick<
  Notice,
  "audience" | "channel" | "className" | "section" | "feeFilter"
>;

function studentMatchesClass(
  student: Student,
  className?: string,
  section?: string,
): boolean {
  if (className?.trim()) {
    const want = className.trim().toLowerCase();
    if (student.className.trim().toLowerCase() !== want) return false;
  }
  if (section?.trim()) {
    if (student.section.trim().toLowerCase() !== section.trim().toLowerCase()) {
      return false;
    }
  }
  return true;
}

function studentMatchesFee(
  studentId: string,
  fees: FeeInvoice[],
  feeFilter?: NoticeFeeFilter,
): boolean {
  if (!feeFilter || feeFilter === "all") return true;
  const mine = fees.filter((f) => f.studentId === studentId);
  if (feeFilter === "overdue") {
    return mine.some((f) => f.status === "overdue");
  }
  return mine.some(
    (f) =>
      (f.status === "pending" ||
        f.status === "partial" ||
        f.status === "overdue") &&
      computeFeeBalance(f.amount, f.paid) > 0,
  );
}

function contactForChannel(
  channel: NoticeChannel,
  phone?: string,
  email?: string,
): string {
  if (channel === "email") return (email || phone || "").trim();
  return (phone || email || "").trim();
}

/** Resolve unique recipients for a notice (class / section / fee filters). */
export function resolveNoticeRecipients(
  data: {
    students: Student[];
    staff: StaffMember[];
    fees: FeeInvoice[];
  },
  notice: NoticeTargetInput,
): NoticeRecipient[] {
  if (notice.channel === "notice_board") {
    return [
      {
        name: "Notice board",
        contact: "campus",
      },
    ];
  }

  if (notice.audience === "staff") {
    const list = data.staff
      .filter((s) => s.status === "active")
      .map((s) => ({
        name: s.name,
        contact: contactForChannel(notice.channel, s.phone, s.email),
        staffId: s.id,
      }))
      .filter((r) => r.contact);
    return uniqueByContact(list);
  }

  const students = data.students.filter(
    (s) =>
      s.status === "active" &&
      studentMatchesClass(s, notice.className, notice.section) &&
      studentMatchesFee(s.id, data.fees, notice.feeFilter),
  );

  if (notice.audience === "students") {
    const list = students
      .map((s) => ({
        name: `${s.firstName} ${s.lastName}`,
        contact: contactForChannel(notice.channel, s.phone, s.email),
        studentId: s.id,
      }))
      .filter((r) => r.contact);
    return uniqueByContact(list);
  }

  // parents + all → guardians of filtered students
  const list = students.flatMap((s) =>
    s.guardians.map((g) => ({
      name: g.name,
      contact: contactForChannel(notice.channel, g.phone, g.email),
      studentId: s.id,
    })),
  ).filter((r) => r.contact);

  return uniqueByContact(list);
}

function uniqueByContact(list: NoticeRecipient[]): NoticeRecipient[] {
  const map = new Map<string, NoticeRecipient>();
  for (const r of list) {
    const key = `${r.contact.toLowerCase()}|${r.name.toLowerCase()}`;
    if (!map.has(key)) map.set(key, r);
  }
  return [...map.values()];
}

export function previewNoticeAudienceLabel(notice: NoticeTargetInput): string {
  const parts: string[] = [notice.audience];
  if (notice.className?.trim()) {
    parts.push(
      notice.section?.trim()
        ? `${notice.className}-${notice.section}`
        : notice.className,
    );
  }
  if (notice.feeFilter && notice.feeFilter !== "all") {
    parts.push(`fee:${notice.feeFilter}`);
  }
  return parts.join(" · ");
}
