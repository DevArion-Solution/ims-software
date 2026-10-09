"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserRole } from "@/types";
import type { AuthPortal, ClientSession } from "@/lib/auth/types";
import { DEFAULT_TENANT_ID, resolveTenantId } from "@/lib/platform/resolve-tenant";

export type { AuthPortal };
export type AuthSession = ClientSession;

export interface DemoAccount {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  portal: AuthPortal;
  linkedStudentId?: string;
  linkedStudentIds?: string[];
  linkedStaffId?: string;
  description: string;
}

/** Client-side demo credentials for quick-login cards (dev/demo only) */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "super@ims.cloud",
    password: "super123",
    name: "Platform Owner",
    role: "super_admin",
    portal: "super",
    description: "Super Admin — all schools, plans, access & billing",
  },
  {
    email: "admin@ims.edu.pk",
    password: "admin123",
    name: "Ayesha Khan",
    role: "institute_admin",
    portal: "admin",
    description: "Full institute control — all modules",
  },
  {
    email: "teacher@ims.edu.pk",
    password: "teach123",
    name: "Ms. Rabia Anwar",
    role: "teacher",
    portal: "teacher",
    linkedStaffId: "st2",
    description: "Classes, attendance, marks entry",
  },
  {
    email: "accounts@ims.edu.pk",
    password: "fees123",
    name: "Mr. Shahid Mehmood",
    role: "accountant",
    portal: "accountant",
    linkedStaffId: "st3",
    description: "Fee collection, challans, vouchers",
  },
  {
    email: "parent@ims.edu.pk",
    password: "parent123",
    name: "Muhammad Raza",
    role: "parent",
    portal: "parent",
    linkedStudentId: "s1",
    linkedStudentIds: ["s1", "s2"],
    description: "Child fees, attendance, results, notices, pay online",
  },
  {
    email: "student@ims.edu.pk",
    password: "stu123",
    name: "Ahmed Raza",
    role: "student",
    portal: "student",
    linkedStudentId: "s1",
    description: "Timetable, results, fee status, notices",
  },
  {
    email: "principal@ims.edu.pk",
    password: "prin123",
    name: "Dr. Imran Malik",
    role: "principal",
    portal: "principal",
    linkedStaffId: "st1",
    description: "Approvals, staff overview, school pulse",
  },
  {
    email: "library@ims.edu.pk",
    password: "lib123",
    name: "Ms. Nadia Library",
    role: "librarian",
    portal: "librarian",
    linkedStaffId: "st4",
    description: "Catalog, issue/return, fines",
  },
  {
    email: "reception@ims.edu.pk",
    password: "recv123",
    name: "Sana Reception",
    role: "receptionist",
    portal: "receptionist",
    description: "Inquiries, visitors, student lookup",
  },
];

interface AuthContextValue {
  ready: boolean;
  session: AuthSession | null;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string; portal?: AuthPortal }>;
  loginAs: (account: DemoAccount) => Promise<{ ok: boolean; error?: string; portal?: AuthPortal }>;
  logout: () => Promise<void>;
  impersonateSchoolAdmin: (school: {
    id: string;
    name: string;
    adminName: string;
    adminEmail: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  exitImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const FETCH_OPTS: RequestInit = { credentials: "include" };

export function portalHome(portal: AuthPortal): string {
  switch (portal) {
    case "super":
      return "/super-admin";
    case "admin":
      return "/dashboard";
    case "teacher":
      return "/teacher";
    case "accountant":
      return "/accountant";
    case "parent":
      return "/parent";
    case "student":
      return "/student";
    case "principal":
      return "/principal";
    case "librarian":
      return "/librarian";
    case "receptionist":
      return "/receptionist";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { ...FETCH_OPTS, cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as { session: AuthSession | null };
          if (!cancelled && json.session) setSession(json.session);
        }
      } catch {
        // offline — no session
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        ...FETCH_OPTS,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        session?: AuthSession;
        portal?: AuthPortal;
      };

      if (!res.ok) {
        return { ok: false, error: json.error ?? "Login failed" };
      }

      if (json.session) setSession(json.session);
      return { ok: true, portal: json.portal };
    } catch {
      return { ok: false, error: "Network error — could not reach server" };
    }
  }, []);

  const loginAs = useCallback(
    async (account: DemoAccount) => login(account.email, account.password),
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { ...FETCH_OPTS, method: "POST" });
    } catch {
      // ignore
    }
    setSession(null);
  }, []);

  const impersonateSchoolAdmin = useCallback(
    async (school: { id: string; name: string; adminName: string; adminEmail: string }) => {
      try {
        const res = await fetch("/api/auth/impersonate", {
          ...FETCH_OPTS,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId: school.id,
            schoolName: school.name,
            adminName: school.adminName,
            adminEmail: school.adminEmail,
          }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string; session?: AuthSession };
        if (!res.ok) return { ok: false, error: json.error ?? "Impersonation failed" };
        if (json.session) setSession(json.session);
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [],
  );

  const exitImpersonation = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/impersonate", { ...FETCH_OPTS, method: "DELETE" });
      const json = (await res.json()) as { session?: AuthSession };
      if (json.session) setSession(json.session);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      ready,
      session,
      login,
      loginAs,
      logout,
      impersonateSchoolAdmin,
      exitImpersonation,
    }),
    [ready, session, login, loginAs, logout, impersonateSchoolAdmin, exitImpersonation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { DEFAULT_TENANT_ID, resolveTenantId };
