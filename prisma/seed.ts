import { PrismaClient, Prisma } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { seedPlatform } from "../src/lib/platform/seed";
import { FEE_POLICY } from "../src/lib/calc/fees";
import {
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
  seedHomework,
} from "../src/lib/mock/data";

const prisma = new PrismaClient();

function parseDate(value?: string | null) {
  if (!value) return null;
  // Accept YYYY-MM-DD or ISO datetime
  return new Date(value.includes("T") ? value : `${value}T00:00:00.000Z`);
}

function buildHorizonWorkspace() {
  const routeAssignments = structuredClone(seedRouteAssignments);
  const routes = structuredClone(seedRoutes).map((r) => ({
    ...r,
    studentsCount: routeAssignments.filter((a) => a.routeId === r.id).length,
  }));

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
    purchaseOrders: structuredClone(seedPurchaseOrders),
    hostelVisitors: structuredClone(seedHostelVisitors),
    timetable: structuredClone(seedTimetable),
    homework: structuredClone(seedHomework),
    feePolicy: { ...FEE_POLICY },
  };
}

function emptyWorkspaceFor(school: (typeof seedPlatform.schools)[number]) {
  return {
    institute: {
      id: school.id,
      name: school.name,
      shortName: school.shortName,
      type: school.type,
      countryCode: school.countryCode,
      city: school.city,
      address: school.address,
      phone: school.phone,
      email: school.email,
      academicYear: "2025-26",
      campuses: [
        {
          id: `${school.id}_camp1`,
          name: `${school.shortName} Main Campus`,
          city: school.city,
          address: school.address,
          isMain: true,
        },
      ],
    },
    students: [],
    admissions: [],
    fees: [],
    feeStructures: [],
    staff: [],
    leaves: [],
    payroll: [],
    classes: [],
    subjects: [],
    attendance: [],
    exams: [],
    results: [],
    papers: [],
    books: [],
    bookIssues: [],
    routes: [],
    routeAssignments: [],
    hostelRooms: [],
    hostelAllotments: [],
    inventory: [],
    inventoryTxns: [],
    vouchers: [],
    expenses: [],
    trips: [],
    notices: [],
    deliveries: [],
    systemUsers: [],
    auditLogs: [],
    purchaseOrders: [],
    hostelVisitors: [],
    timetable: [],
    homework: [],
    feePolicy: { ...FEE_POLICY },
  };
}

const HORIZON_TENANT = "sch_horizon";

const DEMO_ACCOUNTS = [
  {
    id: "auth_super",
    email: "super@ims.cloud",
    password: "super123",
    name: "Platform Owner",
    role: "super_admin",
    portal: "super",
    tenantId: null as string | null,
    description: "Super Admin — all schools, plans, access & billing",
  },
  {
    id: "auth_admin",
    email: "admin@ims.edu.pk",
    password: "admin123",
    name: "Ayesha Khan",
    role: "institute_admin",
    portal: "admin",
    tenantId: HORIZON_TENANT,
    description: "Full institute control — all modules",
  },
  {
    id: "auth_teacher",
    email: "teacher@ims.edu.pk",
    password: "teach123",
    name: "Ms. Rabia Anwar",
    role: "teacher",
    portal: "teacher",
    tenantId: HORIZON_TENANT,
    linkedStaffId: "st2",
    description: "Classes, attendance, marks entry",
  },
  {
    id: "auth_accountant",
    email: "accounts@ims.edu.pk",
    password: "fees123",
    name: "Mr. Shahid Mehmood",
    role: "accountant",
    portal: "accountant",
    tenantId: HORIZON_TENANT,
    linkedStaffId: "st3",
    description: "Fee collection, challans, vouchers",
  },
  {
    id: "auth_parent",
    email: "parent@ims.edu.pk",
    password: "parent123",
    name: "Muhammad Raza",
    role: "parent",
    portal: "parent",
    tenantId: HORIZON_TENANT,
    linkedStudentId: "s1",
    linkedStudentIds: ["s1", "s2"],
    description: "Child fees, attendance, results, notices, pay online",
  },
  {
    id: "auth_student",
    email: "student@ims.edu.pk",
    password: "stu123",
    name: "Ahmed Raza",
    role: "student",
    portal: "student",
    tenantId: HORIZON_TENANT,
    linkedStudentId: "s1",
    description: "Timetable, results, fee status, notices",
  },
  {
    id: "auth_principal",
    email: "principal@ims.edu.pk",
    password: "prin123",
    name: "Dr. Imran Malik",
    role: "principal",
    portal: "principal",
    tenantId: HORIZON_TENANT,
    linkedStaffId: "st1",
    description: "Approvals, staff overview, school pulse",
  },
  {
    id: "auth_librarian",
    email: "library@ims.edu.pk",
    password: "lib123",
    name: "Ms. Nadia Library",
    role: "librarian",
    portal: "librarian",
    tenantId: HORIZON_TENANT,
    linkedStaffId: "st4",
    description: "Catalog, issue/return, fines",
  },
  {
    id: "auth_reception",
    email: "reception@ims.edu.pk",
    password: "recv123",
    name: "Sana Reception",
    role: "receptionist",
    portal: "receptionist",
    tenantId: HORIZON_TENANT,
    description: "Inquiries, visitors, student lookup",
  },
];

async function main() {
  console.log("Seeding IMS PostgreSQL database…");

  // Wipe in FK-safe order
  await prisma.platformAuditLog.deleteMany();
  await prisma.platformInvoice.deleteMany();
  await prisma.schoolRegistration.deleteMany();
  await prisma.schoolWorkspace.deleteMany();
  await prisma.schoolTenant.deleteMany();
  await prisma.platformUser.deleteMany();
  await prisma.platformPlan.deleteMany();
  await prisma.platformSettings.deleteMany();
  await prisma.authAccount.deleteMany();

  const { settings, plans, schools, registrations, users, invoices, audit } = seedPlatform;

  await prisma.platformSettings.create({
    data: {
      id: "default",
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
  });

  for (const plan of plans) {
    await prisma.platformPlan.create({
      data: {
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
    });
  }

  for (const school of schools) {
    await prisma.schoolTenant.create({
      data: {
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
        registeredAt: parseDate(school.registeredAt)!,
        trialEndsAt: parseDate(school.trialEndsAt ?? null),
        subscriptionEndsAt: parseDate(school.subscriptionEndsAt ?? null),
        mrr: school.mrr,
        notes: school.notes ?? null,
        logoInitials: school.logoInitials ?? null,
      },
    });

    const payload =
      school.id === "sch_horizon" ? buildHorizonWorkspace() : emptyWorkspaceFor(school);

    await prisma.schoolWorkspace.create({
      data: {
        tenantId: school.id,
        data: payload as Prisma.InputJsonValue,
      },
    });
  }

  for (const reg of registrations) {
    await prisma.schoolRegistration.create({
      data: {
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
    });
  }

  for (const user of users) {
    await prisma.platformUser.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        lastActiveAt: new Date(user.lastActiveAt),
        permissions: user.permissions,
      },
    });
  }

  for (const inv of invoices) {
    await prisma.platformInvoice.create({
      data: {
        id: inv.id,
        schoolId: inv.schoolId,
        schoolName: inv.schoolName,
        planName: inv.planName,
        amount: inv.amount,
        status: inv.status,
        period: inv.period,
        issuedAt: parseDate(inv.issuedAt)!,
        dueAt: parseDate(inv.dueAt)!,
        paidAt: parseDate(inv.paidAt ?? null),
      },
    });
  }

  for (const row of audit) {
    await prisma.platformAuditLog.create({
      data: {
        id: row.id,
        at: new Date(row.at),
        actor: row.actor,
        action: row.action,
        target: row.target,
        detail: row.detail ?? null,
      },
    });
  }

  for (const account of DEMO_ACCOUNTS) {
    const hashed = await hashPassword(account.password);
    await prisma.authAccount.create({
      data: {
        id: account.id,
        email: account.email,
        password: hashed,
        name: account.name,
        role: account.role,
        portal: account.portal,
        tenantId: account.tenantId,
        linkedStudentId: account.linkedStudentId ?? null,
        linkedStudentIds: account.linkedStudentIds ?? [],
        linkedStaffId: account.linkedStaffId ?? null,
        description: account.description,
      },
    });
  }

  const counts = {
    plans: await prisma.platformPlan.count(),
    schools: await prisma.schoolTenant.count(),
    workspaces: await prisma.schoolWorkspace.count(),
    registrations: await prisma.schoolRegistration.count(),
    platformUsers: await prisma.platformUser.count(),
    invoices: await prisma.platformInvoice.count(),
    audit: await prisma.platformAuditLog.count(),
    accounts: await prisma.authAccount.count(),
  };

  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
