"use client";

import Link from "next/link";
import {
  ClipboardCheck,
  GraduationCap,
  UserPlus,
  Users,
  Wallet,
  Building2,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Td } from "@/components/ui/Table";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useData } from "@/components/providers/DataProvider";
import { formatCurrency, formatDate, formatPercent, labelize } from "@/lib/utils";
import { averageOf } from "@/lib/calc";

export default function DashboardPage() {
  const { dict } = useLocale();
  const { data, stats } = useData();

  const resultAvg = averageOf(data.results.map((r) => r.percentage ?? 0), 1);

  return (
    <div>
      <PageHeader
        title={dict.dashboard.title}
        subtitle={`${data.institute.name} · figures recalculated from live ledger`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active students"
          value={stats.totalStudents}
          hint={`${stats.activeClasses} classes (strength synced)`}
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          label={dict.dashboard.staff}
          value={stats.totalStaff}
          hint={`${stats.campuses} campuses`}
          icon={<Users className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label={dict.dashboard.admissions}
          value={stats.pendingAdmissions}
          icon={<UserPlus className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Attendance today"
          value={formatPercent(stats.attendanceToday)}
          hint={
            stats.attendanceCountedToday
              ? `${stats.attendanceCountedToday} counted (leave/holiday excluded)`
              : "No attendance marked today"
          }
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <StatCard
          label="Fee collected (this month)"
          value={stats.feeCollectedLabel}
          icon={<Wallet className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label="Fee pending (this month)"
          value={stats.feePendingLabel}
          icon={<Wallet className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label="Overdue outstanding"
          value={stats.feeOverdueLabel}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label="Exam average %"
          value={data.results.length ? formatPercent(resultAvg) : "—"}
          hint={`${data.results.length} result rows`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <StatCard label="Revenue (ledger)" value={stats.revenueLabel} tone="success" />
        <StatCard label="Expenses booked" value={stats.expenseLabel} tone="warning" />
        <StatCard label="Payroll pending" value={stats.payrollPendingLabel} tone="accent" />
        <StatCard label="Net position" value={stats.netPositionLabel} hint="Receipts − payments" />
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader title={dict.dashboard.quickActions} />
          <CardBody className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <Link href="/students"><Button variant="secondary" className="w-full" size="sm">{dict.dashboard.addStudent}</Button></Link>
            <Link href="/admissions"><Button variant="secondary" className="w-full" size="sm">{dict.dashboard.newAdmission}</Button></Link>
            <Link href="/fees"><Button variant="secondary" className="w-full" size="sm">{dict.dashboard.collectFee}</Button></Link>
            <Link href="/accounts"><Button variant="secondary" className="w-full" size="sm">Accounts / Payroll</Button></Link>
            <Link href="/attendance"><Button variant="secondary" className="w-full" size="sm">{dict.dashboard.markAttendance}</Button></Link>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={dict.dashboard.recentAdmissions}
            action={<Link href="/admissions" className="text-xs font-medium text-[var(--ims-primary)]">{dict.common.viewAll}</Link>}
          />
          <Table headers={[dict.admissions.applicant, dict.admissions.applyingFor, dict.admissions.appliedOn, dict.common.status]}>
            {data.admissions.slice(0, 5).map((row) => (
              <tr key={row.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td>
                  <div>
                    <p className="font-medium">{row.applicantName}</p>
                    <p className="text-xs text-[var(--ims-text-muted)]">{row.fatherName}</p>
                  </div>
                </Td>
                <Td>{row.applyingFor}</Td>
                <Td>{formatDate(row.appliedOn)}</Td>
                <Td><Badge status={row.status}>{labelize(row.status)}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Fee ledger snapshot"
            action={<Link href="/fees" className="text-xs font-medium text-[var(--ims-primary)]">{dict.common.viewAll}</Link>}
          />
          <Table headers={["Student", "Net", "Paid", "Balance", "Status"]}>
            {data.fees.slice(0, 5).map((row) => (
              <tr key={row.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td>
                  <div>
                    <p className="font-medium">{row.studentName}</p>
                    <p className="text-xs text-[var(--ims-text-muted)]">{row.month}</p>
                  </div>
                </Td>
                <Td>{formatCurrency(row.amount)}</Td>
                <Td>{formatCurrency(row.paid)}</Td>
                <Td>{formatCurrency(Math.max(0, row.amount - row.paid))}</Td>
                <Td><Badge status={row.status}>{labelize(row.status)}</Badge></Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { title: "Academics", desc: `${data.classes.length} classes · enrolled counts live`, icon: BookOpen, href: "/academics" },
          { title: "Campuses", desc: data.institute.campuses.map((c) => c.name).join(" · "), icon: Building2, href: "/settings" },
          { title: "All-time fee pending", desc: stats.feePendingAllLabel, icon: Wallet, href: "/fees" },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition hover:border-[var(--ims-primary)]/40">
              <CardBody className="flex gap-3">
                <div className="rounded-md bg-[var(--ims-primary-soft)] p-2 text-[var(--ims-primary)]">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-[var(--ims-text-muted)]">{item.desc}</p>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
