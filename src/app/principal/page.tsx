"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PortalShell, PRINCIPAL_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";

export default function PrincipalHomePage() {
  const { session } = useAuth();
  const { data } = useData();

  const pulse = useMemo(() => {
    const students = data.students.filter((s) => s.status === "active").length;
    const staff = data.staff.filter((s) => s.status === "active").length;
    const pendingLeave = data.leaves.filter((l) => l.status === "pending").length;
    const pendingAdmissions = data.admissions.filter(
      (a) => a.status === "inquiry" || a.status === "applied" || a.status === "under_review",
    ).length;
    const feeDue = data.fees.reduce((s, f) => s + Math.max(0, f.amount - f.paid), 0);
    const today = new Date().toISOString().slice(0, 10);
    const attToday = data.attendance.filter((a) => a.date === today);
    const present = attToday.filter((a) => a.status === "present" || a.status === "late").length;
    const attPct = attToday.length ? Math.round((present / attToday.length) * 100) : null;
    return { students, staff, pendingLeave, pendingAdmissions, feeDue, attPct };
  }, [data]);

  return (
    <PortalShell title="Principal Portal" subtitle="School leadership" nav={PRINCIPAL_NAV}>
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Welcome, {session?.user.name}
        </h1>
        <p className="mt-1 text-sm text-[var(--ims-text-muted)]">
          {data.institute.name} · operational pulse
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Active students" value={pulse.students} tone="accent" />
        <StatCard label="Active staff" value={pulse.staff} />
        <StatCard label="Leave pending" value={pulse.pendingLeave} tone="warning" />
        <StatCard label="Admissions queue" value={pulse.pendingAdmissions} tone="warning" />
        <StatCard label="Fee outstanding" value={formatCurrency(pulse.feeDue)} tone="warning" />
        <StatCard
          label="Today attendance"
          value={pulse.attPct != null ? `${pulse.attPct}%` : "—"}
          tone="success"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Pending leave"
            action={
              <Link href="/principal/approvals">
                <Button size="sm" variant="secondary">
                  Approvals
                </Button>
              </Link>
            }
          />
          <Table headers={["Staff", "From", "Days", "Type", "Status"]}>
            {data.leaves
              .filter((l) => l.status === "pending")
              .slice(0, 6)
              .map((l) => (
                <tr key={l.id}>
                  <Td className="font-medium">{l.staffName}</Td>
                  <Td>{formatDate(l.from)}</Td>
                  <Td>{l.days}</Td>
                  <Td>{labelize(l.type)}</Td>
                  <Td>
                    <Badge status="pending">{l.status}</Badge>
                  </Td>
                </tr>
              ))}
          </Table>
          {!data.leaves.some((l) => l.status === "pending") ? (
            <p className="p-6 text-center text-sm text-[var(--ims-text-muted)]">No pending leave</p>
          ) : null}
        </Card>
        <Card>
          <CardHeader title="Recent notices" />
          <CardBody className="space-y-3">
            {data.notices
              .filter((n) => n.status === "sent")
              .slice(0, 5)
              .map((n) => (
                <div key={n.id} className="rounded-md border border-[var(--ims-border)] p-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-1 text-xs text-[var(--ims-text-muted)] line-clamp-2">{n.body}</p>
                  <p className="mt-2 text-[10px] text-[var(--ims-text-subtle)]">
                    {formatDate(n.sentOn ?? n.createdOn)} · {labelize(n.audience)}
                  </p>
                </div>
              ))}
          </CardBody>
        </Card>
      </div>
    </PortalShell>
  );
}
