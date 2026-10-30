import type { ImsData } from "@/components/providers/DataProvider";
import { buildStaffReport } from "@/lib/reports/person";

/** Resolve logged-in teacher staff id with demo fallback */
export function resolveStaffId(
  linkedStaffId: string | undefined,
  fallback = "st2",
): string {
  return linkedStaffId || fallback;
}

export function teacherScope(data: ImsData, linkedStaffId?: string) {
  const staffId = resolveStaffId(linkedStaffId);
  const report = buildStaffReport(data, staffId);
  const member = report?.member ?? data.staff.find((s) => s.id === staffId) ?? null;
  const classNames = new Set(
    report
      ? [
          ...report.subjects.map((s) => s.className),
          ...report.timetable.map((t) => t.className),
          ...report.classTeacherOf.map((c) => c.name),
        ]
      : [],
  );

  const myClasses = data.classes.filter(
    (c) =>
      classNames.has(c.name) ||
      (member && c.classTeacher === member.name),
  );

  const myStudents = data.students.filter(
    (s) =>
      s.status === "active" &&
      (classNames.has(s.className) ||
        myClasses.some((c) => c.name === s.className && c.section === s.section)),
  );

  const myTimetable = data.timetable.filter(
    (t) => member && t.teacher === member.name,
  );

  const mySubjects = data.subjects.filter(
    (s) => member && s.teacher === member.name,
  );

  const myHomework = data.homework.filter(
    (h) => h.teacherId === staffId || (member && h.teacherName === member.name),
  );

  const myNotices = data.notices.filter(
    (n) =>
      n.status === "sent" &&
      (n.audience === "staff" || n.audience === "all"),
  );

  return {
    staffId,
    member,
    report,
    myClasses,
    myStudents,
    myTimetable,
    mySubjects,
    myHomework,
    myNotices,
    classNames,
  };
}

export function studentScope(data: ImsData, linkedStudentId?: string) {
  const me =
    data.students.find((s) => s.id === linkedStudentId) ?? data.students[0] ?? null;
  if (!me) {
    return {
      me: null,
      timetable: [] as ImsData["timetable"],
      fees: [] as ImsData["fees"],
      results: [] as ImsData["results"],
      attendance: [] as ImsData["attendance"],
      homework: [] as ImsData["homework"],
      notices: [] as ImsData["notices"],
    };
  }
  return {
    me,
    timetable: data.timetable.filter(
      (t) => t.className === me.className && t.section === me.section,
    ),
    fees: data.fees.filter((f) => f.studentId === me.id),
    results: data.results.filter((r) => {
      if (r.studentId !== me.id) return false;
      const exam = data.exams.find((e) => e.id === r.examId);
      // Show if exam published OR legacy exams without the flag treated as published when completed
      if (!exam) return true;
      if (exam.published === true) return true;
      if (exam.published === false) return false;
      return exam.status === "completed";
    }),
    attendance: data.attendance.filter((a) => a.studentId === me.id),
    homework: data.homework.filter(
      (h) =>
        h.className === me.className &&
        (!h.section || h.section === me.section) &&
        (h.status === "assigned" ||
          (h.submissions ?? []).some((submission) => submission.studentId === me.id)),
    ),
    notices: data.notices.filter(
      (n) =>
        n.status === "sent" &&
        (n.audience === "students" || n.audience === "all"),
    ),
  };
}
