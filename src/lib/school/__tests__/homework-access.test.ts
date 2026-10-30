import { describe, expect, it } from "vitest";
import type { Homework } from "@/types";
import { validateHomeworkUpdate } from "../homework-access";

const assignment: Homework = {
  id: "hw1",
  title: "Fractions",
  description: "Complete questions 1-5",
  className: "Class 8",
  section: "A",
  subject: "Math",
  teacherId: "staff1",
  teacherName: "Teacher One",
  dueDate: "2099-12-31",
  createdOn: "2026-10-30",
  status: "assigned",
  maxPoints: 10,
};

const student = {
  portal: "student" as const,
  linkedStudentId: "student1",
  linkedStaffId: undefined,
  impersonatingSchoolId: undefined,
};

const teacher = {
  portal: "teacher" as const,
  linkedStudentId: undefined,
  linkedStaffId: "staff1",
  impersonatingSchoolId: undefined,
};

describe("validateHomeworkUpdate", () => {
  it("allows a student to submit their own work", () => {
    const next = {
      homework: [
        {
          ...assignment,
          submissions: [
            {
              studentId: "student1",
              studentName: "Student One",
              answer: "My answers",
              attachments: [],
              submittedAt: new Date().toISOString(),
            },
          ],
        },
      ],
    };

    expect(validateHomeworkUpdate(student, { homework: [assignment] }, next)).toBeNull();
  });

  it("allows a student to submit new work while keeping previously graded work unchanged", () => {
    const gradedAssignment = {
      ...assignment,
      id: "hw-graded",
      submissions: [
        {
          studentId: "student1",
          studentName: "Student One",
          answer: "Earlier answers",
          attachments: [],
          submittedAt: "2026-10-29T10:00:00.000Z",
          score: 9,
          feedback: "Well done",
          gradedAt: "2026-10-29T12:00:00.000Z",
          gradedBy: "staff1",
        },
      ],
    };
    const newAssignment = {
      ...assignment,
      id: "hw-new",
      submissions: [
        {
          studentId: "student1",
          studentName: "Student One",
          answer: "New work",
          attachments: [],
          submittedAt: new Date().toISOString(),
        },
      ],
    };
    expect(
      validateHomeworkUpdate(
        student,
        { homework: [gradedAssignment, { ...assignment, id: "hw-new" }] },
        { homework: [gradedAssignment, newAssignment] },
      ),
    ).toBeNull();
  });

  it("prevents a student from changing assignment details or grades", () => {
    expect(
      validateHomeworkUpdate(student, { homework: [assignment] }, {
        homework: [{ ...assignment, maxPoints: 100 }],
      }),
    ).toContain("cannot edit homework assignments");

    const graded = {
      ...assignment,
      submissions: [
        {
          studentId: "student1",
          studentName: "Student One",
          answer: "My answers",
          attachments: [],
          submittedAt: new Date().toISOString(),
          score: 9,
          gradedAt: new Date().toISOString(),
          gradedBy: "staff1",
        },
      ],
    };
    expect(
      validateHomeworkUpdate(student, { homework: [assignment] }, { homework: [graded] }),
    ).toContain("cannot grade homework");
  });

  it("prevents a student from submitting work for a different student", () => {
    const next = {
      homework: [
        {
          ...assignment,
          submissions: [
            {
              studentId: "student2",
              studentName: "Student Two",
              answer: "Not my work",
              attachments: [],
              submittedAt: new Date().toISOString(),
            },
          ],
        },
      ],
    };
    expect(validateHomeworkUpdate(student, { homework: [assignment] }, next)).toContain(
      "other students",
    );
  });

  it("allows the assigned teacher to grade submitted work", () => {
    const old = {
      ...assignment,
      submissions: [
        {
          studentId: "student1",
          studentName: "Student One",
          answer: "My answers",
          attachments: [],
          submittedAt: new Date().toISOString(),
        },
      ],
    };
    const next = {
      ...old,
      submissions: [
        {
          ...old.submissions[0],
          score: 8,
          feedback: "Good work",
          gradedAt: new Date().toISOString(),
          gradedBy: "staff1",
        },
      ],
    };
    expect(validateHomeworkUpdate(teacher, { homework: [old] }, { homework: [next] })).toBeNull();
  });

  it("prevents a teacher from editing another teacher's submissions", () => {
    const otherTeacher = { ...assignment, teacherId: "staff2" };
    expect(
      validateHomeworkUpdate(
        teacher,
        { homework: [otherTeacher] },
        { homework: [{ ...otherTeacher, status: "closed" }] },
      ),
    ).toContain("own homework");
  });
});
