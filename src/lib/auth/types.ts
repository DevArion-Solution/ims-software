import type { UserRole } from "@/types";

export type AuthPortal =
  | "super"
  | "admin"
  | "teacher"
  | "accountant"
  | "parent"
  | "student"
  | "principal"
  | "librarian"
  | "receptionist";

/** Server-side session stored in signed HTTP-only cookie */
export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  portal: AuthPortal;
  tenantId?: string;
  linkedStudentId?: string;
  linkedStudentIds?: string[];
  linkedStaffId?: string;
  impersonatingSchoolId?: string;
  impersonatingSchoolName?: string;
  /** Platform staff permissions (super admin portal only) */
  permissions: string[];
  exp: number;
  iat: number;
}

/** Client-safe session returned from API */
export interface ClientSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    instituteId: string;
    campusId?: string;
  };
  portal: AuthPortal;
  tenantId?: string;
  linkedStudentId?: string;
  linkedStudentIds?: string[];
  linkedStaffId?: string;
  impersonatingSchoolId?: string;
  impersonatingSchoolName?: string;
  permissions: string[];
}

export const SESSION_COOKIE = "ims_session";
export const RETURN_COOKIE = "ims_return_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
