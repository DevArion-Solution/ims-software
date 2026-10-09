import { describe, expect, it } from "vitest";
import { resolveNoticeRecipients } from "@/lib/school/notice-recipients";
import type { FeeInvoice, StaffMember, Student } from "@/types";

const students: Student[] = [
  {
    id: "s1",
    admissionNo: "A1",
    firstName: "Ali",
    lastName: "Khan",
    gender: "male",
    dateOfBirth: "2012-01-01",
    className: "Class 8",
    section: "A",
    campusId: "camp1",
    status: "active",
    enrollmentDate: "2026-01-01",
    phone: "03001111111",
    guardians: [{ name: "Father Ali", relation: "Father", phone: "03002222222" }],
  },
  {
    id: "s2",
    admissionNo: "A2",
    firstName: "Bina",
    lastName: "Khan",
    gender: "female",
    dateOfBirth: "2012-01-01",
    className: "Class 8",
    section: "B",
    campusId: "camp1",
    status: "active",
    enrollmentDate: "2026-01-01",
    guardians: [{ name: "Father Bina", relation: "Father", phone: "03003333333" }],
  },
];

const fees: FeeInvoice[] = [
  {
    id: "f1",
    studentId: "s1",
    studentName: "Ali Khan",
    className: "Class 8-A",
    month: "October 2026",
    baseAmount: 1000,
    discount: 0,
    lateFee: 0,
    amount: 1000,
    paid: 0,
    status: "overdue",
    dueDate: "2026-09-01",
  },
  {
    id: "f2",
    studentId: "s2",
    studentName: "Bina Khan",
    className: "Class 8-B",
    month: "October 2026",
    baseAmount: 1000,
    discount: 0,
    lateFee: 0,
    amount: 1000,
    paid: 1000,
    status: "paid",
    dueDate: "2026-10-01",
  },
];

const staff: StaffMember[] = [
  {
    id: "st1",
    employeeNo: "E1",
    name: "Teacher One",
    role: "Teacher",
    department: "Academic",
    phone: "03004444444",
    email: "t1@school.test",
    status: "active",
    joinDate: "2020-01-01",
  },
];

describe("resolveNoticeRecipients", () => {
  it("filters parents by class section", () => {
    const list = resolveNoticeRecipients(
      { students, staff, fees },
      {
        audience: "parents",
        channel: "sms",
        className: "Class 8",
        section: "A",
      },
    );
    expect(list).toHaveLength(1);
    expect(list[0]?.contact).toBe("03002222222");
  });

  it("filters overdue fee parents", () => {
    const list = resolveNoticeRecipients(
      { students, staff, fees },
      {
        audience: "parents",
        channel: "whatsapp",
        feeFilter: "overdue",
      },
    );
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("Father Ali");
  });

  it("targets staff emails", () => {
    const list = resolveNoticeRecipients(
      { students, staff, fees },
      { audience: "staff", channel: "email" },
    );
    expect(list).toHaveLength(1);
    expect(list[0]?.contact).toBe("t1@school.test");
  });
});
