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
import type {
  PlatformAuditEntry,
  PlatformData,
  PlatformInvoice,
  PlatformModuleId,
  PlatformPlan,
  PlatformSettings,
  PlatformStats,
  PlatformUser,
  PlanBillingCycle,
  SchoolRegistration,
  SchoolTenant,
  SchoolTenantStatus,
} from "@/types/platform";
import type { InstituteType } from "@/types";
import { seedPlatform } from "@/lib/platform/seed";
import {
  addDaysIso,
  invoiceAmount,
  nextInvoiceId,
  periodLabel,
  todayIso as billingToday,
} from "@/lib/platform/billing";
import { useAuth } from "@/components/providers/AuthProvider";

const STORAGE_KEY = "ims.platform.v1";
const FETCH_OPTS: RequestInit = { credentials: "include" };

export interface ProvisionedCredentials {
  email: string;
  password: string;
  tenantId: string;
}

export interface BillingSweepResult {
  overdueMarked: number;
  suspended: number;
  trialsExpired: number;
  renewalsIssued: number;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function todayIso() {
  return billingToday();
}

function addDays(days: number) {
  return addDaysIso(todayIso(), days);
}

async function provisionAdminAccount(input: {
  tenantId: string;
  email: string;
  name: string;
}): Promise<ProvisionedCredentials | null> {
  try {
    const res = await fetch("/api/auth/provision", {
      ...FETCH_OPTS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      email?: string;
      password?: string;
      tenantId?: string;
    };
    if (!json.email || !json.password || !json.tenantId) return null;
    return { email: json.email, password: json.password, tenantId: json.tenantId };
  } catch {
    return null;
  }
}

async function fetchPlatform(): Promise<PlatformData | null> {
  try {
    const res = await fetch("/api/platform", { ...FETCH_OPTS, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PlatformData;
  } catch {
    return null;
  }
}

async function persistPlatform(data: PlatformData) {
  try {
    await fetch("/api/platform", {
      ...FETCH_OPTS,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error("Failed to persist platform to PostgreSQL", error);
  }
}

async function persistWorkspace(
  tenantId: string,
  school: {
    name: string;
    shortName: string;
    type: string;
    city: string;
    address: string;
    phone: string;
    email: string;
    countryCode?: string;
  },
) {
  try {
    await fetch("/api/platform/workspaces", {
      ...FETCH_OPTS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, school }),
    });
  } catch (error) {
    console.error("Failed to create school workspace", error);
  }
}

function computeStats(data: PlatformData): PlatformStats {
  const activeSchools = data.schools.filter((s) => s.status === "active").length;
  const trialSchools = data.schools.filter((s) => s.status === "trial").length;
  const mrr = data.schools.reduce((sum, s) => sum + (s.mrr || 0), 0);
  return {
    totalSchools: data.schools.length,
    activeSchools,
    trialSchools,
    pendingRegistrations: data.registrations.filter((r) => r.status === "pending").length,
    suspendedSchools: data.schools.filter((s) => s.status === "suspended").length,
    totalStudents: data.schools.reduce((sum, s) => sum + s.studentsCount, 0),
    totalStaff: data.schools.reduce((sum, s) => sum + s.staffCount, 0),
    mrr,
    arr: mrr * 12,
    overdueInvoices: data.invoices.filter((i) => i.status === "overdue").length,
  };
}

function pushAudit(
  data: PlatformData,
  entry: Omit<PlatformAuditEntry, "id" | "at"> & { at?: string },
): PlatformData {
  const row: PlatformAuditEntry = {
    id: uid("aud"),
    at: entry.at ?? new Date().toISOString(),
    actor: entry.actor,
    action: entry.action,
    target: entry.target,
    detail: entry.detail,
  };
  return { ...data, audit: [row, ...data.audit].slice(0, 200) };
}

interface PlatformContextValue {
  ready: boolean;
  data: PlatformData;
  stats: PlatformStats;
  resetPlatform: () => Promise<void>;
  refreshPlatform: () => Promise<void>;
  updateSettings: (patch: Partial<PlatformSettings>) => void;
  createSchool: (input: {
    name: string;
    shortName: string;
    type: InstituteType;
    city: string;
    address: string;
    phone: string;
    email: string;
    adminName: string;
    adminEmail: string;
    planId: string;
    billingCycle: PlanBillingCycle;
    status?: SchoolTenantStatus;
  }) => Promise<{ school: SchoolTenant; credentials: ProvisionedCredentials | null }>;
  updateSchool: (id: string, patch: Partial<SchoolTenant>) => void;
  setSchoolStatus: (id: string, status: SchoolTenantStatus, note?: string) => void;
  bulkSetSchoolStatus: (ids: string[], status: SchoolTenantStatus, note?: string) => void;
  assignPlan: (schoolId: string, planId: string, billingCycle: PlanBillingCycle) => void;
  setSchoolModules: (schoolId: string, modules: PlatformModuleId[]) => void;
  setSchoolLimits: (
    schoolId: string,
    limits: { maxStudents?: number; maxStaff?: number },
  ) => void;
  approveRegistration: (
    id: string,
    note?: string,
  ) => Promise<{ school: SchoolTenant; credentials: ProvisionedCredentials | null } | null>;
  rejectRegistration: (id: string, note?: string) => void;
  submitRegistration: (input: Omit<SchoolRegistration, "id" | "status" | "submittedAt">) => void;
  savePlan: (plan: PlatformPlan) => void;
  togglePlanPublished: (id: string) => void;
  savePlatformUser: (user: PlatformUser) => void;
  togglePlatformUser: (id: string) => void;
  markInvoicePaid: (id: string) => void;
  issueInvoice: (schoolId: string) => PlatformInvoice | null;
  runBillingSweep: () => BillingSweepResult;
  provisionSchoolAdmin: (schoolId: string) => Promise<ProvisionedCredentials | null>;
  effectiveModules: (school: SchoolTenant) => PlatformModuleId[];
  getPlan: (planId: string) => PlatformPlan | undefined;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const actorEmail = session?.user.email ?? "super@ims.cloud";
  const [data, setData] = useState<PlatformData>(seedPlatform);
  const [ready, setReady] = useState(false);
  const skipPersist = useRef(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromDb = await fetchPlatform();
      if (cancelled) return;
      if (fromDb) {
        setData(fromDb);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fromDb));
        } catch {
          // ignore cache write
        }
      } else {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) setData(JSON.parse(raw) as PlatformData);
        } catch {
          // ignore
        }
      }
      skipPersist.current = true;
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      void persistPlatform(data);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [data, ready]);

  const stats = useMemo(() => computeStats(data), [data]);

  const getPlan = useCallback(
    (planId: string) => data.plans.find((p) => p.id === planId),
    [data.plans],
  );

  const effectiveModules = useCallback(
    (school: SchoolTenant) => {
      if (school.modulesOverride?.length) return school.modulesOverride;
      return getPlan(school.planId)?.modules ?? [];
    },
    [getPlan],
  );

  const refreshPlatform = useCallback(async () => {
    const fromDb = await fetchPlatform();
    if (fromDb) {
      skipPersist.current = true;
      setData(fromDb);
    }
  }, []);

  const resetPlatform = useCallback(async () => {
    try {
      await fetch("/api/platform/reset", { ...FETCH_OPTS, method: "POST" });
      await refreshPlatform();
    } catch (error) {
      console.error("Platform reset failed", error);
      setData(seedPlatform);
    }
  }, [refreshPlatform]);

  const updateSettings = useCallback((patch: Partial<PlatformSettings>) => {
    setData((prev) =>
      pushAudit(
        { ...prev, settings: { ...prev.settings, ...patch } },
        {
          actor: actorEmail,
          action: "update_settings",
          target: "platform",
          detail: Object.keys(patch).join(", "),
        },
      ),
    );
  }, [actorEmail]);

  const createSchool = useCallback(
    async (input: {
      name: string;
      shortName: string;
      type: InstituteType;
      city: string;
      address: string;
      phone: string;
      email: string;
      adminName: string;
      adminEmail: string;
      planId: string;
      billingCycle: PlanBillingCycle;
      status?: SchoolTenantStatus;
    }) => {
      const plan = data.plans.find((p) => p.id === input.planId) ?? data.plans[0];
      const status = input.status ?? "trial";
      const monthly =
        input.billingCycle === "yearly"
          ? Math.round(plan.priceYearly / 12)
          : plan.priceMonthly;
      const school: SchoolTenant = {
        id: uid("sch"),
        code: input.shortName.toUpperCase().slice(0, 6),
        name: input.name,
        shortName: input.shortName,
        type: input.type,
        city: input.city,
        address: input.address,
        phone: input.phone,
        email: input.email,
        countryCode: "PK",
        status,
        planId: plan.id,
        billingCycle: input.billingCycle,
        studentsCount: 0,
        staffCount: 1,
        campusesCount: 1,
        adminName: input.adminName,
        adminEmail: input.adminEmail,
        registeredAt: todayIso(),
        trialEndsAt: status === "trial" ? addDays(plan.trialDays) : undefined,
        subscriptionEndsAt:
          status === "active"
            ? addDays(input.billingCycle === "yearly" ? 365 : 30)
            : undefined,
        mrr: status === "active" ? monthly : 0,
        logoInitials: input.shortName.slice(0, 2).toUpperCase(),
      };

      setData((prev) => {
        let nextInvoices = prev.invoices;
        if (status === "active") {
          const inv: PlatformInvoice = {
            id: nextInvoiceId(prev.invoices.map((i) => i.id)),
            schoolId: school.id,
            schoolName: school.name,
            planName: `${plan.name} (${input.billingCycle})`,
            amount: invoiceAmount(plan.priceMonthly, plan.priceYearly, input.billingCycle),
            status: "due",
            period: periodLabel(input.billingCycle, todayIso()),
            issuedAt: todayIso(),
            dueAt: addDays(10),
          };
          nextInvoices = [inv, ...prev.invoices];
        }
        return pushAudit(
          { ...prev, schools: [school, ...prev.schools], invoices: nextInvoices },
          {
            actor: actorEmail,
            action: "create_school",
            target: school.name,
            detail: `${plan.name} · ${status}`,
          },
        );
      });
      void persistWorkspace(school.id, {
        name: school.name,
        shortName: school.shortName,
        type: school.type,
        city: school.city,
        address: school.address,
        phone: school.phone,
        email: school.email,
        countryCode: school.countryCode,
      });

      const credentials = await provisionAdminAccount({
        tenantId: school.id,
        email: school.adminEmail,
        name: school.adminName,
      });

      return { school, credentials };
    },
    [data.plans, actorEmail],
  );

  const updateSchool = useCallback((id: string, patch: Partial<SchoolTenant>) => {
    setData((prev) => {
      const schools = prev.schools.map((s) => (s.id === id ? { ...s, ...patch } : s));
      const target = schools.find((s) => s.id === id)?.name ?? id;
      return pushAudit(
        { ...prev, schools },
        {
          actor: actorEmail,
          action: "update_school",
          target,
          detail: Object.keys(patch).join(", "),
        },
      );
    });
  }, [actorEmail]);

  const setSchoolStatus = useCallback((id: string, status: SchoolTenantStatus, note?: string) => {
    setData((prev) => {
      const schools = prev.schools.map((s) => {
        if (s.id !== id) return s;
        const plan = prev.plans.find((p) => p.id === s.planId);
        const monthly = plan
          ? s.billingCycle === "yearly"
            ? Math.round(plan.priceYearly / 12)
            : plan.priceMonthly
          : 0;
        return {
          ...s,
          status,
          mrr: status === "active" ? monthly : 0,
          notes: note ?? s.notes,
        };
      });
      const target = schools.find((s) => s.id === id)?.name ?? id;
      return pushAudit(
        { ...prev, schools },
        {
          actor: actorEmail,
          action: `status_${status}`,
          target,
          detail: note,
        },
      );
    });
  }, [actorEmail]);

  const bulkSetSchoolStatus = useCallback(
    (ids: string[], status: SchoolTenantStatus, note?: string) => {
      if (!ids.length) return;
      setData((prev) => {
        const idSet = new Set(ids);
        const schools = prev.schools.map((s) => {
          if (!idSet.has(s.id)) return s;
          const plan = prev.plans.find((p) => p.id === s.planId);
          const monthly = plan
            ? s.billingCycle === "yearly"
              ? Math.round(plan.priceYearly / 12)
              : plan.priceMonthly
            : 0;
          return {
            ...s,
            status,
            mrr: status === "active" ? monthly : 0,
            notes: note ?? s.notes,
          };
        });
        return pushAudit(
          { ...prev, schools },
          {
            actor: actorEmail,
            action: `bulk_status_${status}`,
            target: `${ids.length} schools`,
            detail: note ?? ids.join(", "),
          },
        );
      });
    },
    [actorEmail],
  );

  const assignPlan = useCallback(
    (schoolId: string, planId: string, billingCycle: PlanBillingCycle) => {
      setData((prev) => {
        const plan = prev.plans.find((p) => p.id === planId);
        if (!plan) return prev;
        const monthly =
          billingCycle === "yearly" ? Math.round(plan.priceYearly / 12) : plan.priceMonthly;
        const schools = prev.schools.map((s) => {
          if (s.id !== schoolId) return s;
          return {
            ...s,
            planId,
            billingCycle,
            modulesOverride: undefined,
            mrr: s.status === "active" ? monthly : 0,
            subscriptionEndsAt: addDays(billingCycle === "yearly" ? 365 : 30),
          };
        });
        const target = schools.find((s) => s.id === schoolId)?.name ?? schoolId;
        return pushAudit(
          { ...prev, schools },
          {
            actor: actorEmail,
            action: "assign_plan",
            target,
            detail: `${plan.name} · ${billingCycle}`,
          },
        );
      });
    },
    [actorEmail],
  );

  const setSchoolModules = useCallback((schoolId: string, modules: PlatformModuleId[]) => {
    setData((prev) => {
      const schools = prev.schools.map((s) =>
        s.id === schoolId ? { ...s, modulesOverride: modules } : s,
      );
      const target = schools.find((s) => s.id === schoolId)?.name ?? schoolId;
      return pushAudit(
        { ...prev, schools },
        {
          actor: actorEmail,
          action: "set_modules",
          target,
          detail: `${modules.length} modules enabled`,
        },
      );
    });
  }, [actorEmail]);

  const setSchoolLimits = useCallback(
    (schoolId: string, limits: { maxStudents?: number; maxStaff?: number }) => {
      setData((prev) => {
        const schools = prev.schools.map((s) =>
          s.id === schoolId
            ? {
                ...s,
                maxStudentsOverride: limits.maxStudents ?? s.maxStudentsOverride,
                maxStaffOverride: limits.maxStaff ?? s.maxStaffOverride,
              }
            : s,
        );
        const target = schools.find((s) => s.id === schoolId)?.name ?? schoolId;
        return pushAudit(
          { ...prev, schools },
          {
            actor: actorEmail,
            action: "set_limits",
            target,
            detail: `students=${limits.maxStudents ?? "—"} staff=${limits.maxStaff ?? "—"}`,
          },
        );
      });
    },
    [actorEmail],
  );

  const approveRegistration = useCallback(
    async (
      id: string,
      note?: string,
    ): Promise<{ school: SchoolTenant; credentials: ProvisionedCredentials | null } | null> => {
      let created: SchoolTenant | null = null;

      setData((prev) => {
        const reg = prev.registrations.find((r) => r.id === id);
        if (!reg || reg.status !== "pending") return prev;
        const plan =
          prev.plans.find((p) => p.id === reg.requestedPlanId) ??
          prev.plans.find((p) => p.id === prev.settings.defaultPlanId) ??
          prev.plans[0];
        const shortName = reg.instituteName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 4)
          .toUpperCase();
        const school: SchoolTenant = {
          id: uid("sch"),
          code: shortName || "SCH",
          name: reg.instituteName,
          shortName: shortName || "SCH",
          type: reg.instituteType,
          city: reg.city,
          address: reg.address,
          phone: reg.phone,
          email: reg.email,
          countryCode: "PK",
          status: "trial",
          planId: plan.id,
          billingCycle: "monthly",
          studentsCount: 0,
          staffCount: 1,
          campusesCount: 1,
          adminName: reg.adminName,
          adminEmail: reg.adminEmail,
          registeredAt: todayIso(),
          trialEndsAt: addDays(plan.trialDays || prev.settings.defaultTrialDays),
          mrr: 0,
          logoInitials: (shortName || "SC").slice(0, 2),
          notes: note,
        };
        created = school;
        void persistWorkspace(school.id, {
          name: school.name,
          shortName: school.shortName,
          type: school.type,
          city: school.city,
          address: school.address,
          phone: school.phone,
          email: school.email,
          countryCode: school.countryCode,
        });
        const registrations = prev.registrations.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "approved" as const,
                reviewedAt: new Date().toISOString(),
                reviewNote: note,
              }
            : r,
        );
        return pushAudit(
          { ...prev, schools: [school, ...prev.schools], registrations },
          {
            actor: actorEmail,
            action: "approve_registration",
            target: school.name,
            detail: note || `Trial on ${plan.name}`,
          },
        );
      });

      if (!created) return null;

      const school = created as SchoolTenant;
      const credentials = await provisionAdminAccount({
        tenantId: school.id,
        email: school.adminEmail,
        name: school.adminName,
      });

      return { school, credentials };
    },
    [actorEmail],
  );

  const rejectRegistration = useCallback((id: string, note?: string) => {
    setData((prev) => {
      const reg = prev.registrations.find((r) => r.id === id);
      if (!reg) return prev;
      const registrations = prev.registrations.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "rejected" as const,
              reviewedAt: new Date().toISOString(),
              reviewNote: note,
            }
          : r,
      );
      return pushAudit(
        { ...prev, registrations },
        {
          actor: actorEmail,
          action: "reject_registration",
          target: reg.instituteName,
          detail: note,
        },
      );
    });
  }, [actorEmail]);

  const submitRegistration = useCallback(
    (input: Omit<SchoolRegistration, "id" | "status" | "submittedAt">) => {
      const row: SchoolRegistration = {
        ...input,
        id: uid("reg"),
        status: "pending",
        submittedAt: new Date().toISOString(),
      };
      setData((prev) =>
        pushAudit(
          { ...prev, registrations: [row, ...prev.registrations] },
          {
            actor: input.adminEmail,
            action: "submit_registration",
            target: input.instituteName,
            detail: `Requested ${input.requestedPlanId}`,
          },
        ),
      );
    },
    [],
  );

  const savePlan = useCallback((plan: PlatformPlan) => {
    setData((prev) => {
      const exists = prev.plans.some((p) => p.id === plan.id);
      const plans = exists
        ? prev.plans.map((p) => (p.id === plan.id ? plan : p))
        : [...prev.plans, plan];
      return pushAudit(
        { ...prev, plans },
        {
          actor: actorEmail,
          action: exists ? "update_plan" : "create_plan",
          target: plan.name,
          detail: `${plan.maxStudents} students · ${plan.modules.length} modules`,
        },
      );
    });
  }, [actorEmail]);

  const togglePlanPublished = useCallback((id: string) => {
    setData((prev) => {
      const plans = prev.plans.map((p) =>
        p.id === id ? { ...p, published: !p.published } : p,
      );
      const plan = plans.find((p) => p.id === id);
      return pushAudit(
        { ...prev, plans },
        {
          actor: actorEmail,
          action: plan?.published ? "publish_plan" : "unpublish_plan",
          target: plan?.name ?? id,
        },
      );
    });
  }, [actorEmail]);

  const savePlatformUser = useCallback((user: PlatformUser) => {
    setData((prev) => {
      const exists = prev.users.some((u) => u.id === user.id);
      const users = exists
        ? prev.users.map((u) => (u.id === user.id ? user : u))
        : [...prev.users, user];
      return pushAudit(
        { ...prev, users },
        {
          actor: actorEmail,
          action: exists ? "update_platform_user" : "create_platform_user",
          target: user.email,
          detail: user.role,
        },
      );
    });
  }, [actorEmail]);

  const togglePlatformUser = useCallback((id: string) => {
    setData((prev) => {
      const users = prev.users.map((u) =>
        u.id === id ? { ...u, active: !u.active } : u,
      );
      const user = users.find((u) => u.id === id);
      return pushAudit(
        { ...prev, users },
        {
          actor: actorEmail,
          action: user?.active ? "activate_user" : "deactivate_user",
          target: user?.email ?? id,
        },
      );
    });
  }, []);

  const markInvoicePaid = useCallback((id: string) => {
    setData((prev) => {
      let schoolId = "";
      const invoices = prev.invoices.map((inv) => {
        if (inv.id !== id) return inv;
        schoolId = inv.schoolId;
        return {
          ...inv,
          status: "paid" as const,
          paidAt: todayIso(),
        };
      });
      const schools = prev.schools.map((s) => {
        if (s.id !== schoolId) return s;
        const plan = prev.plans.find((p) => p.id === s.planId);
        const monthly = plan
          ? s.billingCycle === "yearly"
            ? Math.round(plan.priceYearly / 12)
            : plan.priceMonthly
          : 0;
        return {
          ...s,
          status: s.status === "suspended" || s.status === "expired" ? "active" : s.status,
          mrr: monthly,
          subscriptionEndsAt: addDays(s.billingCycle === "yearly" ? 365 : 30),
        };
      });
      const inv = invoices.find((i) => i.id === id);
      return pushAudit(
        { ...prev, invoices, schools },
        {
          actor: actorEmail,
          action: "mark_invoice_paid",
          target: inv?.schoolName ?? id,
          detail: inv?.id,
        },
      );
    });
  }, [actorEmail]);

  const issueInvoice = useCallback(
    (schoolId: string): PlatformInvoice | null => {
      const school = data.schools.find((s) => s.id === schoolId);
      const plan = school ? data.plans.find((p) => p.id === school.planId) : undefined;
      if (!school || !plan) return null;

      const inv: PlatformInvoice = {
        id: nextInvoiceId(data.invoices.map((i) => i.id)),
        schoolId: school.id,
        schoolName: school.name,
        planName: `${plan.name} (${school.billingCycle})`,
        amount: invoiceAmount(plan.priceMonthly, plan.priceYearly, school.billingCycle),
        status: "due",
        period: periodLabel(school.billingCycle, todayIso()),
        issuedAt: todayIso(),
        dueAt: addDays(10),
      };

      setData((prev) =>
        pushAudit(
          { ...prev, invoices: [inv, ...prev.invoices] },
          {
            actor: actorEmail,
            action: "issue_invoice",
            target: school.name,
            detail: inv.id,
          },
        ),
      );
      return inv;
    },
    [data.schools, data.plans, data.invoices, actorEmail],
  );

  const runBillingSweep = useCallback((): BillingSweepResult => {
    const today = todayIso();
    const result: BillingSweepResult = {
      overdueMarked: 0,
      suspended: 0,
      trialsExpired: 0,
      renewalsIssued: 0,
    };

    setData((prev) => {
      let invoices = [...prev.invoices];
      let schools = [...prev.schools];
      const auditEntries: Omit<PlatformAuditEntry, "id" | "at">[] = [];

      invoices = invoices.map((inv) => {
        if (inv.status !== "due" || inv.dueAt >= today) return inv;
        result.overdueMarked += 1;
        return { ...inv, status: "overdue" as const };
      });

      for (const inv of invoices) {
        if (inv.status !== "overdue") continue;
        const overdueDays = Math.floor(
          (new Date(`${today}T00:00:00.000Z`).getTime() -
            new Date(`${inv.dueAt}T00:00:00.000Z`).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (overdueDays < 14) continue;
        const idx = schools.findIndex((s) => s.id === inv.schoolId);
        if (idx < 0) continue;
        const s = schools[idx]!;
        if (s.status === "suspended") continue;
        schools[idx] = {
          ...s,
          status: "suspended",
          mrr: 0,
          notes: `Auto-suspended — invoice ${inv.id} overdue ${overdueDays} days`,
        };
        result.suspended += 1;
        auditEntries.push({
          actor: actorEmail,
          action: "auto_suspend_overdue",
          target: s.name,
          detail: inv.id,
        });
      }

      schools = schools.map((s) => {
        if (s.status !== "trial" || !s.trialEndsAt || s.trialEndsAt >= today) return s;
        result.trialsExpired += 1;
        auditEntries.push({
          actor: actorEmail,
          action: "trial_expired",
          target: s.name,
          detail: `Trial ended ${s.trialEndsAt}`,
        });
        return {
          ...s,
          status: "expired" as const,
          mrr: 0,
          notes: "Trial expired — issue invoice or assign active plan",
        };
      });

      for (const s of schools) {
        if (s.status !== "active") continue;
        if (!s.subscriptionEndsAt || s.subscriptionEndsAt > today) continue;
        const plan = prev.plans.find((p) => p.id === s.planId);
        if (!plan) continue;
        const hasOpen = invoices.some(
          (i) =>
            i.schoolId === s.id &&
            (i.status === "due" || i.status === "overdue"),
        );
        if (hasOpen) continue;

        const inv: PlatformInvoice = {
          id: nextInvoiceId(invoices.map((i) => i.id)),
          schoolId: s.id,
          schoolName: s.name,
          planName: `${plan.name} (${s.billingCycle})`,
          amount: invoiceAmount(plan.priceMonthly, plan.priceYearly, s.billingCycle),
          status: "due",
          period: periodLabel(s.billingCycle, today),
          issuedAt: today,
          dueAt: addDaysIso(today, 10),
        };
        invoices = [inv, ...invoices];
        result.renewalsIssued += 1;
        auditEntries.push({
          actor: actorEmail,
          action: "auto_renewal_invoice",
          target: s.name,
          detail: inv.id,
        });
      }

      let next = { ...prev, invoices, schools };
      for (const entry of auditEntries) {
        next = pushAudit(next, entry);
      }
      if (
        result.overdueMarked ||
        result.suspended ||
        result.trialsExpired ||
        result.renewalsIssued
      ) {
        next = pushAudit(next, {
          actor: actorEmail,
          action: "billing_sweep",
          target: "platform",
          detail: `overdue=${result.overdueMarked} suspended=${result.suspended} trials=${result.trialsExpired} renewals=${result.renewalsIssued}`,
        });
      }
      return next;
    });

    return result;
  }, [actorEmail]);

  const provisionSchoolAdmin = useCallback(
    async (schoolId: string): Promise<ProvisionedCredentials | null> => {
      const school = data.schools.find((s) => s.id === schoolId);
      if (!school) return null;
      return provisionAdminAccount({
        tenantId: school.id,
        email: school.adminEmail,
        name: school.adminName,
      });
    },
    [data.schools],
  );

  const value = useMemo(
    () => ({
      ready,
      data,
      stats,
      resetPlatform,
      refreshPlatform,
      updateSettings,
      createSchool,
      updateSchool,
      setSchoolStatus,
      bulkSetSchoolStatus,
      assignPlan,
      setSchoolModules,
      setSchoolLimits,
      approveRegistration,
      rejectRegistration,
      submitRegistration,
      savePlan,
      togglePlanPublished,
      savePlatformUser,
      togglePlatformUser,
      markInvoicePaid,
      issueInvoice,
      runBillingSweep,
      provisionSchoolAdmin,
      effectiveModules,
      getPlan,
    }),
    [
      ready,
      data,
      stats,
      resetPlatform,
      refreshPlatform,
      updateSettings,
      createSchool,
      updateSchool,
      setSchoolStatus,
      bulkSetSchoolStatus,
      assignPlan,
      setSchoolModules,
      setSchoolLimits,
      approveRegistration,
      rejectRegistration,
      submitRegistration,
      savePlan,
      togglePlanPublished,
      savePlatformUser,
      togglePlatformUser,
      markInvoicePaid,
      issueInvoice,
      runBillingSweep,
      provisionSchoolAdmin,
      effectiveModules,
      getPlan,
    ],
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider");
  return ctx;
}
