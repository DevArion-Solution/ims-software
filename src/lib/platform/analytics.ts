import type { PlatformData } from "@/types/platform";

export interface PlanMixSlice {
  label: string;
  count: number;
  pct: number;
}

export interface StatusMixSlice {
  status: string;
  count: number;
  pct: number;
}

export interface MrrBar {
  label: string;
  mrr: number;
}

export function computePlanMix(data: PlatformData): PlanMixSlice[] {
  const total = data.schools.length || 1;
  const counts = new Map<string, number>();
  for (const s of data.schools) {
    const plan = data.plans.find((p) => p.id === s.planId);
    const label = plan?.name ?? "Unknown";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function computeStatusMix(data: PlatformData): StatusMixSlice[] {
  const total = data.schools.length || 1;
  const counts = new Map<string, number>();
  for (const s of data.schools) {
    counts.set(s.status, (counts.get(s.status) ?? 0) + 1);
  }
  const order = ["active", "trial", "suspended", "expired", "pending", "rejected"];
  return [...counts.entries()]
    .map(([status, count]) => ({
      status,
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
}

export function computeTopMrrSchools(data: PlatformData, limit = 5): MrrBar[] {
  return [...data.schools]
    .filter((s) => s.mrr > 0)
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, limit)
    .map((s) => ({ label: s.shortName, mrr: s.mrr }));
}

export function computeSeatUtilization(data: PlatformData): {
  studentsUsed: number;
  studentsCap: number;
  staffUsed: number;
  staffCap: number;
} {
  let studentsUsed = 0;
  let studentsCap = 0;
  let staffUsed = 0;
  let staffCap = 0;

  for (const s of data.schools) {
    const plan = data.plans.find((p) => p.id === s.planId);
    studentsUsed += s.studentsCount;
    staffUsed += s.staffCount;
    studentsCap += s.maxStudentsOverride ?? plan?.maxStudents ?? 0;
    staffCap += s.maxStaffOverride ?? plan?.maxStaff ?? 0;
  }

  return { studentsUsed, studentsCap, staffUsed, staffCap };
}

export function exportSchoolsCsv(data: PlatformData): string {
  const headers = [
    "id",
    "name",
    "city",
    "type",
    "status",
    "plan",
    "billing",
    "students",
    "staff",
    "mrr",
    "admin_email",
    "registered",
  ];
  const rows = data.schools.map((s) => {
    const plan = data.plans.find((p) => p.id === s.planId);
    return [
      s.id,
      s.name,
      s.city,
      s.type,
      s.status,
      plan?.name ?? "",
      s.billingCycle,
      String(s.studentsCount),
      String(s.staffCount),
      String(s.mrr),
      s.adminEmail,
      s.registeredAt,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
