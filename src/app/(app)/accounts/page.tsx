"use client";

import { FormEvent, useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField, TextArea } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { useData, EXPENSE_ACCOUNT } from "@/components/providers/DataProvider";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import { feeLedgerReconcile, sumMoney } from "@/lib/calc";
import { exportCsv } from "@/lib/school/export-csv";
import type {
  AccountVoucher,
  ExpenseCategory,
  PaymentMode,
  TripPurpose,
} from "@/types";

type Tab = "overview" | "reconcile" | "ledger" | "expenses" | "trips" | "payroll";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "utilities",
  "supplies",
  "maintenance",
  "transport_ops",
  "travel_trip",
  "salaries",
  "food_mess",
  "marketing",
  "rent",
  "other",
];

function inDateRange(date: string, from: string, to: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export default function AccountsPage() {
  const {
    data,
    stats,
    addVoucher,
    deleteVoucher,
    addExpense,
    deleteExpense,
    addTrip,
    updateTripStatus,
    settleTrip,
    deleteTrip,
    generatePayroll,
    payPayroll,
    payAllPayrollForMonth,
  } = useData();

  const [tab, setTab] = useState<Tab>("overview");
  const [typeFilter, setTypeFilter] = useState<"all" | AccountVoucher["type"]>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [campusFilter, setCampusFilter] = useState("all");
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [payrollMonth, setPayrollMonth] = useState(
    new Date().toLocaleString("en-PK", { month: "long", year: "numeric" }),
  );
  const [msg, setMsg] = useState("");

  const [voucherForm, setVoucherForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "receipt" as AccountVoucher["type"],
    account: "",
    description: "",
    amount: "",
    campusId: data.institute.campuses[0]?.id ?? "camp1",
  });

  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "utilities" as ExpenseCategory,
    title: "",
    description: "",
    amount: "",
    paidTo: "",
    paymentMode: "bank" as PaymentMode,
    campusId: data.institute.campuses[0]?.id ?? "camp1",
  });

  const [tripForm, setTripForm] = useState({
    title: "",
    purpose: "student_trip" as TripPurpose,
    destination: "",
    fromDate: new Date().toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
    staffId: data.staff[0]?.id ?? "",
    participants: "20",
    estimatedBudget: "",
    line1Label: "Transport",
    line1Amount: "",
    line2Label: "Tickets / lodging",
    line2Amount: "",
    notes: "",
    campusId: data.institute.campuses[0]?.id ?? "camp1",
  });

  const campusName = (id: string) =>
    data.institute.campuses.find((c) => c.id === id)?.name ?? id;

  const scopedVouchers = useMemo(
    () =>
      data.vouchers.filter(
        (v) =>
          (campusFilter === "all" || v.campusId === campusFilter) &&
          inDateRange(v.date, dateFrom, dateTo),
      ),
    [data.vouchers, campusFilter, dateFrom, dateTo],
  );

  const scopedExpenses = useMemo(
    () =>
      data.expenses.filter(
        (e) =>
          (campusFilter === "all" || e.campusId === campusFilter) &&
          inDateRange(e.date, dateFrom, dateTo),
      ),
    [data.expenses, campusFilter, dateFrom, dateTo],
  );

  const scopedTrips = useMemo(
    () =>
      data.trips.filter((t) => {
        if (campusFilter !== "all" && t.campusId !== campusFilter) return false;
        if (dateFrom && t.toDate < dateFrom) return false;
        if (dateTo && t.fromDate > dateTo) return false;
        return true;
      }),
    [data.trips, campusFilter, dateFrom, dateTo],
  );

  const chronological = useMemo(() => {
    return [...scopedVouchers].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.voucherNo.localeCompare(b.voucherNo);
    });
  }, [scopedVouchers]);

  const withBalance = useMemo(() => {
    let running = 0;
    return chronological.map((v) => {
      if (v.type === "receipt") running += v.amount;
      else if (v.type === "payment") running -= v.amount;
      return { ...v, runningBalance: running };
    });
  }, [chronological]);

  const filtered = useMemo(() => {
    const rows =
      typeFilter === "all"
        ? withBalance
        : withBalance.filter((v) => v.type === typeFilter);
    return [...rows].reverse();
  }, [withBalance, typeFilter]);

  const ledgerTotals = useMemo(() => {
    const receipts = sumMoney(
      scopedVouchers.filter((v) => v.type === "receipt").map((v) => v.amount),
    );
    const payments = sumMoney(
      scopedVouchers.filter((v) => v.type === "payment").map((v) => v.amount),
    );
    return { receipts, payments, balance: receipts - payments };
  }, [scopedVouchers]);

  const expenseTotal = useMemo(
    () => sumMoney(scopedExpenses.map((e) => e.amount)),
    [scopedExpenses],
  );

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of scopedExpenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [scopedExpenses]);

  const payrollRows = useMemo(
    () => data.payroll.filter((p) => p.month === payrollMonth),
    [data.payroll, payrollMonth],
  );
  const payrollNet = sumMoney(payrollRows.map((p) => p.net));
  const payrollPending = payrollRows.filter((p) => p.status !== "paid").length;

  const tripOpenCost = useMemo(
    () =>
      sumMoney(
        scopedTrips
          .filter((t) => t.status !== "paid" && t.status !== "cancelled")
          .map((t) => t.lines.reduce((a, l) => a + l.amount, 0) || t.estimatedBudget),
      ),
    [scopedTrips],
  );

  const reconcile = useMemo(
    () => feeLedgerReconcile(data.fees, scopedVouchers),
    [data.fees, scopedVouchers],
  );

  const expenseVsPayments = useMemo(() => {
    const expenseBooked = expenseTotal;
    const paymentVouchers = sumMoney(
      scopedVouchers.filter((v) => v.type === "payment").map((v) => v.amount),
    );
    const gap = Math.round((expenseBooked - paymentVouchers) * 100) / 100;
    return { expenseBooked, paymentVouchers, gap };
  }, [expenseTotal, scopedVouchers]);

  const unpostedExpenses = useMemo(
    () => scopedExpenses.filter((e) => !e.voucherId),
    [scopedExpenses],
  );

  const unsettledTrips = useMemo(
    () =>
      scopedTrips.filter(
        (t) => t.status !== "paid" && t.status !== "cancelled" && !t.voucherId,
      ),
    [scopedTrips],
  );

  function exportLedger() {
    exportCsv("accounts-ledger.csv", [
      ["Voucher", "Date", "Type", "Account", "Description", "Amount", "Campus", "Running bal."],
      ...withBalance.map((v) => [
        v.voucherNo,
        v.date,
        v.type,
        v.account,
        v.description,
        String(v.amount),
        campusName(v.campusId),
        String(v.runningBalance),
      ]),
    ]);
  }

  function exportExpenses() {
    exportCsv("accounts-expenses.csv", [
      ["Date", "Category", "Title", "Paid to", "Mode", "Amount", "Campus", "Voucher linked"],
      ...scopedExpenses.map((e) => [
        e.date,
        e.category,
        e.title,
        e.paidTo,
        e.paymentMode,
        String(e.amount),
        campusName(e.campusId),
        e.voucherId ? "Yes" : "No",
      ]),
    ]);
  }

  function exportTrips() {
    exportCsv("accounts-trips.csv", [
      ["Title", "Purpose", "Destination", "From", "To", "People", "Cost", "Status", "Campus", "Settled"],
      ...scopedTrips.map((t) => [
        t.title,
        t.purpose,
        t.destination,
        t.fromDate,
        t.toDate,
        String(t.participants),
        String(t.lines.reduce((s, l) => s + l.amount, 0) || t.estimatedBudget),
        t.status,
        campusName(t.campusId),
        t.settledOn ?? "",
      ]),
    ]);
  }

  function exportPayrollCsv() {
    exportCsv("accounts-payroll.csv", [
      ["Staff", "Month", "Basic", "Allowances", "Deductions", "Leave days", "Leave deduct", "Net", "Status", "Paid on"],
      ...payrollRows.map((p) => [
        p.staffName,
        p.month,
        String(p.basic),
        String(p.allowances),
        String(p.deductions),
        String(p.leaveDays ?? 0),
        String(p.leaveDeduction ?? 0),
        String(p.net),
        p.status,
        p.paidOn ?? "",
      ]),
    ]);
  }

  function exportReconcile() {
    exportCsv("accounts-reconcile.csv", [
      ["Metric", "Amount"],
      ["Fee collected (ledger paid)", String(reconcile.feeCollected)],
      ["Fee receipts posted", String(reconcile.feeReceipts)],
      ["Fee gap (collected − receipts)", String(reconcile.gap)],
      ["Expenses booked", String(expenseVsPayments.expenseBooked)],
      ["Payment vouchers", String(expenseVsPayments.paymentVouchers)],
      ["Expense vs payments gap", String(expenseVsPayments.gap)],
      ["Unposted expenses", String(unpostedExpenses.length)],
      ["Unsettled trips", String(unsettledTrips.length)],
    ]);
  }

  const filterBar = (
    <Card className="mb-4 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="From"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <Input
          label="To"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-medium text-[var(--ims-text-muted)]">
            Campus
          </label>
          <select
            className="h-10 w-full rounded-md border border-[var(--ims-border)] bg-white px-3 text-sm"
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
          >
            <option value="all">All campuses</option>
            {data.institute.campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {(dateFrom || dateTo || campusFilter !== "all") && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setCampusFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="Accounts & Finance"
        subtitle="Revenue, salaries, expenses, trips, ledger & reconciliation"
        actions={
          tab === "ledger" ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={exportLedger}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button size="sm" onClick={() => setVoucherOpen(true)}>
                <Plus className="h-4 w-4" /> New voucher
              </Button>
            </div>
          ) : tab === "expenses" ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={exportExpenses}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button size="sm" onClick={() => setExpenseOpen(true)}>
                <Plus className="h-4 w-4" /> Add expense
              </Button>
            </div>
          ) : tab === "trips" ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={exportTrips}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button size="sm" onClick={() => setTripOpen(true)}>
                <Plus className="h-4 w-4" /> New trip
              </Button>
            </div>
          ) : tab === "payroll" ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={exportPayrollCsv}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const n = generatePayroll(payrollMonth, true);
                  setMsg(n ? `Generated ${n} salary line(s).` : "Already generated for active staff.");
                }}
              >
                Generate salaries
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const n = payAllPayrollForMonth(payrollMonth);
                  setMsg(n ? `Paid ${n} — salary vouchers posted.` : "Nothing pending.");
                }}
              >
                Pay all & post
              </Button>
            </div>
          ) : tab === "reconcile" ? (
            <Button size="sm" variant="secondary" onClick={exportReconcile}>
              <Download className="h-4 w-4" /> Reconcile CSV
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={exportLedger}>
                Ledger
              </Button>
              <Button size="sm" variant="secondary" onClick={exportExpenses}>
                Expenses
              </Button>
              <Button size="sm" variant="secondary" onClick={exportTrips}>
                Trips
              </Button>
            </div>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["overview", "Overview"],
            ["reconcile", "Reconcile"],
            ["ledger", "Ledger / Revenue"],
            ["expenses", "Expenses"],
            ["trips", "Trips"],
            ["payroll", "Payroll / Salaries"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? "primary" : "secondary"}
            onClick={() => {
              setTab(id);
              setMsg("");
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab !== "payroll" ? filterBar : null}

      {tab === "overview" && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Revenue (receipts)" value={formatCurrency(ledgerTotals.receipts)} tone="success" />
            <StatCard label="Expenses booked" value={formatCurrency(expenseTotal)} tone="warning" />
            <StatCard label="Payroll pending" value={stats.payrollPendingLabel} tone="accent" />
            <StatCard label="Net (scoped)" value={formatCurrency(ledgerTotals.balance)} />
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Fee collected (all)" value={stats.feeCollectedAllLabel} tone="success" />
            <StatCard label="Fee pending" value={stats.feePendingAllLabel} tone="warning" />
            <StatCard label="Open trip budget" value={formatCurrency(tripOpenCost)} />
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Fee ↔ ledger gap"
              value={formatCurrency(reconcile.gap)}
              tone={reconcile.matched ? "success" : "warning"}
            />
            <StatCard
              label="Unposted expenses"
              value={String(unpostedExpenses.length)}
              tone={unpostedExpenses.length ? "warning" : "success"}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <p className="border-b border-[var(--ims-border)] px-4 py-3 text-sm font-medium">
                Expense by category
              </p>
              <Table headers={["Category", "Amount"]}>
                {expenseByCategory.map(([cat, amt]) => (
                  <tr key={cat}>
                    <Td>{labelize(cat)}</Td>
                    <Td className="font-medium">{formatCurrency(amt)}</Td>
                  </tr>
                ))}
                {!expenseByCategory.length ? (
                  <tr>
                    <Td>No expenses yet</Td>
                    <Td>—</Td>
                  </tr>
                ) : null}
              </Table>
            </Card>
            <Card>
              <p className="border-b border-[var(--ims-border)] px-4 py-3 text-sm font-medium">
                Recent vouchers (scoped)
              </p>
              <Table headers={["Voucher", "Type", "Amount"]}>
                {scopedVouchers.slice(0, 8).map((v) => (
                  <tr key={v.id}>
                    <Td className="font-medium">{v.voucherNo}</Td>
                    <Td>
                      <Badge status={v.type === "receipt" ? "paid" : "pending"}>
                        {labelize(v.type)}
                      </Badge>
                    </Td>
                    <Td>{formatCurrency(v.amount)}</Td>
                  </tr>
                ))}
              </Table>
            </Card>
          </div>
        </>
      )}

      {tab === "reconcile" && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Fee collected" value={formatCurrency(reconcile.feeCollected)} tone="success" />
            <StatCard label="Fee receipts posted" value={formatCurrency(reconcile.feeReceipts)} />
            <StatCard
              label="Gap (collected − receipts)"
              value={formatCurrency(reconcile.gap)}
              tone={reconcile.matched ? "success" : "warning"}
            />
            <StatCard
              label="Status"
              value={reconcile.matched ? "Matched" : "Review"}
              tone={reconcile.matched ? "success" : "warning"}
            />
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Expenses booked" value={formatCurrency(expenseVsPayments.expenseBooked)} />
            <StatCard label="Payment vouchers" value={formatCurrency(expenseVsPayments.paymentVouchers)} />
            <StatCard
              label="Expense vs payments"
              value={formatCurrency(expenseVsPayments.gap)}
              tone={Math.abs(expenseVsPayments.gap) < 0.01 ? "success" : "accent"}
            />
          </div>
          <p className="mb-4 text-sm text-[var(--ims-text-muted)]">
            Fee receipts are vouchers with type Receipt whose account/description contains “fee”
            (Student Fee Income). A non-zero gap means collections without a matching ledger post
            (or vouchers without fee invoices). Filters above scope vouchers/expenses; fee totals
            remain school-wide.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <p className="border-b border-[var(--ims-border)] px-4 py-3 text-sm font-medium">
                Unposted expenses ({unpostedExpenses.length})
              </p>
              <Table headers={["Date", "Title", "Amount"]}>
                {unpostedExpenses.slice(0, 12).map((e) => (
                  <tr key={e.id}>
                    <Td>{formatDate(e.date)}</Td>
                    <Td className="font-medium">{e.title}</Td>
                    <Td>{formatCurrency(e.amount)}</Td>
                  </tr>
                ))}
                {!unpostedExpenses.length ? (
                  <tr>
                    <Td>All expenses linked to vouchers</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                  </tr>
                ) : null}
              </Table>
            </Card>
            <Card>
              <p className="border-b border-[var(--ims-border)] px-4 py-3 text-sm font-medium">
                Unsettled trips ({unsettledTrips.length})
              </p>
              <Table headers={["Trip", "Status", "Cost"]}>
                {unsettledTrips.slice(0, 12).map((t) => (
                  <tr key={t.id}>
                    <Td className="font-medium">{t.title}</Td>
                    <Td>{labelize(t.status)}</Td>
                    <Td>
                      {formatCurrency(
                        t.lines.reduce((s, l) => s + l.amount, 0) || t.estimatedBudget,
                      )}
                    </Td>
                  </tr>
                ))}
                {!unsettledTrips.length ? (
                  <tr>
                    <Td>No open trips</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                  </tr>
                ) : null}
              </Table>
            </Card>
          </div>
        </>
      )}

      {tab === "ledger" && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Receipts (revenue)" value={formatCurrency(ledgerTotals.receipts)} tone="success" />
            <StatCard label="Payments" value={formatCurrency(ledgerTotals.payments)} tone="warning" />
            <StatCard label="Net" value={formatCurrency(ledgerTotals.balance)} />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {(["all", "receipt", "payment", "journal", "contra"] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={typeFilter === t ? "primary" : "secondary"}
                onClick={() => setTypeFilter(t)}
              >
                {t === "all" ? "All types" : labelize(t)}
              </Button>
            ))}
          </div>
          <Card>
            <Table
              headers={[
                "Voucher",
                "Date",
                "Type",
                "Account",
                "Description",
                "Campus",
                "Amount",
                "Running bal.",
                "Actions",
              ]}
            >
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-[var(--ims-muted)]/40">
                  <Td className="font-medium text-[var(--ims-primary)]">{v.voucherNo}</Td>
                  <Td>{formatDate(v.date)}</Td>
                  <Td>
                    <Badge status={v.type === "receipt" ? "paid" : "pending"}>
                      {labelize(v.type)}
                    </Badge>
                  </Td>
                  <Td>{v.account}</Td>
                  <Td className="max-w-[220px] truncate">{v.description}</Td>
                  <Td className="text-xs">{campusName(v.campusId)}</Td>
                  <Td>{formatCurrency(v.amount)}</Td>
                  <Td className="font-medium">{formatCurrency(v.runningBalance)}</Td>
                  <Td>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 text-rose-600"
                      onClick={() => {
                        if (confirm("Delete voucher?")) deleteVoucher(v.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {tab === "expenses" && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <StatCard label="Total expenses" value={formatCurrency(expenseTotal)} tone="warning" />
            <StatCard label="Entries" value={String(scopedExpenses.length)} />
          </div>
          <Card>
            <Table headers={["Date", "Category", "Title", "Paid to", "Mode", "Campus", "Amount", ""]}>
              {scopedExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-[var(--ims-muted)]/40">
                  <Td>{formatDate(e.date)}</Td>
                  <Td>{labelize(e.category)}</Td>
                  <Td className="font-medium">{e.title}</Td>
                  <Td>{e.paidTo}</Td>
                  <Td>{labelize(e.paymentMode)}</Td>
                  <Td className="text-xs">{campusName(e.campusId)}</Td>
                  <Td>{formatCurrency(e.amount)}</Td>
                  <Td>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600"
                      onClick={() => {
                        if (confirm("Delete expense?")) deleteExpense(e.id);
                      }}
                    >
                      Delete
                    </Button>
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      {tab === "trips" && (
        <Card>
          <Table
            headers={[
              "Trip",
              "Purpose",
              "Destination",
              "Dates",
              "People",
              "Cost",
              "Campus",
              "Status",
              "Actions",
            ]}
          >
            {scopedTrips.map((t) => {
              const cost = t.lines.reduce((s, l) => s + l.amount, 0) || t.estimatedBudget;
              return (
                <tr key={t.id} className="hover:bg-[var(--ims-muted)]/40">
                  <Td className="font-medium">{t.title}</Td>
                  <Td>{labelize(t.purpose)}</Td>
                  <Td>{t.destination}</Td>
                  <Td className="text-xs">
                    {formatDate(t.fromDate)} → {formatDate(t.toDate)}
                  </Td>
                  <Td>{t.participants}</Td>
                  <Td>{formatCurrency(cost)}</Td>
                  <Td className="text-xs">{campusName(t.campusId)}</Td>
                  <Td>
                    <Badge status={t.status === "paid" ? "paid" : "pending"}>
                      {labelize(t.status)}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {t.status === "planned" && (
                        <Button size="sm" variant="secondary" onClick={() => updateTripStatus(t.id, "approved")}>
                          Approve
                        </Button>
                      )}
                      {t.status === "approved" && (
                        <Button size="sm" variant="secondary" onClick={() => updateTripStatus(t.id, "completed")}>
                          Complete
                        </Button>
                      )}
                      {(t.status === "approved" || t.status === "completed") && (
                        <Button size="sm" onClick={() => settleTrip(t.id)}>
                          Settle & post
                        </Button>
                      )}
                      {t.status !== "paid" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600"
                          onClick={() => {
                            if (confirm("Delete trip?")) deleteTrip(t.id);
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
        </Card>
      )}

      {tab === "payroll" && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Lines this month" value={String(payrollRows.length)} />
            <StatCard label="Net payroll" value={formatCurrency(payrollNet)} tone="success" />
            <StatCard label="Pending pay" value={String(payrollPending)} tone="warning" />
          </div>
          <Card className="mb-4 p-4">
            <Input
              label="Payroll month"
              value={payrollMonth}
              onChange={(e) => {
                setPayrollMonth(e.target.value);
                setMsg("");
              }}
            />
            {msg ? <p className="mt-2 text-sm text-emerald-700">{msg}</p> : null}
            <p className="mt-2 text-xs text-[var(--ims-text-muted)]">
              Basic = staff salary · Allowances 10% · Tax 5% if basic &gt; 100,000 · Unpaid leave
              deducts basic/30 · Pay posts a Salaries voucher
            </p>
          </Card>
          <Card>
            <Table headers={["Staff", "Month", "Basic", "Allowances", "Deductions", "Net", "Status", ""]}>
              {payrollRows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--ims-muted)]/40">
                  <Td className="font-medium">{row.staffName}</Td>
                  <Td>{row.month}</Td>
                  <Td>{formatCurrency(row.basic)}</Td>
                  <Td>{formatCurrency(row.allowances)}</Td>
                  <Td>{formatCurrency(row.deductions)}</Td>
                  <Td className="font-semibold">{formatCurrency(row.net)}</Td>
                  <Td>
                    <Badge status={row.status === "paid" ? "paid" : "pending"}>
                      {labelize(row.status)}
                    </Badge>
                  </Td>
                  <Td>
                    {row.status !== "paid" ? (
                      <Button size="sm" onClick={() => payPayroll(row.id)}>
                        Pay & post
                      </Button>
                    ) : (
                      <span className="text-xs text-[var(--ims-text-muted)]">
                        {row.paidOn ? formatDate(row.paidOn) : "Paid"}
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
              {!payrollRows.length ? (
                <tr>
                  <Td>No payroll lines for this month — Generate salaries</Td>
                  <Td>—</Td>
                  <Td>—</Td>
                  <Td>—</Td>
                  <Td>—</Td>
                  <Td>—</Td>
                  <Td>—</Td>
                  <Td>—</Td>
                </tr>
              ) : null}
            </Table>
          </Card>
        </>
      )}

      <Modal open={voucherOpen} onClose={() => setVoucherOpen(false)} title="Create voucher">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            addVoucher({
              date: voucherForm.date,
              type: voucherForm.type,
              account: voucherForm.account,
              description: voucherForm.description,
              amount: Number(voucherForm.amount),
              campusId: voucherForm.campusId,
            });
            setVoucherOpen(false);
          }}
        >
          <SelectField
            label="Type"
            value={voucherForm.type}
            onChange={(v) => setVoucherForm({ ...voucherForm, type: v as AccountVoucher["type"] })}
          >
            <option value="receipt">Receipt (revenue)</option>
            <option value="payment">Payment (expense)</option>
            <option value="journal">Journal</option>
            <option value="contra">Contra</option>
          </SelectField>
          <Input
            label="Date"
            type="date"
            required
            value={voucherForm.date}
            onChange={(e) => setVoucherForm({ ...voucherForm, date: e.target.value })}
          />
          <Input
            label="Account"
            required
            value={voucherForm.account}
            onChange={(e) => setVoucherForm({ ...voucherForm, account: e.target.value })}
            placeholder="e.g. Student Fee Income"
          />
          <TextArea
            label="Description"
            required
            value={voucherForm.description}
            onChange={(v) => setVoucherForm({ ...voucherForm, description: v })}
          />
          <Input
            label="Amount"
            type="number"
            required
            value={voucherForm.amount}
            onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })}
          />
          <SelectField
            label="Campus"
            value={voucherForm.campusId}
            onChange={(v) => setVoucherForm({ ...voucherForm, campusId: v })}
          >
            {data.institute.campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setVoucherOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save voucher</Button>
          </div>
        </form>
      </Modal>

      <Modal open={expenseOpen} onClose={() => setExpenseOpen(false)} title="Add expense">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            addExpense({
              ...expenseForm,
              amount: Number(expenseForm.amount),
              postVoucher: true,
            });
            setExpenseOpen(false);
          }}
        >
          <Input
            label="Title"
            required
            value={expenseForm.title}
            onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
          />
          <SelectField
            label="Category"
            value={expenseForm.category}
            onChange={(v) => setExpenseForm({ ...expenseForm, category: v as ExpenseCategory })}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {labelize(c)} — {EXPENSE_ACCOUNT[c]}
              </option>
            ))}
          </SelectField>
          <Input
            label="Date"
            type="date"
            required
            value={expenseForm.date}
            onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
          />
          <Input
            label="Paid to"
            required
            value={expenseForm.paidTo}
            onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })}
          />
          <Input
            label="Amount (PKR)"
            type="number"
            required
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
          />
          <SelectField
            label="Payment mode"
            value={expenseForm.paymentMode}
            onChange={(v) => setExpenseForm({ ...expenseForm, paymentMode: v as PaymentMode })}
          >
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="cheque">Cheque</option>
            <option value="online">Online</option>
          </SelectField>
          <SelectField
            label="Campus"
            value={expenseForm.campusId}
            onChange={(v) => setExpenseForm({ ...expenseForm, campusId: v })}
          >
            {data.institute.campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <TextArea
            label="Description"
            value={expenseForm.description}
            onChange={(v) => setExpenseForm({ ...expenseForm, description: v })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setExpenseOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save & post voucher</Button>
          </div>
        </form>
      </Modal>

      <Modal open={tripOpen} onClose={() => setTripOpen(false)} title="New trip" wide>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            const lines = [
              { label: tripForm.line1Label, amount: Number(tripForm.line1Amount) || 0 },
              { label: tripForm.line2Label, amount: Number(tripForm.line2Amount) || 0 },
            ].filter((l) => l.amount > 0);
            const staff = data.staff.find((s) => s.id === tripForm.staffId);
            addTrip({
              title: tripForm.title,
              purpose: tripForm.purpose,
              destination: tripForm.destination,
              fromDate: tripForm.fromDate,
              toDate: tripForm.toDate,
              staffId: staff?.id,
              staffName: staff?.name,
              participants: Number(tripForm.participants) || 1,
              estimatedBudget:
                Number(tripForm.estimatedBudget) ||
                lines.reduce((s, l) => s + l.amount, 0),
              lines,
              notes: tripForm.notes || undefined,
              campusId: tripForm.campusId,
              status: "planned",
            });
            setTripOpen(false);
          }}
        >
          <Input
            label="Title"
            required
            className="sm:col-span-2"
            value={tripForm.title}
            onChange={(e) => setTripForm({ ...tripForm, title: e.target.value })}
          />
          <Input
            label="Destination"
            required
            value={tripForm.destination}
            onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })}
          />
          <SelectField
            label="Purpose"
            value={tripForm.purpose}
            onChange={(v) => setTripForm({ ...tripForm, purpose: v as TripPurpose })}
          >
            <option value="student_trip">Student trip</option>
            <option value="staff_travel">Staff travel</option>
            <option value="official">Official</option>
          </SelectField>
          <Input
            label="From"
            type="date"
            value={tripForm.fromDate}
            onChange={(e) => setTripForm({ ...tripForm, fromDate: e.target.value })}
          />
          <Input
            label="To"
            type="date"
            value={tripForm.toDate}
            onChange={(e) => setTripForm({ ...tripForm, toDate: e.target.value })}
          />
          <SelectField
            label="In-charge staff"
            value={tripForm.staffId}
            onChange={(v) => setTripForm({ ...tripForm, staffId: v })}
          >
            {data.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
          <Input
            label="Participants"
            type="number"
            value={tripForm.participants}
            onChange={(e) => setTripForm({ ...tripForm, participants: e.target.value })}
          />
          <Input
            label="Line 1 label"
            value={tripForm.line1Label}
            onChange={(e) => setTripForm({ ...tripForm, line1Label: e.target.value })}
          />
          <Input
            label="Line 1 amount"
            type="number"
            value={tripForm.line1Amount}
            onChange={(e) => setTripForm({ ...tripForm, line1Amount: e.target.value })}
          />
          <Input
            label="Line 2 label"
            value={tripForm.line2Label}
            onChange={(e) => setTripForm({ ...tripForm, line2Label: e.target.value })}
          />
          <Input
            label="Line 2 amount"
            type="number"
            value={tripForm.line2Amount}
            onChange={(e) => setTripForm({ ...tripForm, line2Amount: e.target.value })}
          />
          <Input
            label="Estimated budget (optional)"
            type="number"
            className="sm:col-span-2"
            value={tripForm.estimatedBudget}
            onChange={(e) => setTripForm({ ...tripForm, estimatedBudget: e.target.value })}
          />
          <SelectField
            label="Campus"
            value={tripForm.campusId}
            onChange={(v) => setTripForm({ ...tripForm, campusId: v })}
          >
            {data.institute.campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setTripOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create trip</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
