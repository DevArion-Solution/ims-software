import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  PlatformData,
  PlatformInvoice,
  PlatformPlan,
  PlatformSettings,
  PlatformAuditEntry,
  PlatformUser,
  SchoolRegistration,
  SchoolTenant,
} from "@/types/platform";
import type { PlatformModuleId, PlanBillingCycle, SchoolTenantStatus } from "@/types/platform";
import type { InstituteType } from "@/types";

function isoDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return d.toISOString().slice(0, 10);
}

function isoDateTime(d: Date): string {
  return d.toISOString();
}

function mapPlan(p: {
  id: string;
  name: string;
  code: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  maxStudents: number;
  maxStaff: number;
  maxCampuses: number;
  modules: string[];
  trialDays: number;
  published: boolean;
  description: string;
  highlight: boolean;
}): PlatformPlan {
  return {
    id: p.id,
    name: p.name,
    code: p.code as PlatformPlan["code"],
    priceMonthly: p.priceMonthly,
    priceYearly: p.priceYearly,
    currency: p.currency,
    maxStudents: p.maxStudents,
    maxStaff: p.maxStaff,
    maxCampuses: p.maxCampuses,
    modules: p.modules as PlatformModuleId[],
    trialDays: p.trialDays,
    published: p.published,
    description: p.description,
    highlight: p.highlight || undefined,
  };
}

function mapSchool(s: {
  id: string;
  code: string;
  name: string;
  shortName: string;
  type: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  countryCode: string;
  status: string;
  planId: string;
  billingCycle: string;
  modulesOverride: string[];
  maxStudentsOverride: number | null;
  maxStaffOverride: number | null;
  studentsCount: number;
  staffCount: number;
  campusesCount: number;
  adminName: string;
  adminEmail: string;
  registeredAt: Date;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  mrr: number;
  notes: string | null;
  logoInitials: string | null;
}): SchoolTenant {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    shortName: s.shortName,
    type: s.type as InstituteType,
    city: s.city,
    address: s.address,
    phone: s.phone,
    email: s.email,
    countryCode: s.countryCode,
    status: s.status as SchoolTenantStatus,
    planId: s.planId,
    billingCycle: s.billingCycle as PlanBillingCycle,
    modulesOverride: s.modulesOverride.length
      ? (s.modulesOverride as PlatformModuleId[])
      : undefined,
    maxStudentsOverride: s.maxStudentsOverride ?? undefined,
    maxStaffOverride: s.maxStaffOverride ?? undefined,
    studentsCount: s.studentsCount,
    staffCount: s.staffCount,
    campusesCount: s.campusesCount,
    adminName: s.adminName,
    adminEmail: s.adminEmail,
    registeredAt: isoDate(s.registeredAt)!,
    trialEndsAt: isoDate(s.trialEndsAt),
    subscriptionEndsAt: isoDate(s.subscriptionEndsAt),
    mrr: s.mrr,
    notes: s.notes ?? undefined,
    logoInitials: s.logoInitials ?? undefined,
  };
}

export async function getPlatformData(): Promise<PlatformData> {
  const [settings, plans, schools, registrations, users, invoices, audit] =
    await Promise.all([
      prisma.platformSettings.findUniqueOrThrow({ where: { id: "default" } }),
      prisma.platformPlan.findMany({ orderBy: { priceMonthly: "asc" } }),
      prisma.schoolTenant.findMany({ orderBy: { registeredAt: "desc" } }),
      prisma.schoolRegistration.findMany({ orderBy: { submittedAt: "desc" } }),
      prisma.platformUser.findMany({ orderBy: { name: "asc" } }),
      prisma.platformInvoice.findMany({ orderBy: { issuedAt: "desc" } }),
      prisma.platformAuditLog.findMany({ orderBy: { at: "desc" }, take: 200 }),
    ]);

  return {
    settings: {
      platformName: settings.platformName,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      allowSelfRegistration: settings.allowSelfRegistration,
      requireApproval: settings.requireApproval,
      defaultTrialDays: settings.defaultTrialDays,
      defaultPlanId: settings.defaultPlanId,
      currency: settings.currency,
      whatsappEnabled: settings.whatsappEnabled,
      smsEnabled: settings.smsEnabled,
      jazzcashEnabled: settings.jazzcashEnabled,
      easypaisaEnabled: settings.easypaisaEnabled,
      stripeEnabled: settings.stripeEnabled,
      maintenanceMode: settings.maintenanceMode,
    },
    plans: plans.map(mapPlan),
    schools: schools.map(mapSchool),
    registrations: registrations.map(
      (r): SchoolRegistration => ({
        id: r.id,
        instituteName: r.instituteName,
        instituteType: r.instituteType as InstituteType,
        city: r.city,
        address: r.address,
        phone: r.phone,
        email: r.email,
        adminName: r.adminName,
        adminEmail: r.adminEmail,
        adminPhone: r.adminPhone,
        requestedPlanId: r.requestedPlanId,
        expectedStudents: r.expectedStudents,
        message: r.message ?? undefined,
        status: r.status as SchoolRegistration["status"],
        submittedAt: isoDateTime(r.submittedAt),
        reviewedAt: r.reviewedAt ? isoDateTime(r.reviewedAt) : undefined,
        reviewNote: r.reviewNote ?? undefined,
      }),
    ),
    users: users.map(
      (u): PlatformUser => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as PlatformUser["role"],
        active: u.active,
        lastActiveAt: isoDateTime(u.lastActiveAt),
        permissions: u.permissions,
      }),
    ),
    invoices: invoices.map(
      (i): PlatformInvoice => ({
        id: i.id,
        schoolId: i.schoolId,
        schoolName: i.schoolName,
        planName: i.planName,
        amount: i.amount,
        status: i.status as PlatformInvoice["status"],
        period: i.period,
        issuedAt: isoDate(i.issuedAt)!,
        dueAt: isoDate(i.dueAt)!,
        paidAt: isoDate(i.paidAt),
      }),
    ),
    audit: audit.map(
      (a): PlatformAuditEntry => ({
        id: a.id,
        at: isoDateTime(a.at),
        actor: a.actor,
        action: a.action,
        target: a.target,
        detail: a.detail ?? undefined,
      }),
    ),
  };
}

export async function savePlatformData(data: PlatformData): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.platformSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...data.settings },
      update: { ...data.settings },
    });

    const planIds = data.plans.map((p) => p.id);
    await tx.platformPlan.deleteMany({ where: { id: { notIn: planIds } } });
    for (const plan of data.plans) {
      await tx.platformPlan.upsert({
        where: { id: plan.id },
        create: {
          id: plan.id,
          name: plan.name,
          code: plan.code,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          currency: plan.currency,
          maxStudents: plan.maxStudents,
          maxStaff: plan.maxStaff,
          maxCampuses: plan.maxCampuses,
          modules: plan.modules,
          trialDays: plan.trialDays,
          published: plan.published,
          description: plan.description,
          highlight: !!plan.highlight,
        },
        update: {
          name: plan.name,
          code: plan.code,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          currency: plan.currency,
          maxStudents: plan.maxStudents,
          maxStaff: plan.maxStaff,
          maxCampuses: plan.maxCampuses,
          modules: plan.modules,
          trialDays: plan.trialDays,
          published: plan.published,
          description: plan.description,
          highlight: !!plan.highlight,
        },
      });
    }

    const schoolIds = data.schools.map((s) => s.id);
    await tx.schoolTenant.deleteMany({ where: { id: { notIn: schoolIds } } });
    for (const school of data.schools) {
      await tx.schoolTenant.upsert({
        where: { id: school.id },
        create: {
          id: school.id,
          code: school.code,
          name: school.name,
          shortName: school.shortName,
          type: school.type,
          city: school.city,
          address: school.address,
          phone: school.phone,
          email: school.email,
          countryCode: school.countryCode,
          status: school.status,
          planId: school.planId,
          billingCycle: school.billingCycle,
          modulesOverride: school.modulesOverride ?? [],
          maxStudentsOverride: school.maxStudentsOverride ?? null,
          maxStaffOverride: school.maxStaffOverride ?? null,
          studentsCount: school.studentsCount,
          staffCount: school.staffCount,
          campusesCount: school.campusesCount,
          adminName: school.adminName,
          adminEmail: school.adminEmail,
          registeredAt: new Date(`${school.registeredAt}T00:00:00.000Z`),
          trialEndsAt: school.trialEndsAt
            ? new Date(`${school.trialEndsAt}T00:00:00.000Z`)
            : null,
          subscriptionEndsAt: school.subscriptionEndsAt
            ? new Date(`${school.subscriptionEndsAt}T00:00:00.000Z`)
            : null,
          mrr: school.mrr,
          notes: school.notes ?? null,
          logoInitials: school.logoInitials ?? null,
        },
        update: {
          code: school.code,
          name: school.name,
          shortName: school.shortName,
          type: school.type,
          city: school.city,
          address: school.address,
          phone: school.phone,
          email: school.email,
          countryCode: school.countryCode,
          status: school.status,
          planId: school.planId,
          billingCycle: school.billingCycle,
          modulesOverride: school.modulesOverride ?? [],
          maxStudentsOverride: school.maxStudentsOverride ?? null,
          maxStaffOverride: school.maxStaffOverride ?? null,
          studentsCount: school.studentsCount,
          staffCount: school.staffCount,
          campusesCount: school.campusesCount,
          adminName: school.adminName,
          adminEmail: school.adminEmail,
          registeredAt: new Date(`${school.registeredAt}T00:00:00.000Z`),
          trialEndsAt: school.trialEndsAt
            ? new Date(`${school.trialEndsAt}T00:00:00.000Z`)
            : null,
          subscriptionEndsAt: school.subscriptionEndsAt
            ? new Date(`${school.subscriptionEndsAt}T00:00:00.000Z`)
            : null,
          mrr: school.mrr,
          notes: school.notes ?? null,
          logoInitials: school.logoInitials ?? null,
        },
      });
    }

    const regIds = data.registrations.map((r) => r.id);
    await tx.schoolRegistration.deleteMany({ where: { id: { notIn: regIds } } });
    for (const reg of data.registrations) {
      await tx.schoolRegistration.upsert({
        where: { id: reg.id },
        create: {
          id: reg.id,
          instituteName: reg.instituteName,
          instituteType: reg.instituteType,
          city: reg.city,
          address: reg.address,
          phone: reg.phone,
          email: reg.email,
          adminName: reg.adminName,
          adminEmail: reg.adminEmail,
          adminPhone: reg.adminPhone,
          requestedPlanId: reg.requestedPlanId,
          expectedStudents: reg.expectedStudents,
          message: reg.message ?? null,
          status: reg.status,
          submittedAt: new Date(reg.submittedAt),
          reviewedAt: reg.reviewedAt ? new Date(reg.reviewedAt) : null,
          reviewNote: reg.reviewNote ?? null,
        },
        update: {
          instituteName: reg.instituteName,
          instituteType: reg.instituteType,
          city: reg.city,
          address: reg.address,
          phone: reg.phone,
          email: reg.email,
          adminName: reg.adminName,
          adminEmail: reg.adminEmail,
          adminPhone: reg.adminPhone,
          requestedPlanId: reg.requestedPlanId,
          expectedStudents: reg.expectedStudents,
          message: reg.message ?? null,
          status: reg.status,
          submittedAt: new Date(reg.submittedAt),
          reviewedAt: reg.reviewedAt ? new Date(reg.reviewedAt) : null,
          reviewNote: reg.reviewNote ?? null,
        },
      });
    }

    const userIds = data.users.map((u) => u.id);
    await tx.platformUser.deleteMany({ where: { id: { notIn: userIds } } });
    for (const user of data.users) {
      await tx.platformUser.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          lastActiveAt: new Date(user.lastActiveAt),
          permissions: user.permissions,
        },
        update: {
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          lastActiveAt: new Date(user.lastActiveAt),
          permissions: user.permissions,
        },
      });
    }

    const invIds = data.invoices.map((i) => i.id);
    await tx.platformInvoice.deleteMany({ where: { id: { notIn: invIds } } });
    for (const inv of data.invoices) {
      await tx.platformInvoice.upsert({
        where: { id: inv.id },
        create: {
          id: inv.id,
          schoolId: inv.schoolId,
          schoolName: inv.schoolName,
          planName: inv.planName,
          amount: inv.amount,
          status: inv.status,
          period: inv.period,
          issuedAt: new Date(`${inv.issuedAt}T00:00:00.000Z`),
          dueAt: new Date(`${inv.dueAt}T00:00:00.000Z`),
          paidAt: inv.paidAt ? new Date(`${inv.paidAt}T00:00:00.000Z`) : null,
        },
        update: {
          schoolId: inv.schoolId,
          schoolName: inv.schoolName,
          planName: inv.planName,
          amount: inv.amount,
          status: inv.status,
          period: inv.period,
          issuedAt: new Date(`${inv.issuedAt}T00:00:00.000Z`),
          dueAt: new Date(`${inv.dueAt}T00:00:00.000Z`),
          paidAt: inv.paidAt ? new Date(`${inv.paidAt}T00:00:00.000Z`) : null,
        },
      });
    }

    const auditIds = data.audit.map((a) => a.id);
    await tx.platformAuditLog.deleteMany({ where: { id: { notIn: auditIds } } });
    for (const row of data.audit) {
      await tx.platformAuditLog.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          at: new Date(row.at),
          actor: row.actor,
          action: row.action,
          target: row.target,
          detail: row.detail ?? null,
        },
        update: {
          at: new Date(row.at),
          actor: row.actor,
          action: row.action,
          target: row.target,
          detail: row.detail ?? null,
        },
      });
    }
  });
}

export async function getSchoolWorkspace(tenantId: string) {
  const row = await prisma.schoolWorkspace.findUnique({ where: { tenantId } });
  return row?.data ?? null;
}

export async function saveSchoolWorkspace(tenantId: string, data: unknown) {
  await prisma.schoolWorkspace.upsert({
    where: { tenantId },
    create: {
      tenantId,
      data: data as Prisma.InputJsonValue,
    },
    update: {
      data: data as Prisma.InputJsonValue,
    },
  });
}

export async function updateSchoolWorkspace(
  tenantId: string,
  update: (data: unknown) => unknown,
) {
  return prisma.$transaction(
    async (tx) => {
      const current = await tx.schoolWorkspace.findUnique({ where: { tenantId } });
      if (!current) throw new Error(`School workspace not found for tenant ${tenantId}`);
      const data = update(current.data);
      await tx.schoolWorkspace.update({
        where: { tenantId },
        data: { data: data as Prisma.InputJsonValue },
      });
      return data;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function findAuthAccountByEmail(email: string) {
  return prisma.authAccount.findFirst({
    where: {
      email: { equals: email.trim(), mode: "insensitive" },
      active: true,
    },
  });
}

export async function getPlatformUserPermissions(email: string): Promise<string[]> {
  const user = await prisma.platformUser.findFirst({
    where: {
      email: { equals: email.trim(), mode: "insensitive" },
      active: true,
    },
  });
  if (!user) return ["*"];
  return user.permissions;
}

/** Public account list for login page — no passwords */
export async function getAuthAccountPublicList() {
  const accounts = await prisma.authAccount.findMany({
    where: { active: true },
    orderBy: { email: "asc" },
    select: {
      email: true,
      name: true,
      role: true,
      portal: true,
      linkedStudentId: true,
      linkedStudentIds: true,
      linkedStaffId: true,
      description: true,
    },
  });
  return accounts;
}

export async function getTenantAccessById(tenantId: string) {
  const school = await prisma.schoolTenant.findUnique({ where: { id: tenantId } });
  if (!school) return null;
  const plan = await prisma.platformPlan.findUnique({ where: { id: school.planId } });
  const mapped = mapSchool(school);
  const { buildTenantAccess } = await import("@/lib/platform/tenant-access");
  return buildTenantAccess(
    mapped,
    plan
      ? {
          id: plan.id,
          name: plan.name,
          code: plan.code as PlatformPlan["code"],
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          currency: plan.currency,
          maxStudents: plan.maxStudents,
          maxStaff: plan.maxStaff,
          maxCampuses: plan.maxCampuses,
          modules: plan.modules as PlatformModuleId[],
          trialDays: plan.trialDays,
          published: plan.published,
          description: plan.description,
          highlight: plan.highlight,
        }
      : undefined,
  );
}

export async function ensureSchoolWorkspace(
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
  const existing = await prisma.schoolWorkspace.findUnique({ where: { tenantId } });
  if (existing) return;
  const { buildEmptyWorkspace } = await import("@/lib/platform/workspace-factory");
  await prisma.schoolWorkspace.create({
    data: {
      tenantId,
      data: buildEmptyWorkspace({ id: tenantId, countryCode: school.countryCode ?? "PK", ...school }) as Prisma.InputJsonValue,
    },
  });
}

export async function syncTenantCounts(tenantId: string) {
  const row = await prisma.schoolWorkspace.findUnique({ where: { tenantId } });
  if (!row?.data || typeof row.data !== "object") return;
  const data = row.data as { students?: unknown[]; staff?: unknown[] };
  await prisma.schoolTenant.update({
    where: { id: tenantId },
    data: {
      studentsCount: Array.isArray(data.students) ? data.students.length : 0,
      staffCount: Array.isArray(data.staff) ? data.staff.length : 0,
    },
  });
}

export async function getSchoolTenant(tenantId: string) {
  const school = await prisma.schoolTenant.findUnique({ where: { id: tenantId } });
  return school ? mapSchool(school) : null;
}

export async function createOrResetPortalAccount(input: {
  tenantId: string;
  email: string;
  name: string;
  passwordHash: string;
  role?: string;
  portal?: string;
  description?: string;
  linkedStaffId?: string | null;
}) {
  const role = input.role ?? "institute_admin";
  const portal = input.portal ?? "admin";
  const description =
    input.description ?? `${role} for ${input.tenantId}`;

  const existing = await prisma.authAccount.findFirst({
    where: { email: { equals: input.email, mode: "insensitive" } },
  });

  if (existing) {
    return prisma.authAccount.update({
      where: { id: existing.id },
      data: {
        password: input.passwordHash,
        name: input.name,
        role,
        portal,
        tenantId: input.tenantId,
        linkedStaffId: input.linkedStaffId ?? existing.linkedStaffId,
        active: true,
        description,
      },
    });
  }

  const id = `auth_${input.tenantId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}_${Date.now().toString(36)}`;
  return prisma.authAccount.create({
    data: {
      id,
      email: input.email,
      password: input.passwordHash,
      name: input.name,
      role,
      portal,
      tenantId: input.tenantId,
      linkedStaffId: input.linkedStaffId ?? null,
      description,
      active: true,
    },
  });
}

/** @deprecated use createOrResetPortalAccount */
export async function createOrResetSchoolAdminAccount(input: {
  tenantId: string;
  email: string;
  name: string;
  passwordHash: string;
}) {
  return createOrResetPortalAccount({
    ...input,
    role: "institute_admin",
    portal: "admin",
    description: `Institute admin for ${input.tenantId}`,
  });
}

export async function appendPlatformAudit(entry: {
  actor: string;
  action: string;
  target: string;
  detail?: string;
}) {
  const id = `aud_${Math.random().toString(36).slice(2, 10)}`;
  await prisma.platformAuditLog.create({
    data: {
      id,
      at: new Date(),
      actor: entry.actor,
      action: entry.action,
      target: entry.target,
      detail: entry.detail ?? null,
    },
  });
  return id;
}

/** Mark a platform SaaS invoice paid and extend school subscription (Stripe / manual). */
export async function markPlatformInvoicePaid(
  invoiceId: string,
  actor: string,
): Promise<{ ok: true; invoice: PlatformInvoice } | { ok: false; error: string }> {
  const inv = await prisma.platformInvoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return { ok: false, error: "Invoice not found" };
  if (inv.status === "paid") {
    return {
      ok: true,
      invoice: {
        id: inv.id,
        schoolId: inv.schoolId,
        schoolName: inv.schoolName,
        planName: inv.planName,
        amount: inv.amount,
        status: "paid",
        period: inv.period,
        issuedAt: isoDate(inv.issuedAt)!,
        dueAt: isoDate(inv.dueAt)!,
        paidAt: isoDate(inv.paidAt) ?? isoDate(new Date()),
      },
    };
  }
  if (inv.status === "void") return { ok: false, error: "Invoice is void" };

  const school = await prisma.schoolTenant.findUnique({ where: { id: inv.schoolId } });
  if (!school) return { ok: false, error: "School not found" };

  const plan = await prisma.platformPlan.findUnique({ where: { id: school.planId } });
  const billingCycle = school.billingCycle === "yearly" ? "yearly" : "monthly";
  const extendDays = billingCycle === "yearly" ? 365 : 30;
  const ends = new Date();
  ends.setUTCDate(ends.getUTCDate() + extendDays);
  const monthly = plan
    ? billingCycle === "yearly"
      ? Math.round(plan.priceYearly / 12)
      : plan.priceMonthly
    : school.mrr;

  const paidAt = new Date();
  const [updated] = await prisma.$transaction([
    prisma.platformInvoice.update({
      where: { id: invoiceId },
      data: { status: "paid", paidAt },
    }),
    prisma.schoolTenant.update({
      where: { id: school.id },
      data: {
        status:
          school.status === "suspended" || school.status === "expired" ? "active" : school.status,
        mrr: monthly,
        subscriptionEndsAt: ends,
      },
    }),
  ]);

  await appendPlatformAudit({
    actor,
    action: "mark_invoice_paid",
    target: inv.schoolName,
    detail: `${invoiceId} via school Stripe`,
  });

  return {
    ok: true,
    invoice: {
      id: updated.id,
      schoolId: updated.schoolId,
      schoolName: updated.schoolName,
      planName: updated.planName,
      amount: updated.amount,
      status: "paid",
      period: updated.period,
      issuedAt: isoDate(updated.issuedAt)!,
      dueAt: isoDate(updated.dueAt)!,
      paidAt: isoDate(paidAt),
    },
  };
}

export async function getSchoolBillingBundle(schoolId: string) {
  const school = await prisma.schoolTenant.findUnique({ where: { id: schoolId } });
  if (!school) return null;
  const plan = await prisma.platformPlan.findUnique({ where: { id: school.planId } });
  const invoices = await prisma.platformInvoice.findMany({
    where: { schoolId },
    orderBy: { issuedAt: "desc" },
  });
  return {
    school: mapSchool(school),
    plan: plan ? mapPlan(plan) : null,
    invoices: invoices.map(
      (i): PlatformInvoice => ({
        id: i.id,
        schoolId: i.schoolId,
        schoolName: i.schoolName,
        planName: i.planName,
        amount: i.amount,
        status: i.status as PlatformInvoice["status"],
        period: i.period,
        issuedAt: isoDate(i.issuedAt)!,
        dueAt: isoDate(i.dueAt)!,
        paidAt: isoDate(i.paidAt),
      }),
    ),
  };
}
