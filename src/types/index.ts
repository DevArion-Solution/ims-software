export type Locale = "en" | "ur";

export type InstituteType =
  | "school"
  | "college"
  | "university"
  | "academy"
  | "coaching"
  | "madrasa"
  | "vocational";

export type UserRole =
  | "super_admin"
  | "institute_admin"
  | "principal"
  | "teacher"
  | "accountant"
  | "librarian"
  | "receptionist"
  | "parent"
  | "student";

export type Gender = "male" | "female" | "other";
export type StudentStatus = "active" | "inactive" | "alumni" | "transferred" | "expelled";
export type AdmissionStatus =
  | "inquiry"
  | "applied"
  | "under_review"
  | "approved"
  | "rejected"
  | "enrolled"
  | "withdrawn";
export type FeeStatus = "pending" | "partial" | "paid" | "overdue" | "waived";
export type AttendanceStatus = "present" | "absent" | "late" | "leave" | "holiday";

export interface CountryPack {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  phoneCode: string;
  idLabel: string;
  dateFormat: string;
  locales: Locale[];
}

export interface Campus {
  id: string;
  name: string;
  city: string;
  address: string;
  isMain: boolean;
}

export interface Institute {
  id: string;
  name: string;
  shortName: string;
  type: InstituteType;
  countryCode: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  academicYear: string;
  campuses: Campus[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  instituteId: string;
  campusId?: string;
  avatarUrl?: string;
}

export interface Guardian {
  name: string;
  relation: string;
  phone: string;
  email?: string;
  cnic?: string;
  occupation?: string;
}

/** Uploaded proof / attachment (dataUrl may be a /uploads/... path or legacy data URL) */
export interface ProofDocument {
  id: string;
  label: string;
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  dateOfBirth: string;
  cnicOrBForm?: string;
  phone?: string;
  email?: string;
  className: string;
  section: string;
  campusId: string;
  status: StudentStatus;
  enrollmentDate: string;
  guardians: Guardian[];
  address?: string;
  documents?: ProofDocument[];
  /** ZKTeco / biometric device user id */
  biometricId?: string;
  /** RFID / card number from device */
  rfidTag?: string;
}

/** Auto WhatsApp / SMS / Gmail alert preferences (school workspace) */
export interface AlertSettings {
  absenceAutoNotify: boolean;
  absenceChannels: Array<"whatsapp" | "sms" | "email">;
  absenceLocale: "en" | "ur" | "both";
  feeReminderEnabled: boolean;
  feeReminderChannels: Array<"whatsapp" | "sms" | "email">;
  feeReminderLocale: "en" | "ur" | "both";
  /** Days of month to auto-run fee reminders (e.g. 1, 5, 10) */
  feeReminderDaysOfMonth: number[];
  lastFeeReminderAt?: string;
  /**
   * School's own Gmail for parent alerts / notices.
   * Use a Google App Password (16 chars), not the normal Gmail password.
   */
  gmailUser?: string;
  gmailAppPassword?: string;
  /** Optional display name in From: e.g. "ABC School" */
  gmailFromName?: string;
  gmailVerifiedAt?: string;
}

export interface AdmissionApplication {
  id: string;
  applicantName: string;
  fatherName: string;
  applyingFor: string;
  phone: string;
  email?: string;
  status: AdmissionStatus;
  appliedOn: string;
  campusId: string;
  source?: string;
  notes?: string;
  address?: string;
  previousSchool?: string;
  /** @deprecated use documents */
  checklist?: string[];
  documents?: ProofDocument[];
  gender?: Gender;
  dateOfBirth?: string;
  /** Preferred section when class is known */
  section?: string;
  /** Linked academic class id when picked from catalog */
  classId?: string;
  /** Preferred fee structure for enrollment challan */
  feeStructureId?: string;
}

export type EnrollAdmissionOptions = {
  className?: string;
  section?: string;
  gender?: Gender;
  dateOfBirth?: string;
  feeStructureId?: string;
  discount?: number;
  dueDate?: string;
  month?: string;
  createFee?: boolean;
};


export interface FeePolicy {
  flatLateFee: number;
  perDayLateFee: number;
  graceDays: number;
  maxLateFee: number;
}

export interface FeeInvoice {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  month: string;
  /** Base tuition before discount/late fee */
  baseAmount: number;
  discount: number;
  lateFee: number;
  /** Net payable = base - discount + lateFee */
  amount: number;
  paid: number;
  status: FeeStatus;
  dueDate: string;
  remarks?: string;
  /** Optional fee head / structure name */
  feeHead?: string;
  /** Last payment channel */
  paymentMode?: PaymentMode | OnlineGateway;
  txnRef?: string;
  paidOn?: string;
}

export type OnlineGateway = "jazzcash" | "easypaisa" | "card" | "stripe";

export type FeeFrequency = "monthly" | "quarterly" | "annual" | "one_time";

export interface FeeStructure {
  id: string;
  name: string;
  className: string;
  amount: number;
  frequency: FeeFrequency;
}

export type LeaveType = "casual" | "sick" | "annual" | "unpaid";
export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  from: string;
  to: string;
  days: number;
  type: LeaveType;
  status: LeaveStatus;
}

export type PayrollStatus = "draft" | "processed" | "paid";

export interface PayrollRun {
  id: string;
  month: string;
  staffId: string;
  staffName: string;
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  status: PayrollStatus;
  paidOn?: string;
  voucherId?: string;
  /** Approved unpaid leave days applied this month */
  leaveDays?: number;
  leaveDeduction?: number;
  taxDeduction?: number;
  remarks?: string;
}

export type PaymentMode = "cash" | "bank" | "cheque" | "online";

export type ExpenseCategory =
  | "utilities"
  | "supplies"
  | "maintenance"
  | "transport_ops"
  | "travel_trip"
  | "salaries"
  | "food_mess"
  | "marketing"
  | "rent"
  | "other";

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  title: string;
  description?: string;
  amount: number;
  paidTo: string;
  paymentMode: PaymentMode;
  campusId: string;
  voucherId?: string;
}

export type TripPurpose = "student_trip" | "staff_travel" | "official";
export type TripStatus = "planned" | "approved" | "completed" | "paid" | "cancelled";

export interface TripLine {
  label: string;
  amount: number;
}

export interface Trip {
  id: string;
  title: string;
  purpose: TripPurpose;
  destination: string;
  fromDate: string;
  toDate: string;
  staffId?: string;
  staffName?: string;
  participants: number;
  estimatedBudget: number;
  lines: TripLine[];
  notes?: string;
  campusId: string;
  status: TripStatus;
  voucherId?: string;
  settledOn?: string;
}

export interface RouteAssignment {
  id: string;
  routeId: string;
  studentId: string;
  studentName: string;
}

export interface StaffMember {
  id: string;
  employeeNo: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
  joinDate: string;
  salary?: number;
  campusId?: string;
  cnic?: string;
  documents?: ProofDocument[];
  /** Bank payout details for payslip / transfer */
  bankTitle?: string;
  bankAccount?: string;
  bankName?: string;
}

export interface AcademicClass {
  id: string;
  name: string;
  section: string;
  campusId: string;
  classTeacher?: string;
  capacity: number;
  enrolled: number;
  room?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  className: string;
  teacher?: string;
  periodsPerWeek: number;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  className: string;
  section: string;
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  remarks?: string;
  /**
   * Class period (1–8). `0` or omitted = whole-day / school-gate biometric.
   * Teacher laptop marks should set 1–8.
   */
  period?: number;
  /** Optional subject label from timetable */
  subject?: string;
}

export interface StaffAttendanceRecord {
  id: string;
  date: string;
  staffId: string;
  staffName: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface Exam {
  id: string;
  name: string;
  term: string;
  className: string;
  startDate: string;
  endDate: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  /** When true, results visible on parent/student portals */
  published?: boolean;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  className: string;
  subject: string;
  obtained: number;
  total: number;
  percentage: number;
  grade: string;
  passed: boolean;
}

export type ExamPaperStatus = "draft" | "ready" | "used";

export interface ExamPaper {
  id: string;
  title: string;
  examId?: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  totalMarks: number;
  durationMins: number;
  topics: string;
  status: ExamPaperStatus;
  createdOn: string;
}

export interface Book {
  id: string;
  accessionNo: string;
  title: string;
  author: string;
  category: string;
  copies: number;
  available: number;
  shelf?: string;
}

export interface BookIssue {
  id: string;
  bookId: string;
  bookTitle: string;
  memberName: string;
  memberType: "student" | "staff";
  /** Linked student or staff id when issued from catalog picker */
  memberId?: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  status: "issued" | "returned" | "overdue";
  fine: number;
  renewedCount?: number;
  /** Fine already posted as fee challan */
  finePosted?: boolean;
}

export type IssueBookInput = {
  bookId: string;
  memberType: "student" | "staff";
  memberId: string;
  days?: number;
};

export interface TransportRoute {
  id: string;
  name: string;
  vehicleNo: string;
  driver: string;
  driverPhone: string;
  stops: string[];
  studentsCount: number;
  fee: number;
  status: "active" | "inactive";
}

export interface HostelRoom {
  id: string;
  block: string;
  roomNo: string;
  capacity: number;
  occupied: number;
  type: "boys" | "girls" | "staff";
  status: "available" | "full" | "maintenance";
}

export interface HostelAllotment {
  id: string;
  studentId: string;
  studentName: string;
  roomId: string;
  roomLabel: string;
  allotDate: string;
  status: "active" | "vacated";
  messFee?: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  location: string;
  status: "in_stock" | "low" | "out";
  unitCost?: number;
  /** Preferred supplier for reorders */
  preferredVendor?: string;
}

export interface InventoryTxn {
  id: string;
  itemId: string;
  delta: number;
  note: string;
  date: string;
}

export interface AccountVoucher {
  id: string;
  voucherNo: string;
  date: string;
  type: "receipt" | "payment" | "journal" | "contra";
  account: string;
  description: string;
  amount: number;
  campusId: string;
}

export type NoticeAudience = "all" | "students" | "staff" | "parents";
export type NoticeChannel = "notice_board" | "sms" | "whatsapp" | "email";
export type NoticeFeeFilter = "all" | "pending" | "overdue";

export interface Notice {
  id: string;
  title: string;
  body: string;
  audience: NoticeAudience;
  channel: NoticeChannel;
  createdOn: string;
  status: "draft" | "sent" | "scheduled";
  sentOn?: string;
  deliveryCount?: number;
  /** Limit to this class name (empty = all classes) */
  className?: string;
  section?: string;
  /** Fee targeting for student/parent audiences */
  feeFilter?: NoticeFeeFilter;
}

export interface Homework {
  id: string;
  title: string;
  description: string;
  className: string;
  section: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  dueDate: string;
  createdOn: string;
  status: "assigned" | "closed";
}

export interface DeliveryLog {
  id: string;
  noticeId: string;
  channel: Notice["channel"];
  recipientName: string;
  recipientContact: string;
  status: "queued" | "sent" | "failed" | "board_only";
  at: string;
  detail?: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  campusId?: string;
  active: boolean;
  /** Module ids from NAV_MODULES; empty = all (admin) */
  modules: string[];
  createdOn: string;
}

export interface AuditLog {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
}

export interface PurchaseOrderLine {
  id: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  inventoryItemId?: string;
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  vendor: string;
  /** Multi-line items (preferred). Legacy single-line fields still accepted. */
  lines?: PurchaseOrderLine[];
  /** @deprecated use lines */
  itemName: string;
  /** @deprecated use lines */
  quantity: number;
  /** @deprecated use lines */
  unitCost: number;
  total: number;
  status: "draft" | "ordered" | "received" | "cancelled";
  date: string;
  campusId: string;
  /** @deprecated use lines[].inventoryItemId */
  inventoryItemId?: string;
  notes?: string;
}

export interface HostelVisitor {
  id: string;
  visitorName: string;
  studentId: string;
  studentName: string;
  relation: string;
  inTime: string;
  outTime?: string;
  notes?: string;
}

export interface TimetableSlot {
  id: string;
  day: string;
  period: number;
  className: string;
  section: string;
  subject: string;
  teacher: string;
  room?: string;
}

export interface DashboardStats {
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
}
