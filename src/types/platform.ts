import type { InstituteType } from "@/types";

export type SchoolTenantStatus =
  | "pending"
  | "active"
  | "trial"
  | "suspended"
  | "expired"
  | "rejected";

export type RegistrationStatus = "pending" | "approved" | "rejected";

export type PlanBillingCycle = "monthly" | "yearly";

export type PlatformModuleId =
  | "dashboard"
  | "admissions"
  | "students"
  | "academics"
  | "attendance"
  | "exams"
  | "fees"
  | "accounts"
  | "staff"
  | "library"
  | "transport"
  | "hostel"
  | "inventory"
  | "communication"
  | "reports"
  | "settings"
  | "parent_portal"
  | "student_portal"
  | "teacher_portal"
  | "accountant_portal"
  | "principal_portal"
  | "librarian_portal"
  | "receptionist_portal";

export type PlatformStaffRole = "owner" | "support" | "sales" | "billing";

export interface PlatformPlan {
  id: string;
  name: string;
  code: "starter" | "growth" | "enterprise" | "custom";
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxStudents: number;
  maxStaff: number;
  maxCampuses: number;
  modules: PlatformModuleId[];
  trialDays: number;
  published: boolean;
  description: string;
  highlight?: boolean;
}

export interface SchoolTenant {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: InstituteType;
  city: string;
  address: string;
  phone: string;
  email: string;
  countryCode: string;
  status: SchoolTenantStatus;
  planId: string;
  billingCycle: PlanBillingCycle;
  modulesOverride?: PlatformModuleId[];
  maxStudentsOverride?: number;
  maxStaffOverride?: number;
  studentsCount: number;
  staffCount: number;
  campusesCount: number;
  adminName: string;
  adminEmail: string;
  registeredAt: string;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  mrr: number;
  notes?: string;
  logoInitials?: string;
}

export interface SchoolRegistration {
  id: string;
  instituteName: string;
  instituteType: InstituteType;
  city: string;
  address: string;
  phone: string;
  email: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  requestedPlanId: string;
  expectedStudents: number;
  message?: string;
  status: RegistrationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: PlatformStaffRole;
  active: boolean;
  lastActiveAt: string;
  permissions: string[];
}

export interface PlatformInvoice {
  id: string;
  schoolId: string;
  schoolName: string;
  planName: string;
  amount: number;
  status: "paid" | "due" | "overdue" | "void";
  period: string;
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
}

export interface PlatformAuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
}

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  allowSelfRegistration: boolean;
  requireApproval: boolean;
  defaultTrialDays: number;
  defaultPlanId: string;
  currency: string;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  jazzcashEnabled: boolean;
  easypaisaEnabled: boolean;
  stripeEnabled: boolean;
  maintenanceMode: boolean;
}

export interface PlatformData {
  schools: SchoolTenant[];
  registrations: SchoolRegistration[];
  plans: PlatformPlan[];
  users: PlatformUser[];
  invoices: PlatformInvoice[];
  audit: PlatformAuditEntry[];
  settings: PlatformSettings;
}

export interface PlatformStats {
  totalSchools: number;
  activeSchools: number;
  trialSchools: number;
  pendingRegistrations: number;
  suspendedSchools: number;
  totalStudents: number;
  totalStaff: number;
  mrr: number;
  arr: number;
  overdueInvoices: number;
}
