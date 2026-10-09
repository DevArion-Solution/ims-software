"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PortalShell, STUDENT_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { studentScope } from "@/lib/portal/scope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";

export default function StudentFeesPage() {
  const { session } = useAuth();
  const { data } = useData();
  const scope = studentScope(data, session?.linkedStudentId);
  const fees = scope.fees;

  const summary = useMemo(() => {
    const outstanding = fees.reduce((s, f) => s + Math.max(0, f.amount - f.paid), 0);
    const paid = fees.reduce((s, f) => s + f.paid, 0);
    return { outstanding, paid };
  }, [fees]);

  return (
    <PortalShell title="Student Portal" subtitle="My academics" nav={STUDENT_NAV} accent="accent">
      <PageHeader
        title="My Fees"
        subtitle="Challan status and balances — parents pay online from Parent Portal"
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <StatCard label="Outstanding" value={formatCurrency(summary.outstanding)} tone="warning" />
        <StatCard label="Paid to date" value={formatCurrency(summary.paid)} tone="success" />
      </div>
      <Card>
        <Table headers={["Month", "Amount", "Paid", "Balance", "Due", "Status", "Print"]}>
          {fees.map((f) => (
            <tr key={f.id}>
              <Td className="font-medium">{f.month}</Td>
              <Td>{formatCurrency(f.amount)}</Td>
              <Td>{formatCurrency(f.paid)}</Td>
              <Td>{formatCurrency(Math.max(0, f.amount - f.paid))}</Td>
              <Td>{formatDate(f.dueDate)}</Td>
              <Td>
                <Badge status={f.status}>{labelize(f.status)}</Badge>
              </Td>
              <Td>
                <Link href={`/challan/${f.id}`}>
                  <Button size="sm" variant="secondary">
                    Challan
                  </Button>
                </Link>
              </Td>
            </tr>
          ))}
        </Table>
        {!fees.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">No fee records</p>
        ) : null}
      </Card>
    </PortalShell>
  );
}
