"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { resolveTenantId } from "@/lib/platform/resolve-tenant";
import type {
  AcademicClass,
  AccountVoucher,
  AdmissionApplication,
  AdmissionStatus,
  AttendanceRecord,
  AttendanceStatus,
  AuditLog,
  Book,
  BookIssue,
  DeliveryLog,
  EnrollAdmissionOptions,
  Exam,
  ExamPaper,
  ExamResult,
  Expense,
  ExpenseCategory,
  FeeInvoice,
  FeePolicy,
  FeeStructure,
  HostelAllotment,
  HostelRoom,
  HostelVisitor,
  Homework,
  HomeworkSubmission,
  Institute,
  InventoryItem,
  InventoryTxn,
  IssueBookInput,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  AlertSettings,
  Notice,
  OnlineGateway,
  PaymentMode,
  PayrollRun,
  PurchaseOrder,
  PurchaseOrderLine,
  RouteAssignment,
  StaffAttendanceRecord,
  StaffMember,
  Student,
  Subject,
  SystemUser,
  TimetableSlot,
  TransportRoute,
  Trip,
  TripStatus,
} from "@/types";
import {
  currentUser,
  seedAdmissions,
  seedAttendance,
  seedAudit,
  seedBookIssues,
  seedBooks,
  seedClasses,
  seedDeliveries,
  seedExams,
  seedExpenses,
  seedFees,
  seedFeeStructures,
  seedHostelAllotments,
  seedHostelRooms,
  seedHostelVisitors,
  seedHomework,
  seedInstitute,
  seedInventory,
  seedLeaves,
  seedNotices,
  seedPapers,
  seedPayroll,
  seedPurchaseOrders,
  seedResults,
  seedRouteAssignments,
  seedRoutes,
  seedStaff,
  seedStudents,
  seedSubjects,
  seedSystemUsers,
  seedTimetable,
  seedTrips,
  seedVouchers,
} from "@/lib/mock/data";
import { formatCurrency } from "@/lib/utils";
import {
  buildExamResult,
  buildFeeInvoice,
  collectAgainstFee,
  FEE_POLICY,
  feeTotals,
  normalizeFee,
  refreshFeeLedger,
  resolveFeePolicy,
  syncClassEnrolled,
  todayAttendanceStats,
} from "@/lib/calc/fees";
import {
  computePayrollLine,
  inclusiveDayCount,
  libraryOverdueFine,
  roundMoney,
  sumMoney,
  todayIso,
  unpaidLeaveDaysForMonth,
} from "@/lib/calc";
import { parseStaffCsv, parseStudentsCsv, promoteClassName } from "@/lib/school/csv";
import { resolveNoticeRecipients } from "@/lib/school/notice-recipients";
import {
  normalizePurchaseOrder,
  purchaseOrderLines,
} from "@/lib/school/purchase-orders";

const STORAGE_KEY = "ims.data.v4";

export const EXPENSE_ACCOUNT: Record<ExpenseCategory, string> = {
  utilities: "Utilities Expense",
  supplies: "Supplies Expense",
  maintenance: "Maintenance Expense",
  transport_ops: "Transport Operations",
  travel_trip: "Travel & Trips",
  salaries: "Salaries",
  food_mess: "Mess / Food Expense",
  marketing: "Marketing Expense",
  rent: "Rent Expense",
  other: "General Expense",
};

export interface ImsData {
  institute: Institute;
  students: Student[];
  admissions: AdmissionApplication[];
  fees: FeeInvoice[];
  feeStructures: FeeStructure[];
  staff: StaffMember[];
  leaves: LeaveRequest[];
  payroll: PayrollRun[];
  classes: AcademicClass[];
  subjects: Subject[];
  attendance: AttendanceRecord[];
  staffAttendance: StaffAttendanceRecord[];
  exams: Exam[];
  results: ExamResult[];
  papers: ExamPaper[];
  books: Book[];
  bookIssues: BookIssue[];
  routes: TransportRoute[];
  routeAssignments: RouteAssignment[];
  hostelRooms: HostelRoom[];
  hostelAllotments: HostelAllotment[];
  inventory: InventoryItem[];
  inventoryTxns: InventoryTxn[];
  vouchers: AccountVoucher[];
  expenses: Expense[];
  trips: Trip[];
  notices: Notice[];
  deliveries: DeliveryLog[];
  systemUsers: SystemUser[];
  auditLogs: AuditLog[];
  purchaseOrders: PurchaseOrder[];
  hostelVisitors: HostelVisitor[];
  timetable: TimetableSlot[];
  homework: Homework[];
  feePolicy: FeePolicy;
  alertSettings: AlertSettings;
}

function syncRouteCounts(
  routes: TransportRoute[],
  assignments: RouteAssignment[],
): TransportRoute[] {
  return routes.map((r) => ({
    ...r,
    studentsCount: assignments.filter((a) => a.routeId === r.id).length,
  }));
}

function seedData(): ImsData {
  const routeAssignments = structuredClone(seedRouteAssignments);
  const routes = syncRouteCounts(structuredClone(seedRoutes), routeAssignments);
  return {
    institute: structuredClone(seedInstitute),
    students: structuredClone(seedStudents),
    admissions: structuredClone(seedAdmissions),
    fees: structuredClone(seedFees),
    feeStructures: structuredClone(seedFeeStructures),
    staff: structuredClone(seedStaff),
    leaves: structuredClone(seedLeaves),
    payroll: structuredClone(seedPayroll),
    classes: structuredClone(seedClasses),
    subjects: structuredClone(seedSubjects),
    attendance: structuredClone(seedAttendance),
    staffAttendance: [],
    exams: structuredClone(seedExams),
    results: structuredClone(seedResults),
    papers: structuredClone(seedPapers),
    books: structuredClone(seedBooks),
    bookIssues: structuredClone(seedBookIssues),
    routes,
    routeAssignments,
    hostelRooms: structuredClone(seedHostelRooms),
    hostelAllotments: structuredClone(seedHostelAllotments),
    inventory: structuredClone(seedInventory),
    inventoryTxns: [],
    vouchers: structuredClone(seedVouchers),
    expenses: structuredClone(seedExpenses),
    trips: structuredClone(seedTrips),
    notices: structuredClone(seedNotices),
    deliveries: structuredClone(seedDeliveries),
    systemUsers: structuredClone(seedSystemUsers),
    auditLogs: structuredClone(seedAudit),
    purchaseOrders: structuredClone(seedPurchaseOrders).map((po) =>
      normalizePurchaseOrder(po),
    ),
    hostelVisitors: structuredClone(seedHostelVisitors),
    timetable: structuredClone(seedTimetable),
    homework: structuredClone(seedHomework),
    feePolicy: { ...FEE_POLICY },
    alertSettings: {
      absenceAutoNotify: true,
      absenceChannels: ["email"],
      absenceLocale: "both",
      feeReminderEnabled: true,
      feeReminderChannels: ["email"],
      feeReminderLocale: "both",
      feeReminderDaysOfMonth: [1, 5, 10],
    },
  };
}

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function nextVoucherNo(vouchers: AccountVoucher[], type: AccountVoucher["type"]) {
  const prefix = type === "receipt" ? "RV" : type === "payment" ? "PV" : "JV";
  return `${prefix}-${new Date().getFullYear()}-${String(vouchers.length + 1).padStart(3, "0")}`;
}

function makePaymentVoucher(
  prev: ImsData,
  input: { account: string; description: string; amount: number; campusId?: string },
): AccountVoucher {
  return {
    id: uid("v"),
    voucherNo: nextVoucherNo(prev.vouchers, "payment"),
    date: todayIso(),
    type: "payment",
    account: input.account,
    description: input.description,
    amount: roundMoney(input.amount),
    campusId: input.campusId ?? prev.institute.campuses[0]?.id ?? "camp1",
  };
}

function inventoryStatus(
  quantity: number,
  minStock: number,
): InventoryItem["status"] {
  if (quantity <= 0) return "out";
  if (quantity <= minStock) return "low";
  return "in_stock";
}

interface DataContextValue {
  ready: boolean;
  data: ImsData;
  user: typeof currentUser;
  resetData: () => void;
  updateInstitute: (patch: Partial<Institute>) => void;
  addCampus: (campus: Omit<Institute["campuses"][number], "id">) => void;
  // Students
  addStudent: (input: Omit<Student, "id" | "admissionNo"> & { admissionNo?: string }) => Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  // Admissions
  addAdmission: (input: Omit<AdmissionApplication, "id" | "appliedOn" | "status"> & { status?: AdmissionStatus }) => void;
  updateAdmissionStatus: (id: string, status: AdmissionStatus) => void;
  updateAdmission: (id: string, patch: Partial<Omit<AdmissionApplication, "id" | "appliedOn">>) => void;
  enrollAdmission: (id: string, options?: EnrollAdmissionOptions) => { studentId: string; feeId?: string } | null;
  deleteAdmission: (id: string) => void;
  // Fees
  addFee: (input: {
    studentId: string;
    studentName: string;
    className: string;
    month: string;
    amount: number;
    dueDate: string;
    discount?: number;
    paid?: number;
    feeHead?: string;
  }) => void;
  addFeeFromStructure: (input: {
    structureId: string;
    studentId: string;
    month: string;
    dueDate: string;
    discount?: number;
  }) => void;
  collectFee: (
    id: string,
    amount: number,
    paymentMode?: PaymentMode,
  ) => { applied: number; change: number };
  waiveFee: (id: string, remarks?: string) => void;
  generateClassFees: (input: {
    structureId: string;
    month: string;
    dueDate: string;
    className?: string;
    discount?: number;
  }) => number;
  payFeeOnline: (
    id: string,
    amount: number,
    gateway: OnlineGateway,
  ) => { ok: boolean; txnRef?: string; applied?: number; error?: string };
  recalculateFees: () => void;
  updateFeePolicy: (patch: Partial<FeePolicy>) => void;
  updateAlertSettings: (patch: Partial<AlertSettings>) => void;
  deleteFee: (id: string) => void;
  addFeeStructure: (input: Omit<FeeStructure, "id">) => void;
  updateFeeStructure: (id: string, patch: Partial<Omit<FeeStructure, "id">>) => void;
  deleteFeeStructure: (id: string) => void;
  // Staff
  addStaff: (input: Omit<StaffMember, "id" | "employeeNo"> & { employeeNo?: string }) => void;
  updateStaff: (id: string, patch: Partial<StaffMember>) => void;
  deleteStaff: (id: string) => void;
  requestLeave: (input: {
    staffId: string;
    from: string;
    to: string;
    type: LeaveType;
  }) => void;
  approveLeave: (id: string) => void;
  rejectLeave: (id: string) => void;
  generatePayroll: (month: string, withAllowances?: boolean) => number;
  updatePayrollStatus: (id: string, status: PayrollRun["status"]) => void;
  updatePayrollLine: (
    id: string,
    patch: { allowances?: number; deductions?: number; remarks?: string },
  ) => boolean;
  payPayroll: (id: string) => boolean;
  payAllPayrollForMonth: (month: string) => number;
  // Academics
  addClass: (input: Omit<AcademicClass, "id">) => void;
  updateClass: (id: string, patch: Partial<AcademicClass>) => void;
  deleteClass: (id: string) => void;
  addSubject: (input: Omit<Subject, "id">) => void;
  deleteSubject: (id: string) => void;
  addTimetableSlot: (input: Omit<TimetableSlot, "id">) => void;
  deleteTimetableSlot: (id: string) => void;
  // Attendance
  upsertAttendance: (input: Omit<AttendanceRecord, "id"> & { id?: string }) => void;
  setAttendanceStatus: (id: string, status: AttendanceStatus) => void;
  upsertStaffAttendance: (input: Omit<StaffAttendanceRecord, "id"> & { id?: string }) => void;
  // Exams
  addExam: (input: Omit<Exam, "id">) => void;
  updateExam: (id: string, patch: Partial<Exam>) => void;
  deleteExam: (id: string) => void;
  addResult: (input: Omit<ExamResult, "id" | "grade" | "percentage" | "passed"> & { grade?: string }) => void;
  updateResult: (
    id: string,
    patch: { obtained?: number; total?: number; subject?: string },
  ) => void;
  deleteResult: (id: string) => void;
  publishExamResults: (examId: string, published: boolean) => void;
  addPaper: (input: Omit<ExamPaper, "id" | "createdOn"> & { createdOn?: string }) => void;
  updatePaper: (id: string, patch: Partial<ExamPaper>) => void;
  deletePaper: (id: string) => void;
  // Library
  addBook: (input: Omit<Book, "id" | "available"> & { available?: number }) => void;
  updateBook: (
    id: string,
    patch: Partial<Omit<Book, "id">> & { copies?: number },
  ) => boolean;
  deleteBook: (id: string) => boolean;
  issueBook: (input: IssueBookInput) => boolean;
  renewBook: (issueId: string, extraDays?: number) => boolean;
  returnBook: (issueId: string) => void;
  previewLibraryFine: (issueId: string) => number;
  postLibraryFineAsFee: (issueId: string) => boolean;
  // Transport
  addRoute: (input: Omit<TransportRoute, "id">) => void;
  updateRoute: (id: string, patch: Partial<TransportRoute>) => void;
  deleteRoute: (id: string) => void;
  addRouteAssignment: (routeId: string, studentId: string) => void;
  removeRouteAssignment: (id: string) => void;
  // Hostel
  addHostelRoom: (input: Omit<HostelRoom, "id" | "occupied" | "status"> & { occupied?: number }) => void;
  updateHostelRoom: (id: string, patch: Partial<Omit<HostelRoom, "id" | "occupied">>) => void;
  allotHostel: (studentId: string, roomId: string, messFee?: number) => boolean;
  vacateHostel: (allotmentId: string) => void;
  updateAllotmentMessFee: (allotmentId: string, messFee: number) => void;
  collectMessFee: (allotmentId: string, amount?: number, month?: string, dueDate?: string) => boolean;
  generateMessFees: (
    month: string,
    dueDate: string,
    options?: { roomId?: string },
  ) => number;
  // Inventory
  addInventoryItem: (input: Omit<InventoryItem, "id" | "status">) => void;
  updateInventoryItem: (
    id: string,
    patch: Partial<Omit<InventoryItem, "id" | "status" | "quantity">>,
  ) => void;
  adjustStock: (id: string, delta: number, note?: string) => boolean;
  deleteInventoryItem: (id: string) => void;
  // Accounts
  addVoucher: (input: Omit<AccountVoucher, "id" | "voucherNo"> & { voucherNo?: string }) => void;
  deleteVoucher: (id: string) => void;
  addExpense: (
    input: Omit<Expense, "id" | "voucherId"> & { postVoucher?: boolean },
  ) => void;
  deleteExpense: (id: string) => void;
  addTrip: (input: Omit<Trip, "id">) => void;
  updateTripStatus: (id: string, status: TripStatus) => void;
  settleTrip: (id: string) => boolean;
  deleteTrip: (id: string) => void;
  // Communication
  addNotice: (input: Omit<Notice, "id" | "createdOn" | "status"> & { status?: Notice["status"] }) => void;
  sendNotice: (
    id: string,
    gateway?: {
      results?: Array<{
        to: string;
        ok: boolean;
        sandbox?: boolean;
        detail?: string;
        error?: string;
      }>;
    },
  ) => number;
  previewNoticeRecipients: (input: {
    audience: Notice["audience"];
    channel: Notice["channel"];
    className?: string;
    section?: string;
    feeFilter?: Notice["feeFilter"];
  }) => number;
  deleteNotice: (id: string) => void;
  addSystemUser: (input: Omit<SystemUser, "id" | "createdOn"> & { createdOn?: string }) => void;
  updateSystemUser: (id: string, patch: Partial<SystemUser>) => void;
  deleteSystemUser: (id: string) => void;
  addPurchaseOrder: (input: {
    vendor: string;
    lines: Array<{
      itemName: string;
      quantity: number;
      unitCost: number;
      inventoryItemId?: string;
    }>;
    status?: PurchaseOrder["status"];
    date?: string;
    campusId?: string;
    notes?: string;
    poNo?: string;
  }) => void;
  receivePurchaseOrder: (id: string) => boolean;
  cancelPurchaseOrder: (id: string) => boolean;
  deletePurchaseOrder: (id: string) => void;
  addHostelVisitor: (input: Omit<HostelVisitor, "id">) => void;
  checkoutHostelVisitor: (id: string) => void;
  generateTransportFee: (
    month: string,
    dueDate: string,
    options?: { routeId?: string },
  ) => number;
  pushAudit: (action: string, entity: string, detail: string) => void;
  addHomework: (input: Omit<Homework, "id" | "createdOn" | "status"> & { status?: Homework["status"] }) => void;
  closeHomework: (id: string) => void;
  deleteHomework: (id: string) => void;
  submitHomework: (homeworkId: string, submission: HomeworkSubmission) => void;
  gradeHomeworkSubmission: (
    homeworkId: string,
    studentId: string,
    grade: Pick<HomeworkSubmission, "score" | "feedback" | "gradedAt" | "gradedBy">,
  ) => void;
  importStudentsCsv: (csvText: string) => { added: number; skipped: number; errors: string[] };
  importStaffCsv: (csvText: string) => { added: number; skipped: number; errors: string[] };
  rolloverAcademicYear: (newYear: string, options?: { promoteClasses?: boolean; clearAttendance?: boolean }) => {
    promoted: number;
    graduated: number;
  };
  replaceWorkspace: (payload: Partial<ImsData>) => void;
  exportWorkspaceJson: () => string;
  // Stats
  stats: {
    totalStudents: number;
    totalStaff: number;
    pendingAdmissions: number;
    feeCollectedMonth: number;
    feePendingMonth: number;
    feeCollectedAll: number;
    feePendingAll: number;
    feeOverdueAll: number;
    attendanceToday: number;
    attendanceCountedToday: number;
    activeClasses: number;
    campuses: number;
    feeCollectedLabel: string;
    feePendingLabel: string;
    feeCollectedAllLabel: string;
    feePendingAllLabel: string;
    feeOverdueLabel: string;
    revenueAll: number;
    expenseAll: number;
    payrollPaidAll: number;
    payrollPendingAll: number;
    netPosition: number;
    revenueLabel: string;
    expenseLabel: string;
    payrollPendingLabel: string;
    netPositionLabel: string;
  };
}

const DataContext = createContext<DataContextValue | null>(null);

function hydrate(raw: Partial<ImsData> | null): ImsData {
  const base = seedData();
  if (!raw) return base;
  const routeAssignments = raw.routeAssignments ?? base.routeAssignments;
  const routes = syncRouteCounts(raw.routes ?? base.routes, routeAssignments);
  const merged: ImsData = {
    ...base,
    ...raw,
    institute: raw.institute ?? base.institute,
    students: raw.students ?? base.students,
    admissions: raw.admissions ?? base.admissions,
    fees: refreshFeeLedger(
      (raw.fees ?? base.fees).map((f) => normalizeFee(f as FeeInvoice)),
      resolveFeePolicy(raw.feePolicy ?? base.feePolicy),
    ),
    feeStructures: raw.feeStructures ?? base.feeStructures,
    staff: raw.staff ?? base.staff,
    leaves: raw.leaves ?? base.leaves,
    payroll: raw.payroll ?? base.payroll,
    classes: syncClassEnrolled(raw.classes ?? base.classes, raw.students ?? base.students),
    subjects: raw.subjects ?? base.subjects,
    attendance: raw.attendance ?? base.attendance,
    staffAttendance: raw.staffAttendance ?? base.staffAttendance,
    exams: raw.exams ?? base.exams,
    results: (raw.results ?? base.results).map((r) =>
      r.percentage != null && r.passed != null
        ? r
        : buildExamResult({ ...r, obtained: r.obtained, total: r.total }),
    ),
    papers: raw.papers ?? base.papers,
    books: raw.books ?? base.books,
    bookIssues: raw.bookIssues ?? base.bookIssues,
    routes,
    routeAssignments,
    hostelRooms: raw.hostelRooms ?? base.hostelRooms,
    hostelAllotments: raw.hostelAllotments ?? base.hostelAllotments,
    inventory: raw.inventory ?? base.inventory,
    inventoryTxns: raw.inventoryTxns ?? base.inventoryTxns,
    vouchers: raw.vouchers ?? base.vouchers,
    expenses: raw.expenses ?? base.expenses,
    trips: raw.trips ?? base.trips,
    notices: raw.notices ?? base.notices,
    deliveries: raw.deliveries ?? base.deliveries,
    systemUsers: raw.systemUsers ?? base.systemUsers,
    auditLogs: raw.auditLogs ?? base.auditLogs,
    purchaseOrders: (raw.purchaseOrders ?? base.purchaseOrders).map((po) =>
      normalizePurchaseOrder(po as PurchaseOrder),
    ),
    hostelVisitors: raw.hostelVisitors ?? base.hostelVisitors,
    timetable: raw.timetable ?? base.timetable,
    homework: raw.homework ?? base.homework,
    feePolicy: resolveFeePolicy(raw.feePolicy ?? base.feePolicy),
    alertSettings: {
      ...base.alertSettings,
      ...(raw.alertSettings ?? {}),
    },
  };
  return merged;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { session, ready: authReady } = useAuth();
  const tenantId = useMemo(() => resolveTenantId(session), [session]);
  const [data, setData] = useState<ImsData>(seedData);
  const [ready, setReady] = useState(false);
  const skipPersist = useRef(true);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/school-data?tenantId=${tenantId}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const json = (await res.json()) as { data: Partial<ImsData> };
          if (!cancelled && json.data) {
            const hydrated = hydrate(json.data);
            setData(hydrated);
            try {
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
            } catch {
              // ignore
            }
            skipPersist.current = true;
            setReady(true);
            return;
          }
        }
      } catch {
        // fall through to localStorage
      }

      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setData(hydrate(JSON.parse(raw) as Partial<ImsData>));
        } else {
          const legacy =
            window.localStorage.getItem("ims.data.v3") ||
            window.localStorage.getItem("ims.data.v2") ||
            window.localStorage.getItem("ims.data.v1");
          if (legacy) {
            setData(hydrate(JSON.parse(legacy) as Partial<ImsData>));
            window.localStorage.removeItem("ims.data.v3");
            window.localStorage.removeItem("ims.data.v2");
            window.localStorage.removeItem("ims.data.v1");
          } else {
            setData(hydrate(null));
          }
        }
      } catch {
        setData(hydrate(null));
      }
      skipPersist.current = true;
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, tenantId]);

  useEffect(() => {
    if (!ready) return;
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore
    }
    const timer = window.setTimeout(() => {
      void fetch("/api/school-data", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, data }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const result = (await res.json().catch(() => null)) as { error?: string } | null;
            console.error(
              "Failed to persist school data to PostgreSQL",
              result?.error ?? `HTTP ${res.status}`,
            );
          }
        })
        .catch((error) => {
          console.error("Failed to persist school data to PostgreSQL", error);
        });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [data, ready, tenantId]);

  const mutate = useCallback((updater: (prev: ImsData) => ImsData) => {
    setData((prev) => updater(prev));
  }, []);

  const resetData = useCallback(() => {
    const fresh = hydrate(null);
    setData(fresh);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // ignore
    }
    void fetch("/api/school-data", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, data: fresh }),
    });
  }, [tenantId]);

  const value = useMemo<DataContextValue>(() => {
    const actor = session?.user.name ?? session?.user.email ?? "Admin";
    const activeStudents = data.students.filter((s) => s.status === "active");
    const pendingAdmissions = data.admissions.filter((a) =>
      ["inquiry", "applied", "under_review", "approved"].includes(a.status),
    ).length;
    const totals = feeTotals(data.fees);
    const att = todayAttendanceStats(data.attendance);
    const revenueAll = sumMoney(
      data.vouchers.filter((v) => v.type === "receipt").map((v) => v.amount),
    );
    const expenseFromVouchers = sumMoney(
      data.vouchers.filter((v) => v.type === "payment").map((v) => v.amount),
    );
    const expenseAll = sumMoney(data.expenses.map((e) => e.amount));
    const payrollPaidAll = sumMoney(
      data.payroll.filter((p) => p.status === "paid").map((p) => p.net),
    );
    const payrollPendingAll = sumMoney(
      data.payroll.filter((p) => p.status !== "paid").map((p) => p.net),
    );
    const netPosition = roundMoney(revenueAll - expenseFromVouchers);

    return {
      ready,
      data,
      user: currentUser,
      resetData,
      updateInstitute: (patch) =>
        mutate((prev) => ({
          ...prev,
          institute: { ...prev.institute, ...patch },
          auditLogs: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actor,
              action: "update_institute",
              entity: "settings",
              detail: Object.keys(patch).join(", "),
            },
            ...prev.auditLogs,
          ].slice(0, 200),
        })),
      addCampus: (campus) =>
        mutate((prev) => ({
          ...prev,
          institute: {
            ...prev.institute,
            campuses: [
              ...prev.institute.campuses,
              { ...campus, id: uid("camp") },
            ],
          },
        })),

      addStudent: (input) => {
        const student: Student = {
          ...input,
          id: uid("s"),
          admissionNo:
            input.admissionNo ||
            `${data.institute.shortName}-${new Date().getFullYear()}-${String(data.students.length + 1).padStart(4, "0")}`,
        };
        mutate((prev) => {
          const students = [student, ...prev.students];
          return {
            ...prev,
            students,
            classes: syncClassEnrolled(prev.classes, students),
            auditLogs: [
              {
                id: uid("au"),
                at: new Date().toISOString(),
                actor,
                action: "add_student",
                entity: "student",
                detail: `${student.firstName} ${student.lastName} (${student.admissionNo})`,
              },
              ...prev.auditLogs,
            ].slice(0, 200),
          };
        });
        return student;
      },
      updateStudent: (id, patch) =>
        mutate((prev) => {
          const students = prev.students.map((s) => (s.id === id ? { ...s, ...patch } : s));
          return {
            ...prev,
            students,
            classes: syncClassEnrolled(prev.classes, students),
            auditLogs: [
              {
                id: uid("au"),
                at: new Date().toISOString(),
                actor,
                action: "update_student",
                entity: "student",
                detail: `${id}: ${Object.keys(patch).join(", ")}`,
              },
              ...prev.auditLogs,
            ].slice(0, 200),
          };
        }),
      deleteStudent: (id) =>
        mutate((prev) => {
          const students = prev.students.filter((s) => s.id !== id);
          return {
            ...prev,
            students,
            classes: syncClassEnrolled(prev.classes, students),
            auditLogs: [
              {
                id: uid("au"),
                at: new Date().toISOString(),
                actor,
                action: "delete_student",
                entity: "student",
                detail: id,
              },
              ...prev.auditLogs,
            ].slice(0, 200),
          };
        }),

      addAdmission: (input) =>
        mutate((prev) => ({
          ...prev,
          admissions: [
            {
              ...input,
              id: uid("a"),
              appliedOn: todayIso(),
              status: input.status ?? "inquiry",
            },
            ...prev.admissions,
          ],
        })),
      updateAdmissionStatus: (id, status) =>
        mutate((prev) => ({
          ...prev,
          admissions: prev.admissions.map((a) =>
            a.id === id ? { ...a, status } : a,
          ),
        })),
      updateAdmission: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          admissions: prev.admissions.map((a) =>
            a.id === id ? { ...a, ...patch } : a,
          ),
        })),
      enrollAdmission: (id, options) => {
        let result: { studentId: string; feeId?: string } | null = null;
        mutate((prev) => {
          const app = prev.admissions.find((a) => a.id === id);
          if (!app || app.status === "enrolled") return prev;

          const linkedClass = options?.className
            ? undefined
            : prev.classes.find((c) => c.id === app.classId);
          const className =
            options?.className?.trim() ||
            linkedClass?.name ||
            app.applyingFor.split("—")[0]?.trim() ||
            app.applyingFor.trim() ||
            "Class 1";
          const section =
            options?.section?.trim() ||
            app.section ||
            linkedClass?.section ||
            "A";
          const gender = options?.gender || app.gender || "male";
          const dateOfBirth =
            options?.dateOfBirth || app.dateOfBirth || "2015-01-01";

          const structureId = options?.feeStructureId || app.feeStructureId;
          const structure = structureId
            ? prev.feeStructures.find((s) => s.id === structureId)
            : prev.feeStructures.find(
                (s) =>
                  s.className === className ||
                  className.startsWith(s.className) ||
                  s.className.startsWith(className.replace(/\s*—.*$/, "").trim()),
              );

          const [firstName, ...rest] = app.applicantName.trim().split(/\s+/);
          const student: Student = {
            id: uid("s"),
            admissionNo: `${prev.institute.shortName}-${new Date().getFullYear()}-${String(prev.students.length + 1).padStart(4, "0")}`,
            firstName: firstName || app.applicantName,
            lastName: rest.join(" ") || "-",
            gender,
            dateOfBirth,
            phone: app.phone,
            email: app.email,
            className,
            section,
            campusId: app.campusId,
            status: "active",
            enrollmentDate: todayIso(),
            address: app.address,
            documents: app.documents ? structuredClone(app.documents) : undefined,
            guardians: [
              {
                name: app.fatherName,
                relation: "Father",
                phone: app.phone,
              },
            ],
          };

          const createFee = options?.createFee !== false;
          const baseAmount = structure?.amount ?? 0;
          const fee =
            createFee && baseAmount > 0
              ? buildFeeInvoice({
                  id: uid("f"),
                  studentId: student.id,
                  studentName: `${student.firstName} ${student.lastName}`,
                  className: `${student.className}-${student.section}`,
                  month:
                    options?.month ||
                    new Date().toLocaleString("en-PK", {
                      month: "long",
                      year: "numeric",
                    }),
                  baseAmount,
                  discount: options?.discount ?? 0,
                  dueDate:
                    options?.dueDate ||
                    todayIso(new Date(Date.now() + 7 * 86400000)),
                  feeHead: structure?.name ?? "Admission / Tuition",
                  applyLateFee: false,
                  policy: prev.feePolicy,
                })
              : null;

          result = {
            studentId: student.id,
            feeId: fee?.id,
          };

          const students = [student, ...prev.students];
          return {
            ...prev,
            students,
            classes: syncClassEnrolled(prev.classes, students),
            admissions: prev.admissions.map((a) =>
              a.id === id
                ? {
                    ...a,
                    status: "enrolled" as const,
                    applyingFor: className,
                    section,
                    gender,
                    dateOfBirth,
                    feeStructureId: structure?.id ?? a.feeStructureId,
                    classId: linkedClass?.id ?? a.classId,
                  }
                : a,
            ),
            fees: fee ? [fee, ...prev.fees] : prev.fees,
            auditLogs: [
              {
                id: uid("au"),
                at: new Date().toISOString(),
                actor,
                action: "enroll_admission",
                entity: "admission",
                detail: `${app.applicantName} → ${student.admissionNo} (${className}-${section})${fee ? ` · fee ${fee.id}` : ""}`,
              },
              ...prev.auditLogs,
            ].slice(0, 200),
          };
        });
        return result;
      },
      deleteAdmission: (id) =>
        mutate((prev) => ({
          ...prev,
          admissions: prev.admissions.filter((a) => a.id !== id),
        })),

      addFee: (input) =>
        mutate((prev) => ({
          ...prev,
          fees: [
            buildFeeInvoice({
              id: uid("f"),
              studentId: input.studentId,
              studentName: input.studentName,
              className: input.className,
              month: input.month,
              baseAmount: input.amount,
              discount: input.discount ?? 0,
              dueDate: input.dueDate,
              paid: input.paid ?? 0,
              feeHead: input.feeHead,
              applyLateFee: true,
              policy: prev.feePolicy,
            }),
            ...prev.fees,
          ],
        })),
      addFeeFromStructure: (input) =>
        mutate((prev) => {
          const structure = prev.feeStructures.find((s) => s.id === input.structureId);
          const student = prev.students.find((s) => s.id === input.studentId);
          if (!structure || !student) return prev;
          return {
            ...prev,
            fees: [
              buildFeeInvoice({
                id: uid("f"),
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
                className: `${student.className}-${student.section}`,
                month: input.month,
                baseAmount: structure.amount,
                discount: input.discount ?? 0,
                dueDate: input.dueDate,
                feeHead: structure.name,
                applyLateFee: true,
                policy: prev.feePolicy,
              }),
              ...prev.fees,
            ],
          };
        }),
      collectFee: (id, amount, paymentMode = "cash") => {
        let result = { applied: 0, change: 0 };
        mutate((prev) => {
          const current = prev.fees.find((f) => f.id === id);
          if (!current) return prev;
          const { fee, applied, change } = collectAgainstFee(current, amount, prev.feePolicy);
          result = { applied, change };
          const vouchers =
            applied > 0
              ? [
                  {
                    id: uid("v"),
                    voucherNo: nextVoucherNo(prev.vouchers, "receipt"),
                    date: todayIso(),
                    type: "receipt" as const,
                    account: "Student Fee Income",
                    description: `Fee collection — ${fee.studentName} (${fee.month}) · ${paymentMode}`,
                    amount: roundMoney(applied),
                    campusId: prev.institute.campuses[0]?.id ?? "camp1",
                  },
                  ...prev.vouchers,
                ]
              : prev.vouchers;
          const audit: AuditLog = {
            id: uid("au"),
            at: new Date().toISOString(),
            actor: "IMS",
            action: "collect_fee",
            entity: "fee",
            detail: `${fee.studentName} · ${formatCurrency(applied)} · ${fee.month} · ${paymentMode}`,
          };
          return {
            ...prev,
            fees: prev.fees.map((f) =>
              f.id === id
                ? { ...fee, paymentMode, paidOn: todayIso() }
                : f,
            ),
            vouchers,
            auditLogs: [audit, ...prev.auditLogs].slice(0, 200),
          };
        });
        return result;
      },
      waiveFee: (id, remarks) =>
        mutate((prev) => ({
          ...prev,
          fees: prev.fees.map((f) =>
            f.id === id
              ? {
                  ...f,
                  status: "waived" as const,
                  remarks: remarks ?? f.remarks ?? "Waived by admin",
                }
              : f,
          ),
          auditLogs: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actor: "IMS",
              action: "waive_fee",
              entity: "fee",
              detail: id,
            },
            ...prev.auditLogs,
          ].slice(0, 200),
        })),
      generateClassFees: (input) => {
        let created = 0;
        mutate((prev) => {
          const structure = prev.feeStructures.find((s) => s.id === input.structureId);
          if (!structure) return prev;
          const targetClass = input.className ?? structure.className;
          const students = prev.students.filter(
            (s) =>
              s.status === "active" &&
              (s.className === targetClass ||
                `${s.className}-${s.section}` === targetClass ||
                s.className.startsWith(targetClass)),
          );
          const newFees = [];
          for (const student of students) {
            const exists = prev.fees.some(
              (f) =>
                f.studentId === student.id &&
                f.month === input.month &&
                (f.feeHead === structure.name || f.baseAmount === structure.amount),
            );
            if (exists) continue;
            created += 1;
            newFees.push(
              buildFeeInvoice({
                id: uid("f"),
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
                className: `${student.className}-${student.section}`,
                month: input.month,
                baseAmount: structure.amount,
                discount: input.discount ?? 0,
                dueDate: input.dueDate,
                feeHead: structure.name,
                applyLateFee: true,
                policy: prev.feePolicy,
              }),
            );
          }
          if (!newFees.length) return prev;
          return {
            ...prev,
            fees: [...newFees, ...prev.fees],
            auditLogs: [
              {
                id: uid("au"),
                at: new Date().toISOString(),
                actor: "IMS",
                action: "bulk_generate_fees",
                entity: "fee",
                detail: `${structure.name} · ${input.month} · ${created} challans`,
              },
              ...prev.auditLogs,
            ].slice(0, 200),
          };
        });
        return created;
      },
      payFeeOnline: (id, amount, gateway) => {
        let out: { ok: boolean; txnRef?: string; applied?: number; error?: string } = {
          ok: false,
          error: "Not found",
        };
        mutate((prev) => {
          const current = prev.fees.find((f) => f.id === id);
          if (!current) return prev;
          const balance = Math.max(0, current.amount - current.paid);
          if (balance <= 0) {
            out = { ok: false, error: "Already paid" };
            return prev;
          }
          const { fee, applied } = collectAgainstFee(current, amount, prev.feePolicy);
          if (applied <= 0) {
            out = { ok: false, error: "Nothing applied" };
            return prev;
          }
          const txnRef = `${gateway.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
          const voucher = {
            id: uid("v"),
            voucherNo: nextVoucherNo(prev.vouchers, "receipt"),
            date: todayIso(),
            type: "receipt" as const,
            account: "Student Fee Income",
            description: `Online ${gateway} · ${fee.studentName} (${fee.month}) · ${txnRef}`,
            amount: roundMoney(applied),
            campusId: prev.institute.campuses[0]?.id ?? "camp1",
          };
          const audit: AuditLog = {
            id: uid("au"),
            at: new Date().toISOString(),
            actor: "Online pay",
            action: "pay_online",
            entity: "fee",
            detail: `${gateway} ${txnRef} · ${formatCurrency(applied)}`,
          };
          out = { ok: true, txnRef, applied };
          return {
            ...prev,
            fees: prev.fees.map((f) =>
              f.id === id
                ? { ...fee, paymentMode: gateway, txnRef, paidOn: todayIso() }
                : f,
            ),
            vouchers: [voucher, ...prev.vouchers],
            auditLogs: [audit, ...prev.auditLogs].slice(0, 200),
          };
        });
        return out;
      },
      recalculateFees: () =>
        mutate((prev) => ({
          ...prev,
          fees: refreshFeeLedger(prev.fees, prev.feePolicy),
        })),
      updateFeePolicy: (patch) =>
        mutate((prev) => {
          const feePolicy = resolveFeePolicy({ ...prev.feePolicy, ...patch });
          return {
            ...prev,
            feePolicy,
            fees: refreshFeeLedger(prev.fees, feePolicy),
          };
        }),
      updateAlertSettings: (patch) =>
        mutate((prev) => ({
          ...prev,
          alertSettings: { ...prev.alertSettings, ...patch },
        })),
      deleteFee: (id) =>
        mutate((prev) => ({
          ...prev,
          fees: prev.fees.filter((f) => f.id !== id),
        })),
      addFeeStructure: (input) =>
        mutate((prev) => ({
          ...prev,
          feeStructures: [{ ...input, id: uid("fs") }, ...prev.feeStructures],
        })),
      updateFeeStructure: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          feeStructures: prev.feeStructures.map((s) =>
            s.id === id ? { ...s, ...patch } : s,
          ),
        })),
      deleteFeeStructure: (id) =>
        mutate((prev) => ({
          ...prev,
          feeStructures: prev.feeStructures.filter((s) => s.id !== id),
        })),

      addStaff: (input) =>
        mutate((prev) => ({
          ...prev,
          staff: [
            {
              ...input,
              id: uid("st"),
              employeeNo:
                input.employeeNo ||
                `EMP-${String(prev.staff.length + 1).padStart(3, "0")}`,
            },
            ...prev.staff,
          ],
        })),
      updateStaff: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          staff: prev.staff.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      deleteStaff: (id) =>
        mutate((prev) => ({
          ...prev,
          staff: prev.staff.filter((s) => s.id !== id),
        })),
      requestLeave: (input) =>
        mutate((prev) => {
          const staff = prev.staff.find((s) => s.id === input.staffId);
          if (!staff) return prev;
          const from = input.from;
          const to = input.to < from ? from : input.to;
          const days = inclusiveDayCount(from, to);
          const leave: LeaveRequest = {
            id: uid("lv"),
            staffId: staff.id,
            staffName: staff.name,
            from,
            to,
            days,
            type: input.type,
            status: "pending",
          };
          return { ...prev, leaves: [leave, ...prev.leaves] };
        }),
      approveLeave: (id) =>
        mutate((prev) => ({
          ...prev,
          leaves: prev.leaves.map((l) =>
            l.id === id ? { ...l, status: "approved" as LeaveStatus } : l,
          ),
        })),
      rejectLeave: (id) =>
        mutate((prev) => ({
          ...prev,
          leaves: prev.leaves.map((l) =>
            l.id === id ? { ...l, status: "rejected" as LeaveStatus } : l,
          ),
        })),
      generatePayroll: (month, withAllowances = true) => {
        let created = 0;
        mutate((prev) => {
          const active = prev.staff.filter((s) => s.status === "active" && (s.salary ?? 0) > 0);
          let payroll = [...prev.payroll];
          for (const member of active) {
            const existing = payroll.find(
              (p) => p.staffId === member.id && p.month === month,
            );
            if (existing?.status === "paid") continue;

            const unpaidDays = unpaidLeaveDaysForMonth(prev.leaves, member.id, month);
            const line = computePayrollLine(member.salary ?? 0, {
              withAllowances,
              unpaidLeaveDays: unpaidDays,
            });
            if (existing) {
              payroll = payroll.map((p) =>
                p.id === existing.id
                  ? {
                      ...p,
                      staffName: member.name,
                      basic: line.basic,
                      allowances: line.allowances,
                      deductions: line.deductions,
                      net: line.net,
                      leaveDays: line.unpaidLeaveDays,
                      leaveDeduction: line.leaveDeduction,
                      taxDeduction: line.taxDeduction,
                      status: "processed" as const,
                    }
                  : p,
              );
              created += 1;
            } else {
              payroll = [
                {
                  id: uid("pr"),
                  month,
                  staffId: member.id,
                  staffName: member.name,
                  basic: line.basic,
                  allowances: line.allowances,
                  deductions: line.deductions,
                  net: line.net,
                  leaveDays: line.unpaidLeaveDays,
                  leaveDeduction: line.leaveDeduction,
                  taxDeduction: line.taxDeduction,
                  status: "processed" as const,
                },
                ...payroll,
              ];
              created += 1;
            }
          }
          if (!created) return prev;
          return { ...prev, payroll };
        });
        return created;
      },
      updatePayrollStatus: (id, status) =>
        mutate((prev) => ({
          ...prev,
          payroll: prev.payroll.map((p) => (p.id === id ? { ...p, status } : p)),
        })),
      updatePayrollLine: (id, patch) => {
        let ok = false;
        mutate((prev) => {
          const row = prev.payroll.find((p) => p.id === id);
          if (!row || row.status === "paid") return prev;
          const allowances =
            patch.allowances !== undefined
              ? roundMoney(Math.max(0, patch.allowances))
              : row.allowances;
          const deductions =
            patch.deductions !== undefined
              ? roundMoney(Math.max(0, patch.deductions))
              : row.deductions;
          const net = roundMoney(Math.max(0, row.basic + allowances - deductions));
          ok = true;
          return {
            ...prev,
            payroll: prev.payroll.map((p) =>
              p.id === id
                ? {
                    ...p,
                    allowances,
                    deductions,
                    net,
                    remarks: patch.remarks !== undefined ? patch.remarks : p.remarks,
                    status: "processed" as const,
                  }
                : p,
            ),
          };
        });
        return ok;
      },
      payPayroll: (id) => {
        let ok = false;
        mutate((prev) => {
          const row = prev.payroll.find((p) => p.id === id);
          if (!row || row.status === "paid" || row.net <= 0) return prev;
          const voucher = makePaymentVoucher(prev, {
            account: "Salaries",
            description: `Salary — ${row.staffName} (${row.month})`,
            amount: row.net,
          });
          ok = true;
          return {
            ...prev,
            payroll: prev.payroll.map((p) =>
              p.id === id
                ? { ...p, status: "paid" as const, paidOn: todayIso(), voucherId: voucher.id }
                : p,
            ),
            vouchers: [voucher, ...prev.vouchers],
          };
        });
        return ok;
      },
      payAllPayrollForMonth: (month) => {
        let paid = 0;
        mutate((prev) => {
          const pending = prev.payroll.filter(
            (p) => p.month === month && p.status !== "paid" && p.net > 0,
          );
          if (!pending.length) return prev;
          let vouchers = [...prev.vouchers];
          const payroll = prev.payroll.map((p) => {
            if (p.month !== month || p.status === "paid" || p.net <= 0) return p;
            const voucher = makePaymentVoucher(
              { ...prev, vouchers },
              {
                account: "Salaries",
                description: `Salary — ${p.staffName} (${p.month})`,
                amount: p.net,
              },
            );
            vouchers = [voucher, ...vouchers];
            paid += 1;
            return {
              ...p,
              status: "paid" as const,
              paidOn: todayIso(),
              voucherId: voucher.id,
            };
          });
          return { ...prev, payroll, vouchers };
        });
        return paid;
      },

      addClass: (input) =>
        mutate((prev) => ({
          ...prev,
          classes: [{ ...input, id: uid("c") }, ...prev.classes],
        })),
      updateClass: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          classes: prev.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteClass: (id) =>
        mutate((prev) => ({
          ...prev,
          classes: prev.classes.filter((c) => c.id !== id),
        })),
      addSubject: (input) =>
        mutate((prev) => ({
          ...prev,
          subjects: [{ ...input, id: uid("sub") }, ...prev.subjects],
        })),
      deleteSubject: (id) =>
        mutate((prev) => ({
          ...prev,
          subjects: prev.subjects.filter((s) => s.id !== id),
        })),
      addTimetableSlot: (input) =>
        mutate((prev) => ({
          ...prev,
          timetable: [{ ...input, id: uid("tt") }, ...prev.timetable],
        })),
      deleteTimetableSlot: (id) =>
        mutate((prev) => ({
          ...prev,
          timetable: prev.timetable.filter((t) => t.id !== id),
        })),

      upsertAttendance: (input) =>
        mutate((prev) => {
          const period = input.period ?? 0;
          const existing = prev.attendance.find(
            (a) =>
              a.studentId === input.studentId &&
              a.date === input.date &&
              a.className === input.className &&
              (a.period ?? 0) === period,
          );
          if (existing) {
            return {
              ...prev,
              attendance: prev.attendance.map((a) =>
                a.id === existing.id
                  ? { ...a, ...input, period, id: existing.id }
                  : a,
              ),
            };
          }
          return {
            ...prev,
            attendance: [{ ...input, period, id: uid("att") }, ...prev.attendance],
          };
        }),
      setAttendanceStatus: (id, status) =>
        mutate((prev) => ({
          ...prev,
          attendance: prev.attendance.map((a) =>
            a.id === id ? { ...a, status } : a,
          ),
        })),
      upsertStaffAttendance: (input) =>
        mutate((prev) => {
          const existing = prev.staffAttendance.find(
            (a) => a.staffId === input.staffId && a.date === input.date,
          );
          if (existing) {
            return {
              ...prev,
              staffAttendance: prev.staffAttendance.map((a) =>
                a.id === existing.id ? { ...a, ...input, id: existing.id } : a,
              ),
            };
          }
          return {
            ...prev,
            staffAttendance: [{ ...input, id: uid("satt") }, ...prev.staffAttendance],
          };
        }),

      addExam: (input) =>
        mutate((prev) => ({
          ...prev,
          exams: [{ ...input, published: input.published ?? false, id: uid("e") }, ...prev.exams],
        })),
      updateExam: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          exams: prev.exams.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteExam: (id) =>
        mutate((prev) => ({
          ...prev,
          exams: prev.exams.filter((e) => e.id !== id),
        })),
      addResult: (input) =>
        mutate((prev) => {
          const existing = prev.results.find(
            (r) =>
              r.examId === input.examId &&
              r.studentId === input.studentId &&
              r.subject === input.subject,
          );
          const built = buildExamResult({
            id: existing?.id ?? uid("r"),
            examId: input.examId,
            studentId: input.studentId,
            studentName: input.studentName,
            className: input.className,
            subject: input.subject,
            obtained: input.obtained,
            total: input.total,
          });
          if (existing) {
            return {
              ...prev,
              results: prev.results.map((r) => (r.id === existing.id ? built : r)),
            };
          }
          return { ...prev, results: [built, ...prev.results] };
        }),
      updateResult: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          results: prev.results.map((r) => {
            if (r.id !== id) return r;
            return buildExamResult({
              id: r.id,
              examId: r.examId,
              studentId: r.studentId,
              studentName: r.studentName,
              className: r.className,
              subject: patch.subject ?? r.subject,
              obtained: patch.obtained ?? r.obtained,
              total: patch.total ?? r.total,
            });
          }),
        })),
      deleteResult: (id) =>
        mutate((prev) => ({
          ...prev,
          results: prev.results.filter((r) => r.id !== id),
        })),
      publishExamResults: (examId, published) =>
        mutate((prev) => ({
          ...prev,
          exams: prev.exams.map((e) =>
            e.id === examId
              ? {
                  ...e,
                  published,
                  status: published ? ("completed" as const) : e.status,
                }
              : e,
          ),
          auditLogs: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actor: "IMS",
              action: published ? "publish_results" : "unpublish_results",
              entity: "exam",
              detail: examId,
            },
            ...prev.auditLogs,
          ].slice(0, 200),
        })),
      addPaper: (input) =>
        mutate((prev) => ({
          ...prev,
          papers: [
            {
              ...input,
              id: uid("pap"),
              createdOn: input.createdOn ?? todayIso(),
            },
            ...prev.papers,
          ],
        })),
      updatePaper: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          papers: prev.papers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      deletePaper: (id) =>
        mutate((prev) => ({
          ...prev,
          papers: prev.papers.filter((p) => p.id !== id),
        })),

      addBook: (input) =>
        mutate((prev) => ({
          ...prev,
          books: [
            {
              ...input,
              id: uid("b"),
              available: input.available ?? input.copies,
            },
            ...prev.books,
          ],
        })),
      updateBook: (id, patch) => {
        let ok = false;
        mutate((prev) => {
          const book = prev.books.find((b) => b.id === id);
          if (!book) return prev;
          const nextCopies =
            patch.copies !== undefined
              ? Math.max(1, Number(patch.copies))
              : book.copies;
          const issued = Math.max(0, book.copies - book.available);
          if (nextCopies < issued) return prev;
          const nextAvailable =
            patch.available !== undefined
              ? Math.max(0, Math.min(nextCopies, Number(patch.available)))
              : nextCopies - issued;
          ok = true;
          return {
            ...prev,
            books: prev.books.map((b) =>
              b.id === id
                ? {
                    ...b,
                    ...patch,
                    copies: nextCopies,
                    available: nextAvailable,
                  }
                : b,
            ),
          };
        });
        return ok;
      },
      deleteBook: (id) => {
        let ok = false;
        mutate((prev) => {
          const open = prev.bookIssues.some(
            (i) => i.bookId === id && i.status !== "returned",
          );
          if (open) return prev;
          if (!prev.books.some((b) => b.id === id)) return prev;
          ok = true;
          return {
            ...prev,
            books: prev.books.filter((b) => b.id !== id),
          };
        });
        return ok;
      },
      issueBook: (input) => {
        let ok = false;
        mutate((prev) => {
          const book = prev.books.find((b) => b.id === input.bookId);
          if (!book || book.available <= 0) return prev;
          let memberName = "";
          if (input.memberType === "student") {
            const s = prev.students.find((x) => x.id === input.memberId);
            if (!s || s.status !== "active") return prev;
            memberName = `${s.firstName} ${s.lastName}`;
          } else {
            const s = prev.staff.find((x) => x.id === input.memberId);
            if (!s || s.status !== "active") return prev;
            memberName = s.name;
          }
          const days = Math.max(1, input.days ?? 14);
          const issueDate = new Date();
          const due = new Date(issueDate.getTime() + days * 86400000);
          ok = true;
          return {
            ...prev,
            books: prev.books.map((b) =>
              b.id === input.bookId ? { ...b, available: b.available - 1 } : b,
            ),
            bookIssues: [
              {
                id: uid("bi"),
                bookId: input.bookId,
                bookTitle: book.title,
                memberName,
                memberType: input.memberType,
                memberId: input.memberId,
                issueDate: issueDate.toISOString().slice(0, 10),
                dueDate: due.toISOString().slice(0, 10),
                status: "issued" as const,
                fine: 0,
                renewedCount: 0,
              },
              ...prev.bookIssues,
            ],
          };
        });
        return ok;
      },
      renewBook: (issueId, extraDays = 14) => {
        let ok = false;
        mutate((prev) => {
          const issue = prev.bookIssues.find((i) => i.id === issueId);
          if (!issue || issue.status === "returned") return prev;
          const days = Math.max(1, extraDays);
          const base = new Date(
            Math.max(Date.now(), new Date(`${issue.dueDate}T00:00:00`).getTime()),
          );
          const due = new Date(base.getTime() + days * 86400000);
          ok = true;
          return {
            ...prev,
            bookIssues: prev.bookIssues.map((i) =>
              i.id === issueId
                ? {
                    ...i,
                    dueDate: due.toISOString().slice(0, 10),
                    status: "issued" as const,
                    renewedCount: (i.renewedCount ?? 0) + 1,
                  }
                : i,
            ),
          };
        });
        return ok;
      },
      returnBook: (issueId) =>
        mutate((prev) => {
          const issue = prev.bookIssues.find((i) => i.id === issueId);
          if (!issue || issue.status === "returned") return prev;
          const fine = libraryOverdueFine(issue.dueDate);
          return {
            ...prev,
            books: prev.books.map((b) =>
              b.id === issue.bookId ? { ...b, available: b.available + 1 } : b,
            ),
            bookIssues: prev.bookIssues.map((i) =>
              i.id === issueId
                ? {
                    ...i,
                    status: "returned" as const,
                    returnDate: todayIso(),
                    fine,
                  }
                : i,
            ),
          };
        }),
      previewLibraryFine: (issueId) => {
        const issue = data.bookIssues.find((i) => i.id === issueId);
        if (!issue || issue.status === "returned") return 0;
        return libraryOverdueFine(issue.dueDate);
      },

      addRoute: (input) =>
        mutate((prev) => ({
          ...prev,
          routes: [
            { ...input, id: uid("tr"), studentsCount: input.studentsCount ?? 0 },
            ...prev.routes,
          ],
        })),
      updateRoute: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          routes: prev.routes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteRoute: (id) =>
        mutate((prev) => {
          const routeAssignments = prev.routeAssignments.filter((a) => a.routeId !== id);
          return {
            ...prev,
            routes: prev.routes.filter((r) => r.id !== id),
            routeAssignments,
          };
        }),
      addRouteAssignment: (routeId, studentId) =>
        mutate((prev) => {
          const route = prev.routes.find((r) => r.id === routeId);
          const student = prev.students.find((s) => s.id === studentId);
          if (!route || route.status !== "active" || !student) return prev;
          if (student.status !== "active") return prev;
          if (prev.routeAssignments.some((a) => a.studentId === studentId)) return prev;
          const routeAssignments: RouteAssignment[] = [
            {
              id: uid("ra"),
              routeId,
              studentId,
              studentName: `${student.firstName} ${student.lastName}`,
            },
            ...prev.routeAssignments,
          ];
          return {
            ...prev,
            routeAssignments,
            routes: syncRouteCounts(prev.routes, routeAssignments),
          };
        }),
      removeRouteAssignment: (id) =>
        mutate((prev) => {
          const routeAssignments = prev.routeAssignments.filter((a) => a.id !== id);
          return {
            ...prev,
            routeAssignments,
            routes: syncRouteCounts(prev.routes, routeAssignments),
          };
        }),

      addHostelRoom: (input) =>
        mutate((prev) => {
          const occupied = input.occupied ?? 0;
          const status =
            occupied >= input.capacity
              ? ("full" as const)
              : ("available" as const);
          return {
            ...prev,
            hostelRooms: [
              { ...input, id: uid("hr"), occupied, status },
              ...prev.hostelRooms,
            ],
          };
        }),
      updateHostelRoom: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          hostelRooms: prev.hostelRooms.map((r) => {
            if (r.id !== id) return r;
            const next = { ...r, ...patch };
            if (patch.status === "maintenance") {
              return { ...next, status: "maintenance" as const };
            }
            if (next.occupied >= next.capacity) {
              return { ...next, status: "full" as const };
            }
            return { ...next, status: "available" as const };
          }),
        })),
      allotHostel: (studentId, roomId, messFee = 8000) => {
        let ok = false;
        mutate((prev) => {
          const student = prev.students.find((s) => s.id === studentId);
          const room = prev.hostelRooms.find((r) => r.id === roomId);
          if (!student || student.status !== "active") return prev;
          if (!room || room.status === "maintenance" || room.occupied >= room.capacity) {
            return prev;
          }
          if (
            prev.hostelAllotments.some(
              (a) => a.studentId === studentId && a.status === "active",
            )
          ) {
            return prev;
          }
          const occupied = room.occupied + 1;
          ok = true;
          return {
            ...prev,
            hostelRooms: prev.hostelRooms.map((r) =>
              r.id === roomId
                ? {
                    ...r,
                    occupied,
                    status: occupied >= r.capacity ? ("full" as const) : ("available" as const),
                  }
                : r,
            ),
            hostelAllotments: [
              {
                id: uid("ha"),
                studentId,
                studentName: `${student.firstName} ${student.lastName}`,
                roomId,
                roomLabel: `${room.block}-${room.roomNo}`,
                allotDate: todayIso(),
                status: "active" as const,
                messFee,
              },
              ...prev.hostelAllotments,
            ],
          };
        });
        return ok;
      },
      vacateHostel: (allotmentId) =>
        mutate((prev) => {
          const allotment = prev.hostelAllotments.find((a) => a.id === allotmentId);
          if (!allotment || allotment.status !== "active") return prev;
          return {
            ...prev,
            hostelAllotments: prev.hostelAllotments.map((a) =>
              a.id === allotmentId ? { ...a, status: "vacated" as const } : a,
            ),
            hostelRooms: prev.hostelRooms.map((r) => {
              if (r.id !== allotment.roomId) return r;
              if (r.status === "maintenance") {
                return { ...r, occupied: Math.max(0, r.occupied - 1) };
              }
              const occupied = Math.max(0, r.occupied - 1);
              return {
                ...r,
                occupied,
                status: occupied >= r.capacity ? ("full" as const) : ("available" as const),
              };
            }),
          };
        }),
      updateAllotmentMessFee: (allotmentId, messFee) =>
        mutate((prev) => ({
          ...prev,
          hostelAllotments: prev.hostelAllotments.map((a) =>
            a.id === allotmentId && a.status === "active"
              ? { ...a, messFee: Math.max(0, messFee) }
              : a,
          ),
        })),
      collectMessFee: (allotmentId, amount, month, dueDate) => {
        let ok = false;
        mutate((prev) => {
          const allotment = prev.hostelAllotments.find((a) => a.id === allotmentId);
          if (!allotment || allotment.status !== "active") return prev;
          const student = prev.students.find((s) => s.id === allotment.studentId);
          const messAmount = amount ?? allotment.messFee ?? 8000;
          if (messAmount <= 0) return prev;
          const monthLabel =
            month ||
            new Date().toLocaleString("en-PK", {
              month: "long",
              year: "numeric",
            });
          const exists = prev.fees.some(
            (f) =>
              f.studentId === allotment.studentId &&
              f.month === monthLabel &&
              f.feeHead === "Hostel Mess Fee",
          );
          if (exists) return prev;
          const fee = buildFeeInvoice({
            id: uid("f"),
            studentId: allotment.studentId,
            studentName: allotment.studentName,
            className: student
              ? `${student.className}-${student.section}`
              : "Hostel",
            month: monthLabel,
            baseAmount: messAmount,
            dueDate:
              dueDate || todayIso(new Date(Date.now() + 7 * 86400000)),
            feeHead: "Hostel Mess Fee",
            applyLateFee: false,
            policy: prev.feePolicy,
            remarks: `Mess fee — room ${allotment.roomLabel}`,
          });
          ok = true;
          return { ...prev, fees: [fee, ...prev.fees] };
        });
        return ok;
      },
      generateMessFees: (month, dueDate, options) => {
        let created = 0;
        mutate((prev) => {
          const newFees: FeeInvoice[] = [];
          for (const allotment of prev.hostelAllotments) {
            if (allotment.status !== "active") continue;
            if (options?.roomId && allotment.roomId !== options.roomId) continue;
            const messAmount = allotment.messFee ?? 0;
            if (messAmount <= 0) continue;
            const student = prev.students.find((s) => s.id === allotment.studentId);
            if (!student || student.status !== "active") continue;
            const exists = prev.fees.some(
              (f) =>
                f.studentId === allotment.studentId &&
                f.month === month &&
                f.feeHead === "Hostel Mess Fee",
            );
            if (exists) continue;
            newFees.push(
              buildFeeInvoice({
                id: uid("f"),
                studentId: allotment.studentId,
                studentName: allotment.studentName,
                className: `${student.className}-${student.section}`,
                month,
                baseAmount: messAmount,
                dueDate,
                feeHead: "Hostel Mess Fee",
                applyLateFee: false,
                policy: prev.feePolicy,
                remarks: `Mess fee — room ${allotment.roomLabel}`,
              }),
            );
          }
          created = newFees.length;
          if (!newFees.length) return prev;
          return {
            ...prev,
            fees: [...newFees, ...prev.fees],
            auditLogs: [
              {
                id: uid("au"),
                at: new Date().toISOString(),
                actor,
                action: "generate_mess_fees",
                entity: "hostel",
                detail: `${created} challan(s) · ${month}${options?.roomId ? ` · room ${options.roomId}` : ""}`,
              },
              ...prev.auditLogs,
            ].slice(0, 200),
          };
        });
        return created;
      },

      addInventoryItem: (input) =>
        mutate((prev) => ({
          ...prev,
          inventory: [
            {
              ...input,
              id: uid("inv"),
              status: inventoryStatus(input.quantity, input.minStock),
            },
            ...prev.inventory,
          ],
        })),
      updateInventoryItem: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          inventory: prev.inventory.map((i) => {
            if (i.id !== id) return i;
            const next = { ...i, ...patch };
            return {
              ...next,
              status: inventoryStatus(next.quantity, next.minStock),
            };
          }),
        })),
      adjustStock: (id, delta, note) => {
        let ok = false;
        mutate((prev) => {
          const item = prev.inventory.find((i) => i.id === id);
          if (!item) return prev;
          if (delta < 0 && item.quantity + delta < 0) return prev;
          const quantity = Math.max(0, item.quantity + delta);
          const txn: InventoryTxn = {
            id: uid("itxn"),
            itemId: id,
            delta,
            note: note || (delta >= 0 ? "Purchase" : "Issue"),
            date: todayIso(),
          };
          ok = true;
          return {
            ...prev,
            inventory: prev.inventory.map((i) =>
              i.id === id
                ? {
                    ...i,
                    quantity,
                    status: inventoryStatus(quantity, i.minStock),
                  }
                : i,
            ),
            inventoryTxns: [txn, ...prev.inventoryTxns],
          };
        });
        return ok;
      },
      deleteInventoryItem: (id) =>
        mutate((prev) => ({
          ...prev,
          inventory: prev.inventory.filter((i) => i.id !== id),
        })),

      addVoucher: (input) =>
        mutate((prev) => ({
          ...prev,
          vouchers: [
            {
              ...input,
              id: uid("v"),
              voucherNo:
                input.voucherNo ||
                nextVoucherNo(prev.vouchers, input.type),
            },
            ...prev.vouchers,
          ],
        })),
      deleteVoucher: (id) =>
        mutate((prev) => ({
          ...prev,
          vouchers: prev.vouchers.filter((v) => v.id !== id),
        })),

      addExpense: (input) =>
        mutate((prev) => {
          const { postVoucher = true, ...rest } = input;
          const expenseId = uid("ex");
          let vouchers = prev.vouchers;
          let voucherId: string | undefined;
          if (postVoucher && rest.amount > 0) {
            const voucher = makePaymentVoucher(prev, {
              account: EXPENSE_ACCOUNT[rest.category],
              description: `${rest.title} — ${rest.paidTo}`,
              amount: rest.amount,
              campusId: rest.campusId,
            });
            voucherId = voucher.id;
            vouchers = [voucher, ...vouchers];
          }
          const expense: Expense = {
            ...rest,
            id: expenseId,
            amount: roundMoney(rest.amount),
            voucherId,
          };
          return {
            ...prev,
            expenses: [expense, ...prev.expenses],
            vouchers,
          };
        }),
      deleteExpense: (id) =>
        mutate((prev) => {
          const expense = prev.expenses.find((e) => e.id === id);
          return {
            ...prev,
            expenses: prev.expenses.filter((e) => e.id !== id),
            vouchers: expense?.voucherId
              ? prev.vouchers.filter((v) => v.id !== expense.voucherId)
              : prev.vouchers,
          };
        }),

      addTrip: (input) =>
        mutate((prev) => ({
          ...prev,
          trips: [{ ...input, id: uid("tr") }, ...prev.trips],
        })),
      updateTripStatus: (id, status) =>
        mutate((prev) => ({
          ...prev,
          trips: prev.trips.map((t) => (t.id === id ? { ...t, status } : t)),
        })),
      settleTrip: (id) => {
        let ok = false;
        mutate((prev) => {
          const trip = prev.trips.find((t) => t.id === id);
          if (!trip || trip.status === "paid") return prev;
          const amount =
            trip.lines.reduce((s, l) => s + l.amount, 0) || trip.estimatedBudget;
          if (amount <= 0) return prev;
          const voucher = makePaymentVoucher(prev, {
            account: EXPENSE_ACCOUNT.travel_trip,
            description: `Trip settle — ${trip.title} (${trip.destination})`,
            amount,
            campusId: trip.campusId,
          });
          ok = true;
          return {
            ...prev,
            trips: prev.trips.map((t) =>
              t.id === id
                ? {
                    ...t,
                    status: "paid" as const,
                    settledOn: todayIso(),
                    voucherId: voucher.id,
                  }
                : t,
            ),
            vouchers: [voucher, ...prev.vouchers],
          };
        });
        return ok;
      },
      deleteTrip: (id) =>
        mutate((prev) => ({
          ...prev,
          trips: prev.trips.filter((t) => t.id !== id),
        })),

      addNotice: (input) =>
        mutate((prev) => ({
          ...prev,
          notices: [
            {
              ...input,
              id: uid("n"),
              createdOn: new Date().toISOString().slice(0, 10),
              status: input.status ?? "draft",
            },
            ...prev.notices,
          ],
        })),
      previewNoticeRecipients: (input) =>
        resolveNoticeRecipients(data, input).length,
      sendNotice: (id, gateway) => {
        let count = 0;
        mutate((prev) => {
          const notice = prev.notices.find((n) => n.id === id);
          if (!notice || notice.status === "sent") return prev;

          const recipients = resolveNoticeRecipients(prev, notice);
          const gatewayByTo = new Map(
            (gateway?.results ?? []).map((r) => [r.to.trim().toLowerCase(), r]),
          );
          const usedGateway = gatewayByTo.size > 0;
          const logs: DeliveryLog[] = [];

          if (notice.channel === "notice_board") {
            logs.push({
              id: uid("dl"),
              noticeId: id,
              channel: "notice_board",
              recipientName: "Notice board",
              recipientContact: "campus",
              status: "board_only",
              at: new Date().toISOString(),
              detail: "Posted to digital notice board",
            });
          } else {
            for (const r of recipients) {
              const gw = gatewayByTo.get(r.contact.trim().toLowerCase());
              let status: DeliveryLog["status"] = "sent";
              let detail = usedGateway
                ? "Gateway delivery"
                : `Queued locally (${notice.channel})`;
              if (gw) {
                status = gw.ok ? "sent" : "failed";
                detail = gw.ok
                  ? `${gw.sandbox ? "Sandbox" : "Live"} · ${gw.detail ?? "ok"}`
                  : gw.error || gw.detail || "Gateway failed";
              } else if (usedGateway) {
                status = "failed";
                detail = "No gateway result for contact";
              }
              logs.push({
                id: uid("dl"),
                noticeId: id,
                channel: notice.channel,
                recipientName: r.name,
                recipientContact: r.contact,
                status,
                at: new Date().toISOString(),
                detail,
              });
            }
          }

          count = logs.length;
          if (!count) return prev;
          return {
            ...prev,
            notices: prev.notices.map((n) =>
              n.id === id
                ? {
                    ...n,
                    status: "sent" as const,
                    sentOn: todayIso(),
                    deliveryCount: count,
                  }
                : n,
            ),
            deliveries: [...logs, ...prev.deliveries].slice(0, 500),
            auditLogs: [
              {
                id: uid("au"),
                at: new Date().toISOString(),
                actor,
                action: "send_notice",
                entity: "notice",
                detail: `${notice.title} · ${count} via ${notice.channel}${notice.className ? ` · ${notice.className}` : ""}${notice.feeFilter && notice.feeFilter !== "all" ? ` · ${notice.feeFilter}` : ""}`,
              },
              ...prev.auditLogs,
            ].slice(0, 200),
          };
        });
        return count;
      },
      deleteNotice: (id) =>
        mutate((prev) => ({
          ...prev,
          notices: prev.notices.filter((n) => n.id !== id),
        })),

      addSystemUser: (input) =>
        mutate((prev) => ({
          ...prev,
          systemUsers: [
            {
              ...input,
              id: uid("su"),
              createdOn: input.createdOn ?? todayIso(),
            },
            ...prev.systemUsers,
          ],
          auditLogs: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actor,
              action: "add_user",
              entity: "user",
              detail: `${input.name} (${input.role})`,
            },
            ...prev.auditLogs,
          ].slice(0, 200),
        })),
      updateSystemUser: (id, patch) =>
        mutate((prev) => ({
          ...prev,
          systemUsers: prev.systemUsers.map((u) => (u.id === id ? { ...u, ...patch } : u)),
          auditLogs: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actor,
              action: "update_user",
              entity: "user",
              detail: `${id}: ${Object.keys(patch).join(", ")}`,
            },
            ...prev.auditLogs,
          ].slice(0, 200),
        })),
      deleteSystemUser: (id) =>
        mutate((prev) => ({
          ...prev,
          systemUsers: prev.systemUsers.filter((u) => u.id !== id),
          auditLogs: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actor,
              action: "delete_user",
              entity: "user",
              detail: id,
            },
            ...prev.auditLogs,
          ].slice(0, 200),
        })),

      addPurchaseOrder: (input) =>
        mutate((prev) => {
          const lines: PurchaseOrderLine[] = (input.lines ?? [])
            .filter((l) => l.itemName.trim() && l.quantity > 0)
            .map((l, idx) => ({
              id: uid(`pol${idx}`),
              itemName: l.itemName.trim(),
              quantity: Math.max(1, Number(l.quantity) || 1),
              unitCost: Math.max(0, Number(l.unitCost) || 0),
              inventoryItemId: l.inventoryItemId || undefined,
            }));
          if (!lines.length) return prev;
          const first = lines[0]!;
          const total = roundMoney(
            lines.reduce((s, l) => s + l.quantity * l.unitCost, 0),
          );
          const po: PurchaseOrder = normalizePurchaseOrder({
            id: uid("po"),
            poNo:
              input.poNo ||
              `PO-${new Date().getFullYear()}-${String(prev.purchaseOrders.length + 1).padStart(3, "0")}`,
            vendor: input.vendor.trim(),
            lines,
            itemName: first.itemName,
            quantity: first.quantity,
            unitCost: first.unitCost,
            inventoryItemId: first.inventoryItemId,
            total,
            status: input.status ?? "ordered",
            date: input.date ?? todayIso(),
            campusId: input.campusId ?? prev.institute.campuses[0]?.id ?? "camp1",
            notes: input.notes,
          });
          return {
            ...prev,
            purchaseOrders: [po, ...prev.purchaseOrders],
          };
        }),
      receivePurchaseOrder: (id) => {
        let ok = false;
        mutate((prev) => {
          const po = prev.purchaseOrders.find((p) => p.id === id);
          if (!po || po.status === "received" || po.status === "cancelled") {
            return prev;
          }
          let inventory = [...prev.inventory];
          let inventoryTxns = [...prev.inventoryTxns];
          for (const line of purchaseOrderLines(po)) {
            if (line.inventoryItemId) {
              const exists = inventory.some((i) => i.id === line.inventoryItemId);
              if (exists) {
                inventory = inventory.map((item) => {
                  if (item.id !== line.inventoryItemId) return item;
                  const quantity = item.quantity + line.quantity;
                  return {
                    ...item,
                    quantity,
                    unitCost: line.unitCost || item.unitCost,
                    status: inventoryStatus(quantity, item.minStock),
                  };
                });
                inventoryTxns = [
                  {
                    id: uid("itxn"),
                    itemId: line.inventoryItemId,
                    delta: line.quantity,
                    note: `PO ${po.poNo} · ${line.itemName}`,
                    date: todayIso(),
                  },
                  ...inventoryTxns,
                ];
                continue;
              }
            }
            const newItem: InventoryItem = {
              id: uid("inv"),
              sku: `SKU-${Date.now().toString(36).slice(-5)}`,
              name: line.itemName,
              category: "Purchase",
              quantity: line.quantity,
              unit: "pcs",
              minStock: 1,
              location: "Store",
              status: inventoryStatus(line.quantity, 1),
              unitCost: line.unitCost,
              preferredVendor: po.vendor,
            };
            inventory = [newItem, ...inventory];
            inventoryTxns = [
              {
                id: uid("itxn"),
                itemId: newItem.id,
                delta: line.quantity,
                note: `PO ${po.poNo} · new item`,
                date: todayIso(),
              },
              ...inventoryTxns,
            ];
          }
          ok = true;
          return {
            ...prev,
            purchaseOrders: prev.purchaseOrders.map((p) =>
              p.id === id ? { ...p, status: "received" as const } : p,
            ),
            inventory,
            inventoryTxns,
          };
        });
        return ok;
      },
      cancelPurchaseOrder: (id) => {
        let ok = false;
        mutate((prev) => {
          const po = prev.purchaseOrders.find((p) => p.id === id);
          if (!po || po.status === "received" || po.status === "cancelled") {
            return prev;
          }
          ok = true;
          return {
            ...prev,
            purchaseOrders: prev.purchaseOrders.map((p) =>
              p.id === id ? { ...p, status: "cancelled" as const } : p,
            ),
          };
        });
        return ok;
      },
      deletePurchaseOrder: (id) =>
        mutate((prev) => ({
          ...prev,
          purchaseOrders: prev.purchaseOrders.filter(
            (p) => p.id !== id || p.status === "received",
          ),
        })),

      addHostelVisitor: (input) =>
        mutate((prev) => ({
          ...prev,
          hostelVisitors: [{ ...input, id: uid("hv") }, ...prev.hostelVisitors],
        })),
      checkoutHostelVisitor: (id) =>
        mutate((prev) => ({
          ...prev,
          hostelVisitors: prev.hostelVisitors.map((v) =>
            v.id === id ? { ...v, outTime: new Date().toISOString() } : v,
          ),
        })),

      postLibraryFineAsFee: (issueId) => {
        let ok = false;
        mutate((prev) => {
          const issue = prev.bookIssues.find((i) => i.id === issueId);
          if (!issue || issue.finePosted) return prev;
          if (issue.memberType !== "student") return prev;
          const fine =
            issue.status === "returned"
              ? issue.fine
              : libraryOverdueFine(issue.dueDate);
          if (fine <= 0) return prev;
          const student =
            (issue.memberId
              ? prev.students.find((s) => s.id === issue.memberId)
              : undefined) ??
            prev.students.find(
              (s) => `${s.firstName} ${s.lastName}` === issue.memberName,
            );
          if (!student) return prev;
          const fee = buildFeeInvoice({
            id: uid("f"),
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            className: `${student.className}-${student.section}`,
            month: `Library fine ${todayIso()}`,
            baseAmount: fine,
            discount: 0,
            dueDate: todayIso(),
            feeHead: "Library overdue fine",
            applyLateFee: false,
            policy: prev.feePolicy,
          });
          ok = true;
          return {
            ...prev,
            fees: [fee, ...prev.fees],
            bookIssues: prev.bookIssues.map((i) =>
              i.id === issueId
                ? { ...i, fine, finePosted: true }
                : i,
            ),
          };
        });
        return ok;
      },

      generateTransportFee: (month, dueDate, options) => {
        let created = 0;
        mutate((prev) => {
          const newFees: FeeInvoice[] = [];
          for (const a of prev.routeAssignments) {
            if (options?.routeId && a.routeId !== options.routeId) continue;
            const route = prev.routes.find((r) => r.id === a.routeId);
            const student = prev.students.find((s) => s.id === a.studentId);
            if (!route || route.status !== "active" || !student || route.fee <= 0) {
              continue;
            }
            if (student.status !== "active") continue;
            const exists = prev.fees.some(
              (f) =>
                f.studentId === student.id &&
                f.month === month &&
                f.feeHead === "Transport",
            );
            if (exists) continue;
            newFees.push(
              buildFeeInvoice({
                id: uid("f"),
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`,
                className: `${student.className}-${student.section}`,
                month,
                baseAmount: route.fee,
                discount: 0,
                dueDate,
                feeHead: "Transport",
                remarks: route.name,
                applyLateFee: true,
                policy: prev.feePolicy,
              }),
            );
          }
          created = newFees.length;
          if (!newFees.length) return prev;
          return {
            ...prev,
            fees: [...newFees, ...prev.fees],
            auditLogs: [
              {
                id: uid("au"),
                at: new Date().toISOString(),
                actor,
                action: "generate_transport_fees",
                entity: "transport",
                detail: `${created} challan(s) · ${month}${options?.routeId ? ` · route ${options.routeId}` : ""}`,
              },
              ...prev.auditLogs,
            ].slice(0, 200),
          };
        });
        return created;
      },

      pushAudit: (action, entity, detail) =>
        mutate((prev) => ({
          ...prev,
          auditLogs: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actor,
              action,
              entity,
              detail,
            },
            ...prev.auditLogs,
          ].slice(0, 200),
        })),

      addHomework: (input) =>
        mutate((prev) => ({
          ...prev,
          homework: [
            {
              ...input,
              id: uid("hw"),
              createdOn: todayIso(),
              status: input.status ?? "assigned",
            },
            ...prev.homework,
          ],
        })),
      closeHomework: (id) =>
        mutate((prev) => ({
          ...prev,
          homework: prev.homework.map((h) =>
            h.id === id ? { ...h, status: "closed" as const } : h,
          ),
        })),
      deleteHomework: (id) =>
        mutate((prev) => ({
          ...prev,
          homework: prev.homework.filter((h) => h.id !== id),
        })),
      submitHomework: (homeworkId, submission) =>
        mutate((prev) => ({
          ...prev,
          homework: prev.homework.map((homework) =>
            homework.id === homeworkId
              ? {
                  ...homework,
                  submissions: [
                    ...(homework.submissions ?? []).filter(
                      (existing) => existing.studentId !== submission.studentId,
                    ),
                    submission,
                  ],
                }
              : homework,
          ),
        })),
      gradeHomeworkSubmission: (homeworkId, studentId, grade) =>
        mutate((prev) => ({
          ...prev,
          homework: prev.homework.map((homework) =>
            homework.id === homeworkId
              ? {
                  ...homework,
                  submissions: (homework.submissions ?? []).map((submission) =>
                    submission.studentId === studentId
                      ? { ...submission, ...grade }
                      : submission,
                  ),
                }
              : homework,
          ),
        })),

      importStudentsCsv: (csvText) => {
        const campusId = data.institute.campuses[0]?.id ?? "camp1";
        const { rows, errors } = parseStudentsCsv(csvText, campusId);
        let added = 0;
        for (const row of rows) {
          const student: Student = {
            ...row,
            id: uid("s"),
            admissionNo: `${data.institute.shortName}-${new Date().getFullYear()}-${String(data.students.length + added + 1).padStart(4, "0")}`,
          };
          mutate((prev) => {
            const students = [student, ...prev.students];
            return {
              ...prev,
              students,
              classes: syncClassEnrolled(prev.classes, students),
            };
          });
          added += 1;
        }
        if (added) {
          mutate((prev) => ({
            ...prev,
            auditLogs: [
              {
                id: uid("au"),
                at: new Date().toISOString(),
                actor,
                action: "import_students",
                entity: "student",
                detail: `Imported ${added} students`,
              },
              ...prev.auditLogs,
            ].slice(0, 200),
          }));
        }
        return { added, skipped: errors.length, errors };
      },

      importStaffCsv: (csvText) => {
        const campusId = data.institute.campuses[0]?.id ?? "camp1";
        const { rows, errors } = parseStaffCsv(csvText, campusId);
        let added = 0;
        for (const row of rows) {
          mutate((prev) => ({
            ...prev,
            staff: [
              {
                ...row,
                id: uid("st"),
                employeeNo:
                  `EMP-${new Date().getFullYear()}-${String(prev.staff.length + 1).padStart(3, "0")}`,
              },
              ...prev.staff,
            ],
          }));
          added += 1;
        }
        if (added) {
          mutate((prev) => ({
            ...prev,
            auditLogs: [
              {
                id: uid("au"),
                at: new Date().toISOString(),
                actor,
                action: "import_staff",
                entity: "staff",
                detail: `Imported ${added} staff`,
              },
              ...prev.auditLogs,
            ].slice(0, 200),
          }));
        }
        return { added, skipped: errors.length, errors };
      },

      rolloverAcademicYear: (newYear, options) => {
        const promote = options?.promoteClasses !== false;
        const clearAtt = options?.clearAttendance === true;
        let promoted = 0;
        let graduated = 0;

        if (promote) {
          for (const s of data.students) {
            if (s.status !== "active") continue;
            const result = promoteClassName(s.className);
            if (result.graduate) graduated += 1;
            else if (result.next !== s.className) promoted += 1;
          }
        }

        mutate((prev) => {
          let students = prev.students;
          let classes = prev.classes;

          if (promote) {
            classes = classes.map((c) => {
              const result = promoteClassName(c.name);
              return { ...c, name: result.graduate ? c.name : result.next };
            });
            students = students.map((s) => {
              if (s.status !== "active") return s;
              const result = promoteClassName(s.className);
              if (result.graduate) return { ...s, status: "alumni" as const };
              return { ...s, className: result.next };
            });
            classes = syncClassEnrolled(classes, students);
          }

          return {
            ...prev,
            institute: { ...prev.institute, academicYear: newYear },
            students,
            classes,
            attendance: clearAtt ? [] : prev.attendance,
            auditLogs: [
              {
                id: uid("au"),
                at: new Date().toISOString(),
                actor,
                action: "academic_year_rollover",
                entity: "settings",
                detail: `${prev.institute.academicYear} → ${newYear} · promoted=${promoted} graduated=${graduated}`,
              },
              ...prev.auditLogs,
            ].slice(0, 200),
          };
        });

        return { promoted, graduated };
      },

      replaceWorkspace: (payload) => {
        const hydrated = hydrate(payload);
        mutate(() => ({
          ...hydrated,
          auditLogs: [
            {
              id: uid("au"),
              at: new Date().toISOString(),
              actor,
              action: "restore_backup",
              entity: "workspace",
              detail: "Workspace restored from backup JSON",
            },
            ...hydrated.auditLogs,
          ].slice(0, 200),
        }));
      },

      exportWorkspaceJson: () =>
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            academicYear: data.institute.academicYear,
            instituteId: data.institute.id,
            data,
          },
          null,
          2,
        ),

      stats: {
        totalStudents: activeStudents.length,
        totalStaff: data.staff.filter((s) => s.status === "active").length,
        pendingAdmissions,
        feeCollectedMonth: totals.collectedMonth,
        feePendingMonth: totals.pendingMonth,
        feeCollectedAll: totals.collectedAll,
        feePendingAll: totals.pendingAll,
        feeOverdueAll: totals.overdueAll,
        attendanceToday: att.percentage,
        attendanceCountedToday: att.counted,
        activeClasses: data.classes.length,
        campuses: data.institute.campuses.length,
        feeCollectedLabel: formatCurrency(totals.collectedMonth),
        feePendingLabel: formatCurrency(totals.pendingMonth),
        feeCollectedAllLabel: formatCurrency(totals.collectedAll),
        feePendingAllLabel: formatCurrency(totals.pendingAll),
        feeOverdueLabel: formatCurrency(totals.overdueAll),
        revenueAll,
        expenseAll,
        payrollPaidAll,
        payrollPendingAll,
        netPosition,
        revenueLabel: formatCurrency(revenueAll),
        expenseLabel: formatCurrency(expenseAll),
        payrollPendingLabel: formatCurrency(payrollPendingAll),
        netPositionLabel: formatCurrency(netPosition),
      },
    };
  }, [data, mutate, ready, resetData, session]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
