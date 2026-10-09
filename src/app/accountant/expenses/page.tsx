"use client";

import { FormEvent, useMemo, useState } from "react";
import { PortalShell, ACCOUNTANT_NAV } from "@/components/layout/PortalShell";
import { useData, EXPENSE_ACCOUNT } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField, TextArea } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import type { ExpenseCategory, PaymentMode, TripPurpose } from "@/types";

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

export default function AccountantExpensesPage() {
  const {
    data,
    addExpense,
    deleteExpense,
    addTrip,
    updateTripStatus,
    settleTrip,
    deleteTrip,
  } = useData();
  const [tab, setTab] = useState<"expenses" | "trips">("expenses");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
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
    staffId: "",
    participants: "20",
    estimatedBudget: "",
    line1Label: "Transport",
    line1Amount: "",
    line2Label: "Tickets",
    line2Amount: "",
    notes: "",
    campusId: data.institute.campuses[0]?.id ?? "camp1",
  });

  const expenseTotal = useMemo(
    () => data.expenses.reduce((s, e) => s + e.amount, 0),
    [data.expenses],
  );

  return (
    <PortalShell title="Accounts Portal" subtitle="Fee & finance desk" nav={ACCOUNTANT_NAV}>
      <PageHeader
        title="Expenses & Trips"
        subtitle="Operating costs and travel settlements"
        actions={
          tab === "expenses" ? (
            <Button size="sm" onClick={() => setExpenseOpen(true)}>
              Add expense
            </Button>
          ) : (
            <Button size="sm" onClick={() => setTripOpen(true)}>
              New trip
            </Button>
          )
        }
      />

      <div className="mb-4 flex gap-2">
        <Button size="sm" variant={tab === "expenses" ? "primary" : "secondary"} onClick={() => setTab("expenses")}>
          Expenses
        </Button>
        <Button size="sm" variant={tab === "trips" ? "primary" : "secondary"} onClick={() => setTab("trips")}>
          Trips
        </Button>
      </div>

      {tab === "expenses" && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <StatCard label="Total expenses" value={formatCurrency(expenseTotal)} tone="warning" />
            <StatCard label="Entries" value={String(data.expenses.length)} />
          </div>
          <Card>
            <Table headers={["Date", "Category", "Title", "Paid to", "Amount", ""]}>
              {data.expenses.map((e) => (
                <tr key={e.id}>
                  <Td>{formatDate(e.date)}</Td>
                  <Td>{labelize(e.category)}</Td>
                  <Td className="font-medium">{e.title}</Td>
                  <Td>{e.paidTo}</Td>
                  <Td>{formatCurrency(e.amount)}</Td>
                  <Td>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600"
                      onClick={() => {
                        if (confirm("Delete?")) deleteExpense(e.id);
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
          <Table headers={["Trip", "Destination", "Status", "Cost", "Actions"]}>
            {data.trips.map((t) => {
              const cost = t.lines.reduce((s, l) => s + l.amount, 0) || t.estimatedBudget;
              return (
                <tr key={t.id}>
                  <Td className="font-medium">{t.title}</Td>
                  <Td>{t.destination}</Td>
                  <Td>
                    <Badge status={t.status === "paid" ? "paid" : "pending"}>{labelize(t.status)}</Badge>
                  </Td>
                  <Td>{formatCurrency(cost)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {t.status === "planned" && (
                        <Button size="sm" variant="secondary" onClick={() => updateTripStatus(t.id, "approved")}>
                          Approve
                        </Button>
                      )}
                      {(t.status === "approved" || t.status === "completed") && (
                        <Button size="sm" onClick={() => settleTrip(t.id)}>
                          Settle
                        </Button>
                      )}
                      {t.status !== "paid" && (
                        <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => deleteTrip(t.id)}>
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
          <Input label="Title" required value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} />
          <SelectField label="Category" value={expenseForm.category} onChange={(v) => setExpenseForm({ ...expenseForm, category: v as ExpenseCategory })}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{labelize(c)} — {EXPENSE_ACCOUNT[c]}</option>
            ))}
          </SelectField>
          <Input label="Date" type="date" required value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
          <Input label="Paid to" required value={expenseForm.paidTo} onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })} />
          <Input label="Amount" type="number" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
          <TextArea label="Description" value={expenseForm.description} onChange={(v) => setExpenseForm({ ...expenseForm, description: v })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setExpenseOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
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
              estimatedBudget: Number(tripForm.estimatedBudget) || lines.reduce((s, l) => s + l.amount, 0),
              lines,
              notes: tripForm.notes || undefined,
              campusId: tripForm.campusId,
              status: "planned",
            });
            setTripOpen(false);
          }}
        >
          <Input label="Title" required className="sm:col-span-2" value={tripForm.title} onChange={(e) => setTripForm({ ...tripForm, title: e.target.value })} />
          <Input label="Destination" required value={tripForm.destination} onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })} />
          <SelectField label="Purpose" value={tripForm.purpose} onChange={(v) => setTripForm({ ...tripForm, purpose: v as TripPurpose })}>
            <option value="student_trip">Student trip</option>
            <option value="staff_travel">Staff travel</option>
            <option value="official">Official</option>
          </SelectField>
          <Input label="From" type="date" value={tripForm.fromDate} onChange={(e) => setTripForm({ ...tripForm, fromDate: e.target.value })} />
          <Input label="To" type="date" value={tripForm.toDate} onChange={(e) => setTripForm({ ...tripForm, toDate: e.target.value })} />
          <Input label="Line 1 amount" type="number" value={tripForm.line1Amount} onChange={(e) => setTripForm({ ...tripForm, line1Amount: e.target.value })} />
          <Input label="Line 2 amount" type="number" value={tripForm.line2Amount} onChange={(e) => setTripForm({ ...tripForm, line2Amount: e.target.value })} />
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setTripOpen(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </PortalShell>
  );
}
