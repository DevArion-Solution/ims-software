"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Building2,
  ClipboardList,
  CreditCard,
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Users,
} from "lucide-react";
import { usePlatform } from "@/components/providers/PlatformProvider";
import {
  computePlanMix,
  computeSeatUtilization,
  computeStatusMix,
  computeTopMrrSchools,
} from "@/lib/platform/analytics";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

function BarChart({
  items,
  valueKey,
  labelKey,
  formatValue,
}: {
  items: Record<string, string | number>[];
  valueKey: string;
  labelKey: string;
  formatValue?: (n: number) => string;
}) {
  const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const val = Number(item[valueKey]) || 0;
        const pct = Math.round((val / max) * 100);
        return (
          <div key={String(item[labelKey])}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--sa-text)]">{item[labelKey]}</span>
              <span className="text-[var(--sa-muted)]">
                {formatValue ? formatValue(val) : val}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--sa-bg)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--sa-cyan)] to-[var(--sa-gold)] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { data, stats } = usePlatform();

  const planMix = useMemo(() => computePlanMix(data), [data]);
  const statusMix = useMemo(() => computeStatusMix(data), [data]);
  const topMrr = useMemo(() => computeTopMrrSchools(data), [data]);
  const seats = useMemo(() => computeSeatUtilization(data), [data]);

  const recentSchools = [...data.schools]
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
    .slice(0, 5);
  const pending = data.registrations.filter((r) => r.status === "pending").slice(0, 4);
  const attention = data.schools.filter((s) =>
    ["suspended", "expired", "trial"].includes(s.status),
  );

  const studentPct = seats.studentsCap
    ? Math.min(100, Math.round((seats.studentsUsed / seats.studentsCap) * 100))
    : 0;
  const staffPct = seats.staffCap
    ? Math.min(100, Math.round((seats.staffUsed / seats.staffCap) * 100))
    : 0;

  const cards = [
    {
      label: "Registered schools",
      value: stats.totalSchools,
      hint: `${stats.activeSchools} active · ${stats.trialSchools} trial`,
      icon: Building2,
      tone: "from-[#0f172a] to-[#1e293b]",
    },
    {
      label: "Monthly revenue",
      value: formatCurrency(stats.mrr),
      hint: `ARR ${formatCurrency(stats.arr)}`,
      icon: TrendingUp,
      tone: "from-[#a88412] to-[#c9a227]",
    },
    {
      label: "Students on platform",
      value: stats.totalStudents.toLocaleString(),
      hint: `${stats.totalStaff} staff seats used`,
      icon: GraduationCap,
      tone: "from-[#0f766e] to-[#0ea5a4]",
    },
    {
      label: "Needs attention",
      value: stats.pendingRegistrations + stats.overdueInvoices + stats.suspendedSchools,
      hint: `${stats.pendingRegistrations} regs · ${stats.overdueInvoices} overdue`,
      icon: AlertTriangle,
      tone: "from-[#9f1239] to-[#e11d48]",
    },
  ];

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-3xl border border-[#0d8582] p-6 text-white shadow-[var(--sa-shadow)] sm:p-8"
        style={{ backgroundColor: "#0F9693" }}
      >
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-black/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
              Command every school from one desk
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80">
              Approve registrations, assign plans, limit seats, toggle modules, collect
              subscriptions, and open any school for support — without leaving the tower.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/super-admin/registrations"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0F9693]"
            >
              Review queue
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/super-admin/schools"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium text-white"
            >
              Manage schools
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="overflow-hidden rounded-2xl border border-[var(--sa-border)] bg-white shadow-[var(--sa-shadow)]"
            >
              <div className={`bg-gradient-to-br ${card.tone} px-4 py-3 text-white`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/75">
                    {card.label}
                  </p>
                  <Icon className="h-4 w-4 text-white/80" />
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{card.value}</p>
              </div>
              <div className="px-4 py-3 text-xs text-[var(--sa-muted)]">{card.hint}</div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--sa-text)]">Plan mix</h2>
          <p className="mb-4 text-xs text-[var(--sa-muted)]">Schools per subscription tier</p>
          <BarChart
            items={planMix.map((p) => ({ label: p.label, count: p.count }))}
            labelKey="label"
            valueKey="count"
          />
        </div>
        <div className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--sa-text)]">Tenant status</h2>
          <p className="mb-4 text-xs text-[var(--sa-muted)]">Active vs trial vs blocked</p>
          <BarChart
            items={statusMix.map((s) => ({ label: labelize(s.status), count: s.count }))}
            labelKey="label"
            valueKey="count"
          />
        </div>
        <div className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--sa-text)]">Top MRR schools</h2>
          <p className="mb-4 text-xs text-[var(--sa-muted)]">Highest monthly contributors</p>
          <BarChart
            items={topMrr.map((s) => ({ label: s.label, mrr: s.mrr }))}
            labelKey="label"
            valueKey="mrr"
            formatValue={(n) => formatCurrency(n)}
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--sa-text)]">Platform seat utilization</h2>
          <p className="mb-4 text-xs text-[var(--sa-muted)]">
            {seats.studentsUsed.toLocaleString()} students · {seats.staffUsed.toLocaleString()} staff
            in use
          </p>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span>Students</span>
                <span>
                  {seats.studentsUsed}/{seats.studentsCap || "∞"}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--sa-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--sa-cyan)]"
                  style={{ width: `${studentPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span>Staff</span>
                <span>
                  {seats.staffUsed}/{seats.staffCap || "∞"}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--sa-bg)]">
                <div
                  className="h-full rounded-full bg-[var(--sa-gold)]"
                  style={{ width: `${staffPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 text-black shadow-[var(--sa-shadow)]">
          <h2 className="text-sm font-semibold text-black">Billing health</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold text-black">{stats.overdueInvoices}</p>
              <p className="text-xs text-black/55">Overdue invoices</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-black">{stats.suspendedSchools}</p>
              <p className="text-xs text-black/55">Suspended schools</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-black">{stats.trialSchools}</p>
              <p className="text-xs text-black/55">On trial</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-black">{stats.pendingRegistrations}</p>
              <p className="text-xs text-black/55">Pending approvals</p>
            </div>
          </div>
          <Link
            href="/super-admin/billing"
            className="mt-4 inline-flex text-xs font-semibold text-[#0F9693]"
          >
            Run billing sweep →
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-[var(--sa-border)] bg-white shadow-[var(--sa-shadow)]">
          <div className="flex items-center justify-between border-b border-[var(--sa-border)] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--sa-text)]">Tenant directory</h2>
              <p className="text-xs text-[var(--sa-muted)]">Newest schools on the platform</p>
            </div>
            <Link href="/super-admin/schools" className="text-xs font-semibold text-[var(--sa-cyan)]">
              View all
            </Link>
          </div>
          <div className="divide-y divide-[var(--sa-border)]">
            {recentSchools.map((school) => (
              <div key={school.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex h-10 w-10 shrink-0 aspect-square items-center justify-center overflow-hidden rounded-full bg-[#4993a7] text-xs font-bold leading-none text-white">
                  {school.logoInitials ?? school.shortName.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--sa-text)]">{school.name}</p>
                  <p className="truncate text-xs text-[var(--sa-muted)]">
                    {school.city} · {labelize(school.type)} · {school.studentsCount} students
                  </p>
                </div>
                <Badge status={school.status}>{school.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--sa-border)] bg-white shadow-[var(--sa-shadow)]">
            <div className="flex items-center justify-between border-b border-[var(--sa-border)] px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--sa-text)]">Registration queue</h2>
                <p className="text-xs text-[var(--sa-muted)]">Approve to create a live tenant</p>
              </div>
              <ClipboardList className="h-4 w-4 text-[var(--sa-muted)]" />
            </div>
            <div className="divide-y divide-[var(--sa-border)]">
              {pending.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-[var(--sa-muted)]">Queue is clear</p>
              ) : (
                pending.map((reg) => (
                  <div key={reg.id} className="px-5 py-3.5">
                    <p className="text-sm font-medium text-[var(--sa-text)]">{reg.instituteName}</p>
                    <p className="mt-0.5 text-xs text-[var(--sa-muted)]">
                      {reg.city} · {reg.expectedStudents} students ·{" "}
                      {formatDate(reg.submittedAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-[var(--sa-border)] px-5 py-3">
              <Link
                href="/super-admin/registrations"
                className="text-xs font-semibold text-[var(--sa-cyan)]"
              >
                Open approvals →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--sa-gold)]" />
              <h2 className="text-sm font-semibold text-[var(--sa-text)]">Watch list</h2>
            </div>
            <div className="space-y-2">
              {attention.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl bg-[var(--sa-bg)] px-3 py-2"
                >
                  <span className="truncate text-xs font-medium text-[var(--sa-text)]">{s.name}</span>
                  <Badge status={s.status}>{s.status}</Badge>
                </div>
              ))}
            </div>
            <Link
              href="/super-admin/billing"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--sa-cyan)]"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Billing desk
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
