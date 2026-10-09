"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PortalShell, PARENT_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { useParentChild } from "@/components/providers/ParentChildProvider";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Td } from "@/components/ui/Table";
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";
import { buildStudentReport } from "@/lib/reports/person";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";

export default function ParentHomePage() {
  const { session } = useAuth();
  const { data } = useData();
  const { child } = useParentChild();
  const report = useMemo(
    () =>
      child
        ? buildStudentReport(
            {
              ...data,
              classes: data.classes,
              hostelAllotments: data.hostelAllotments,
              routes: data.routes,
              routeAssignments: data.routeAssignments,
            },
            child.id,
          )
        : null,
    [data, child],
  );

  return (
    <PortalShell title="Parent Portal" subtitle="Your child's progress" nav={PARENT_NAV} accent="accent">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Welcome, {session?.user.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--ims-text-muted)]">
            Linked:{" "}
            <strong>
              {child ? `${child.firstName} ${child.lastName}` : "—"}
            </strong>
            {child ? ` · ${child.className}-${child.section} · ${child.admissionNo}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ChildSwitcher />
            {child ? (
              <>
                <Link href="/parent/report">
                  <Button size="sm">A–Z report</Button>
                </Link>
                <Link href={`/report-card/${child.id}`}>
                  <Button size="sm" variant="secondary">
                    Report card
                  </Button>
                </Link>
                <Link href="/parent/fees">
                  <Button size="sm" variant="secondary">
                    Pay fees
                  </Button>
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Fee pending" value={report?.feeDueLabel ?? formatCurrency(0)} tone="warning" />
        <StatCard label="Attendance" value={report?.attLabel ?? "—"} tone="success" />
        <StatCard label="Progress avg" value={report?.avgLabel ?? "—"} />
        <StatCard label="Teachers" value={report?.teachers.length ?? 0} tone="accent" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent fees"
            action={
              <Link href="/parent/fees">
                <Button size="sm" variant="secondary">
                  View all
                </Button>
              </Link>
            }
          />
          <Table headers={["Month", "Amount", "Status"]}>
            {(report?.fees ?? []).map((f) => (
              <tr key={f.id}>
                <Td>{f.month}</Td>
                <Td>{formatCurrency(f.amount)}</Td>
                <Td>
                  <Badge status={f.status}>{labelize(f.status)}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card>
          <CardHeader title="Latest notices" />
          <CardBody className="space-y-3">
            {data.notices
              .filter((n) => n.status === "sent")
              .slice(0, 4)
              .map((n) => (
                <div key={n.id} className="rounded-md border border-[var(--ims-border)] p-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-1 text-xs text-[var(--ims-text-muted)]">{n.body}</p>
                  <p className="mt-2 text-[10px] text-[var(--ims-text-subtle)]">
                    {formatDate(n.createdOn)} · {labelize(n.channel)}
                    {n.deliveryCount != null ? ` · ${n.deliveryCount} delivered` : ""}
                  </p>
                </div>
              ))}
          </CardBody>
        </Card>
      </div>
    </PortalShell>
  );
}
