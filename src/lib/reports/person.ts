import type {
  AttendanceRecord,
  Exam,
  ExamPaper,
  ExamResult,
  FeeInvoice,
  LeaveRequest,
  PayrollRun,
  StaffMember,
  Student,
  Subject,
  TimetableSlot,
} from "@/types";
import { attendancePercentage, averageOf, sumMoney } from "@/lib/calc";
import { formatCurrency, formatPercent } from "@/lib/utils";

/** Minimal data shape used by report builders (avoids importing provider). */
export type ReportData = {
  students: Student[];
  fees: FeeInvoice[];
  attendance: AttendanceRecord[];
  results: ExamResult[];
  exams: Exam[];
  subjects: Subject[];
  timetable: TimetableSlot[];
  staff: StaffMember[];
  payroll: PayrollRun[];
  leaves: LeaveRequest[];
  papers?: ExamPaper[];
  hostelAllotments?: { studentId: string; roomLabel: string; status: string }[];
  routes?: { id: string; name: string }[];
  routeAssignments?: { routeId: string; studentId: string }[];
  classes?: { id: string; name: string; section: string; classTeacher?: string; room?: string }[];
};

export function buildStudentReport(data: ReportData, studentId: string) {
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return null;

  const fellows = data.students.filter(
    (s) =>
      s.id !== student.id &&
      s.className === student.className &&
      s.section === student.section &&
      s.status === "active",
  );

  const fees = data.fees.filter((f) => f.studentId === student.id);
  const feePaid = sumMoney(fees.map((f) => f.paid));
  const feeDue = sumMoney(fees.map((f) => Math.max(0, f.amount - f.paid)));
  const feeTotal = sumMoney(fees.map((f) => f.amount));

  const attendance = data.attendance.filter((a) => a.studentId === student.id);
  const attStats = attendancePercentage(attendance);

  const results = data.results.filter((r) => r.studentId === student.id);
  const avgPct = averageOf(
    results.map((r) => r.percentage ?? 0),
    1,
  );
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  const subjects = data.subjects.filter((s) => s.className === student.className);
  const teachers = subjects
    .filter((s) => s.teacher)
    .map((s) => ({
      subject: s.name,
      code: s.code,
      teacher: s.teacher!,
      periodsPerWeek: s.periodsPerWeek,
      staff: data.staff.find((m) => m.name === s.teacher),
    }));

  const timetable = data.timetable.filter(
    (t) => t.className === student.className && t.section === student.section,
  );

  const examIds = new Set(results.map((r) => r.examId));
  const exams = data.exams.filter(
    (e) => e.className === student.className || examIds.has(e.id),
  );

  const classInfo = data.classes?.find(
    (c) => c.name === student.className && c.section === student.section,
  );

  const hostel = data.hostelAllotments?.find(
    (h) => h.studentId === student.id && h.status === "active",
  );
  const routeAssign = data.routeAssignments?.find((a) => a.studentId === student.id);
  const route = routeAssign
    ? data.routes?.find((r) => r.id === routeAssign.routeId)
    : undefined;

  return {
    student,
    fellows,
    fees,
    feePaid,
    feeDue,
    feeTotal,
    feePaidLabel: formatCurrency(feePaid),
    feeDueLabel: formatCurrency(feeDue),
    attendance,
    attStats,
    attLabel: formatPercent(attStats.percentage),
    results,
    avgPct,
    avgLabel: results.length ? formatPercent(avgPct) : "—",
    passed,
    failed,
    subjects,
    teachers,
    timetable,
    exams,
    classInfo,
    hostel,
    route,
    progressTone:
      avgPct >= 70 ? ("success" as const) : avgPct >= 40 ? ("warning" as const) : ("accent" as const),
  };
}

export function buildStaffReport(data: ReportData, staffId: string) {
  const member = data.staff.find((s) => s.id === staffId);
  if (!member) return null;

  const payroll = data.payroll.filter((p) => p.staffId === member.id);
  const paidNet = sumMoney(payroll.filter((p) => p.status === "paid").map((p) => p.net));
  const pendingNet = sumMoney(payroll.filter((p) => p.status !== "paid").map((p) => p.net));

  const leaves = data.leaves.filter((l) => l.staffId === member.id);
  const leaveDays = leaves
    .filter((l) => l.status === "approved")
    .reduce((s, l) => s + l.days, 0);

  const subjects = data.subjects.filter((s) => s.teacher === member.name);
  const timetable = data.timetable.filter((t) => t.teacher === member.name);
  const classTeacherOf =
    data.classes?.filter((c) => c.classTeacher === member.name) ?? [];

  const classNames = new Set([
    ...subjects.map((s) => s.className),
    ...timetable.map((t) => t.className),
    ...classTeacherOf.map((c) => c.name),
  ]);

  const myStudents = data.students.filter(
    (s) => s.status === "active" && classNames.has(s.className),
  );

  const myResults = data.results.filter((r) =>
    subjects.some((s) => s.name === r.subject || s.className === r.className),
  );

  const papers = (data.papers ?? []).filter(
    (p) => p.teacherId === member.id || p.teacherName === member.name,
  );

  const myExams = data.exams.filter((e) => classNames.has(e.className));

  return {
    member,
    payroll,
    paidNet,
    pendingNet,
    paidNetLabel: formatCurrency(paidNet),
    pendingNetLabel: formatCurrency(pendingNet),
    leaves,
    leaveDays,
    subjects,
    timetable,
    classTeacherOf,
    myStudents,
    myResults,
    papers,
    myExams,
    teachingLoad: timetable.length,
    subjectCount: subjects.length,
  };
}
