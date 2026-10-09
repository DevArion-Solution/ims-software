"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { PortalShell, ACCOUNTANT_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import { feeLedgerReconcile } from "@/lib/calc";

export default function AccountantHomePage() {
  const { data, stats, collectFee } = useData();
  const overdue = data.fees.filter(
    (f) => f.status === "overdue" || f.status === "pending" || f.status === "partial",
  );
  const [collectId, setCollectId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const reconcile = feeLedgerReconcile(data.fees, data.vouchers);

  return (
    <PortalShell title="Accounts Portal" subtitle="Fee & finance desk" nav={ACCOUNTANT_NAV}>
      <PageHeader
        title="Finance desk"
        subtitle="Fees, payroll, expenses, trips and vouchers"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={stats.revenueLabel} tone="success" />
        <StatCard label="Expenses" value={stats.expenseLabel} tone="warning" />
        <StatCard label="Payroll pending" value={stats.payrollPendingLabel} tone="accent" />
        <StatCard label="Net position" value={stats.netPositionLabel} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Fee collected" value={stats.feeCollectedLabel} tone="success" />
        <StatCard label="Fee pending" value={stats.feePendingLabel} tone="warning" />
        <StatCard label="Salary lines unpaid" value={String(pendingPayroll)} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/accountant/payroll">
          <Button size="sm" variant="secondary">Payroll / Salaries</Button>
        </Link>
        <Link href="/accountant/expenses">
          <Button size="sm" variant="secondary">Expenses & Trips</Button>
        </Link>
        <Link href="/accountant/vouchers">
          <Button size="sm" variant="secondary">Ledger vouchers</Button>
        </Link>
        <Link href="/accountant/fees">
          <Button size="sm">Fee collection</Button>
        </Link>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Priority collections"
          action={
            <Link href="/accountant/fees">
              <Button size="sm">Open collection desk</Button>
            </Link>
          }
        />
        <Table headers={["Student", "Month", "Balance", "Due", "Status", "Action"]}>
          {overdue.slice(0, 8).map((f) => (
            <tr key={f.id}>
              <Td className="font-medium">{f.studentName}</Td>
              <Td>{f.month}</Td>
              <Td>{formatCurrency(f.amount - f.paid)}</Td>
              <Td>{formatDate(f.dueDate)}</Td>
              <Td>
                <Badge status={f.status}>{labelize(f.status)}</Badge>
              </Td>
              <Td>
                <Button
                  size="sm"
                  onClick={() => {
                    setCollectId(f.id);
                    setAmount(String(f.amount - f.paid));
                  }}
                >
                  Collect
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal open={!!collectId} onClose={() => setCollectId(null)} title="Collect payment">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!collectId) return;
            collectFee(collectId, Number(amount));
            setCollectId(null);
          }}
        >
          <Input
            label="Amount (PKR)"
            type="number"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCollectId(null)}>
              Cancel
            </Button>
            <Button type="submit">Record</Button>
          </div>
        </form>
      </Modal>
    </PortalShell>
  );
}
