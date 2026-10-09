"use client";

import { useMemo } from "react";
import { PortalShell, ACCOUNTANT_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, labelize } from "@/lib/utils";
import { feeLedgerReconcile, sumMoney } from "@/lib/calc";
import { exportCsv } from "@/lib/school/export-csv";

export default function AccountantReportsPage() {
  const { data, stats } = useData();
  const byStatus = Object.entries(
    data.fees.reduce<Record<string, number>>((acc, f) => {
      acc[f.status] = (acc[f.status] ?? 0) + 1;
      return acc;
    }, {}),
  );

  const aging = useMemo(() => {
    const today = new Date();
    const buckets = { "0-7": 0, "8-30": 0, "31+": 0 };
    for (const f of data.fees) {
      if (f.status === "paid") continue;
      const due = new Date(`${f.dueDate}T00:00:00`);
      const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
      const bal = Math.max(0, f.amount - f.paid);
      if (days <= 7) buckets["0-7"] += bal;
      else if (days <= 30) buckets["8-30"] += bal;
      else buckets["31+"] += bal;
    }
    return buckets;
  }, [data.fees]);

  const expenseByCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of data.expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.expenses]);

  const reconcile = useMemo(
    () => feeLedgerReconcile(data.fees, data.vouchers),
    [data.fees, data.vouchers],
  );

  const paymentVouchers = useMemo(
    () => sumMoney(data.vouchers.filter((v) => v.type === "payment").map((v) => v.amount)),
    [data.vouchers],
  );
  const expenseBooked = useMemo(
    () => sumMoney(data.expenses.map((e) => e.amount)),
    [data.expenses],
  );

  function exportFees() {
    exportCsv("fee-report.csv", [
      ["Student", "Class", "Month", "Amount", "Paid", "Status", "Due", "Mode"],
      ...data.fees.map((f) => [
        f.studentName,
        f.className,
        f.month,
        String(f.amount),
        String(f.paid),
        f.status,
        f.dueDate,
        String(f.paymentMode ?? ""),
      ]),
    ]);
  }

  function exportExpenses() {
    exportCsv("expense-report.csv", [
      ["Date", "Category", "Title", "Vendor", "Mode", "Amount", "Campus", "Voucher"],
      ...data.expenses.map((e) => [
        e.date,
        e.category,
        e.title,
        e.paidTo,
        e.paymentMode,
        String(e.amount),
        e.campusId,
        e.voucherId ? "Yes" : "No",
      ]),
    ]);
  }

  function exportLedger() {
    let running = 0;
    const rows = [...data.vouchers]
      .sort((a, b) => a.date.localeCompare(b.date) || a.voucherNo.localeCompare(b.voucherNo))
      .map((v) => {
        if (v.type === "receipt") running += v.amount;
        else if (v.type === "payment") running -= v.amount;
        return [
          v.voucherNo,
          v.date,
          v.type,
          v.account,
          v.description,
          String(v.amount),
          v.campusId,
          String(running),
        ];
      });
    exportCsv("accounts-ledger.csv", [
      ["Voucher", "Date", "Type", "Account", "Description", "Amount", "Campus", "Running bal."],
      ...rows,
    ]);
  }

  function exportTrips() {
    exportCsv("accounts-trips.csv", [
      ["Title", "Purpose", "Destination", "From", "To", "Cost", "Status"],
      ...data.trips.map((t) => [
        t.title,
        t.purpose,
        t.destination,
        t.fromDate,
        t.toDate,
        String(t.lines.reduce((s, l) => s + l.amount, 0) || t.estimatedBudget),
        t.status,
      ]),
    ]);
  }

  function exportPayroll() {
    exportCsv("payroll-report.csv", [
      ["Staff", "Month", "Basic", "Allowances", "Deductions", "Net", "Status", "Paid on"],
      ...data.payroll.map((p) => [
        p.staffName,
        p.month,
        String(p.basic),
        String(p.allowances),
        String(p.deductions),
        String(p.net),
        p.status,
        p.paidOn ?? "",
      ]),
    ]);
  }

  function exportReconcile() {
    exportCsv("accounts-reconcile.csv", [
      ["Metric", "Amount"],
      ["Fee collected", String(reconcile.feeCollected)],
      ["Fee receipts posted", String(reconcile.feeReceipts)],
      ["Fee gap", String(reconcile.gap)],
      ["Matched", reconcile.matched ? "Yes" : "No"],
      ["Expenses booked", String(expenseBooked)],
      ["Payment vouchers", String(paymentVouchers)],
    ]);
  }

  return (
    <PortalShell title="Accounts Portal" subtitle="Fee & finance desk" nav={ACCOUNTANT_NAV}>
      <PageHeader
        title="Finance reports"
        subtitle="Aging, collection, ledger, reconcile, expenses, payroll"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={exportFees}>
              Fees
            </Button>
            <Button size="sm" variant="secondary" onClick={exportLedger}>
              Ledger
            </Button>
            <Button size="sm" variant="secondary" onClick={exportExpenses}>
              Expenses
            </Button>
            <Button size="sm" variant="secondary" onClick={exportTrips}>
              Trips
            </Button>
            <Button size="sm" variant="secondary" onClick={exportPayroll}>
              Payroll
            </Button>
            <Button size="sm" variant="secondary" onClick={exportReconcile}>
              Reconcile
            </Button>
          </div>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected" value={stats.feeCollectedLabel} tone="success" />
        <StatCard label="Outstanding" value={stats.feePendingLabel} tone="warning" />
        <StatCard label="Expenses" value={stats.expenseLabel} />
        <StatCard label="Payroll pending" value={stats.payrollPendingLabel} tone="accent" />
      </div>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Fee receipts posted" value={formatCurrency(reconcile.feeReceipts)} />
        <StatCard
          label="Fee ↔ ledger gap"
          value={formatCurrency(reconcile.gap)}
          tone={reconcile.matched ? "success" : "warning"}
        />
        <StatCard
          label="Reconcile"
          value={reconcile.matched ? "Matched" : "Review"}
          tone={reconcile.matched ? "success" : "warning"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Fee status" />
          <Table headers={["Status", "Challans", "Outstanding"]}>
            {byStatus.map(([status, count]) => (
              <tr key={status}>
                <Td>
                  <Badge status={status}>{labelize(status)}</Badge>
                </Td>
                <Td>{count}</Td>
                <Td>
                  {formatCurrency(
                    data.fees
                      .filter((f) => f.status === status)
                      .reduce((s, f) => s + Math.max(0, f.amount - f.paid), 0),
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardHeader title="Fee aging (open balances)" />
          <Table headers={["Bucket", "Outstanding"]}>
            <tr>
              <Td>0–7 days</Td>
              <Td>{formatCurrency(aging["0-7"])}</Td>
            </tr>
            <tr>
              <Td>8–30 days</Td>
              <Td>{formatCurrency(aging["8-30"])}</Td>
            </tr>
            <tr>
              <Td>31+ days</Td>
              <Td>{formatCurrency(aging["31+"])}</Td>
            </tr>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Expenses by category" />
          <Table headers={["Category", "Amount"]}>
            {expenseByCat.map(([cat, amt]) => (
              <tr key={cat}>
                <Td>{labelize(cat)}</Td>
                <Td>{formatCurrency(amt)}</Td>
              </tr>
            ))}
            {!expenseByCat.length ? (
              <tr>
                <Td>No expenses</Td>
                <Td>—</Td>
              </tr>
            ) : null}
          </Table>
        </Card>

        <Card>
          <CardHeader title="Payroll snapshot" />
          <Table headers={["Staff", "Month", "Net", "Status"]}>
            {data.payroll.slice(0, 8).map((p) => (
              <tr key={p.id}>
                <Td>{p.staffName}</Td>
                <Td>{p.month}</Td>
                <Td>{formatCurrency(p.net)}</Td>
                <Td>
                  <Badge status={p.status}>{p.status}</Badge>
                </Td>
              </tr>
            ))}
            {!data.payroll.length ? (
              <tr>
                <Td>No payroll lines</Td>
                <Td>—</Td>
                <Td>—</Td>
                <Td>—</Td>
              </tr>
            ) : null}
          </Table>
        </Card>
      </div>
    </PortalShell>
  );
}
