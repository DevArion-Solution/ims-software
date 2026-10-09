"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, RefreshCw, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useData } from "@/components/providers/DataProvider";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import { computeFeeBalance } from "@/lib/calc";
import type { FeeFrequency, FeeStructure } from "@/types";

type Tab = "challans" | "structures" | "defaulters";

export default function FeesPage() {
  const { dict } = useLocale();
  const {
    data,
    addFee,
    addFeeFromStructure,
    collectFee,
    waiveFee,
    generateClassFees,
    deleteFee,
    recalculateFees,
    addFeeStructure,
    updateFeeStructure,
    deleteFeeStructure,
    stats,
  } = useData();
  const [tab, setTab] = useState<Tab>("challans");
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [fromStructure, setFromStructure] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [collectOpen, setCollectOpen] = useState<string | null>(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMode, setCollectMode] = useState<"cash" | "bank" | "cheque">("cash");
  const [collectMsg, setCollectMsg] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    studentId: data.students[0]?.id ?? "",
    structureId: data.feeStructures[0]?.id ?? "",
    month: new Date().toLocaleString("en-PK", { month: "long", year: "numeric" }),
    amount: "15000",
    discount: "0",
    feeHead: "Monthly Tuition",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });
  const [bulkForm, setBulkForm] = useState({
    structureId: data.feeStructures[0]?.id ?? "",
    month: new Date().toLocaleString("en-PK", { month: "long", year: "numeric" }),
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    discount: "0",
  });
  const [structureForm, setStructureForm] = useState({
    name: "",
    className: "Class 8",
    amount: "15000",
    frequency: "monthly" as FeeFrequency,
  });

  useEffect(() => {
    recalculateFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => data.fees.filter((f) => statusFilter === "all" || f.status === statusFilter),
    [data.fees, statusFilter],
  );

  const defaulters = useMemo(
    () =>
      data.fees
        .filter((f) => f.status === "overdue" || (f.status === "pending" && computeFeeBalance(f.amount, f.paid) > 0))
        .filter((f) => f.status === "overdue")
        .sort((a, b) => computeFeeBalance(b.amount, b.paid) - computeFeeBalance(a.amount, a.paid)),
    [data.fees],
  );

  const selected = data.fees.find((f) => f.id === collectOpen);
  const selectedStructure = data.feeStructures.find((s) => s.id === form.structureId);

  function openChallan(useStructure: boolean) {
    setFromStructure(useStructure);
    setForm({
      studentId: data.students[0]?.id ?? "",
      structureId: data.feeStructures[0]?.id ?? "",
      month: new Date().toLocaleString("en-PK", { month: "long", year: "numeric" }),
      amount: useStructure
        ? String(data.feeStructures[0]?.amount ?? 15000)
        : "15000",
      discount: "0",
      feeHead: useStructure
        ? data.feeStructures[0]?.name ?? "Monthly Tuition"
        : "Monthly Tuition",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    });
    setOpen(true);
  }

  function openStructureCreate() {
    setEditingStructure(null);
    setStructureForm({
      name: "",
      className: "Class 8",
      amount: "15000",
      frequency: "monthly",
    });
    setStructureOpen(true);
  }

  function openStructureEdit(s: FeeStructure) {
    setEditingStructure(s);
    setStructureForm({
      name: s.name,
      className: s.className,
      amount: String(s.amount),
      frequency: s.frequency,
    });
    setStructureOpen(true);
  }

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (fromStructure) {
      if (!form.structureId || !form.studentId) return;
      addFeeFromStructure({
        structureId: form.structureId,
        studentId: form.studentId,
        month: form.month,
        dueDate: form.dueDate,
        discount: Number(form.discount) || 0,
      });
    } else {
      const student = data.students.find((s) => s.id === form.studentId);
      if (!student) return;
      addFee({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        className: `${student.className}-${student.section}`,
        month: form.month,
        amount: Number(form.amount),
        discount: Number(form.discount) || 0,
        dueDate: form.dueDate,
        feeHead: form.feeHead || undefined,
      });
    }
    setOpen(false);
    setTab("challans");
  }

  function onBulkGenerate(e: FormEvent) {
    e.preventDefault();
    const n = generateClassFees({
      structureId: bulkForm.structureId,
      month: bulkForm.month,
      dueDate: bulkForm.dueDate,
      discount: Number(bulkForm.discount) || 0,
    });
    setCollectMsg(
      n > 0
        ? `Generated ${n} challan(s) for ${bulkForm.month} (skipped existing).`
        : "No new challans — students already have this month/structure.",
    );
    setBulkOpen(false);
    setTab("challans");
  }

  function onStructureSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      name: structureForm.name,
      className: structureForm.className,
      amount: Number(structureForm.amount),
      frequency: structureForm.frequency,
    };
    if (editingStructure) updateFeeStructure(editingStructure.id, payload);
    else addFeeStructure(payload);
    setStructureOpen(false);
  }

  function onCollect(e: FormEvent) {
    e.preventDefault();
    if (!collectOpen) return;
    const result = collectFee(collectOpen, Number(collectAmount), collectMode);
    setCollectMsg(
      result.change > 0
        ? `Applied Rs ${result.applied} via ${collectMode}. Change/excess Rs ${result.change} not kept on challan.`
        : `Applied Rs ${result.applied} via ${collectMode}.`,
    );
    setCollectOpen(null);
    setCollectAmount("");
  }

  return (
    <div>
      <PageHeader
        title={dict.modules.fees.title}
        subtitle="Fee structures · challans · base − discount + late fee = net"
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => recalculateFees()}>
              <RefreshCw className="h-4 w-4" /> Recalculate late fees
            </Button>
            {tab === "structures" ? (
              <Button size="sm" onClick={openStructureCreate}>
                <Plus className="h-4 w-4" />
                Add structure
              </Button>
            ) : (
              <>
                <Button size="sm" variant="secondary" onClick={() => setBulkOpen(true)}>
                  Bulk month
                </Button>
                <Button size="sm" variant="secondary" onClick={() => openChallan(true)}>
                  From structure
                </Button>
                <Button size="sm" onClick={() => openChallan(false)}>
                  <Plus className="h-4 w-4" />
                  Generate challan
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="mb-4 flex gap-2">
        <Button
          size="sm"
          variant={tab === "challans" ? "primary" : "secondary"}
          onClick={() => setTab("challans")}
        >
          Challans
        </Button>
        <Button
          size="sm"
          variant={tab === "defaulters" ? "primary" : "secondary"}
          onClick={() => setTab("defaulters")}
        >
          Defaulters ({defaulters.length})
        </Button>
        <Button
          size="sm"
          variant={tab === "structures" ? "primary" : "secondary"}
          onClick={() => setTab("structures")}
        >
          Fee Structures
        </Button>
      </div>

      {tab === "defaulters" ? (
        <Card>
          <Table headers={["Student", "Month", "Head", "Balance", "Due", "Status", "Actions"]}>
            {defaulters.map((row) => {
              const balance = computeFeeBalance(row.amount, row.paid);
              return (
                <tr key={row.id} className="hover:bg-[var(--ims-muted)]/40">
                  <Td className="font-medium">
                    {row.studentName}
                    <p className="text-xs text-[var(--ims-text-muted)]">{row.className}</p>
                  </Td>
                  <Td>{row.month}</Td>
                  <Td className="text-xs">{row.feeHead ?? "—"}</Td>
                  <Td className="font-semibold text-rose-700">{formatCurrency(balance)}</Td>
                  <Td>{formatDate(row.dueDate)}</Td>
                  <Td>
                    <Badge status={row.status}>{labelize(row.status)}</Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          setCollectOpen(row.id);
                          setCollectAmount(String(balance));
                        }}
                      >
                        Collect
                      </Button>
                      <Link href={`/challan/${row.id}`}>
                        <Button size="sm" variant="secondary">
                          Print
                        </Button>
                      </Link>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </Table>
          {!defaulters.length ? (
            <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
              No overdue defaulters
            </p>
          ) : null}
        </Card>
      ) : tab === "challans" ? (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Collected (this month)" value={stats.feeCollectedLabel} tone="success" />
            <StatCard label="Pending (this month)" value={stats.feePendingLabel} tone="warning" />
            <StatCard label="Outstanding (all)" value={stats.feePendingAllLabel} />
            <StatCard label="Overdue amount" value={stats.feeOverdueLabel} tone="accent" />
          </div>
          {collectMsg ? (
            <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {collectMsg}
            </p>
          ) : null}

          <Card>
            <div className="flex items-center justify-between border-b border-[var(--ims-border)] p-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-[var(--ims-border)] bg-white px-3 text-sm"
              >
                <option value="all">All statuses</option>
                {["pending", "partial", "paid", "overdue", "waived"].map((s) => (
                  <option key={s} value={s}>
                    {labelize(s)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--ims-text-muted)]">
                Net = Base − Discount + Late fee · Balance = Net − Paid
              </p>
            </div>
            <Table
              headers={[
                "Student",
                "Month",
                "Head",
                "Base",
                "Discount",
                "Late",
                "Net",
                "Paid",
                "Balance",
                "Due",
                dict.common.status,
                dict.common.actions,
              ]}
            >
              {filtered.map((row) => {
                const balance = computeFeeBalance(row.amount, row.paid);
                return (
                  <tr key={row.id} className="hover:bg-[var(--ims-muted)]/40">
                    <Td>
                      <div>
                        <p className="font-medium">{row.studentName}</p>
                        <p className="text-xs text-[var(--ims-text-muted)]">{row.className}</p>
                      </div>
                    </Td>
                    <Td>{row.month}</Td>
                    <Td className="text-xs">{row.feeHead ?? "—"}</Td>
                    <Td>{formatCurrency(row.baseAmount ?? row.amount)}</Td>
                    <Td>{formatCurrency(row.discount ?? 0)}</Td>
                    <Td>{formatCurrency(row.lateFee ?? 0)}</Td>
                    <Td className="font-medium">{formatCurrency(row.amount)}</Td>
                    <Td>{formatCurrency(row.paid)}</Td>
                    <Td className="font-semibold">{formatCurrency(balance)}</Td>
                    <Td>{formatDate(row.dueDate)}</Td>
                    <Td>
                      <Badge status={row.status}>{labelize(row.status)}</Badge>
                    </Td>
                    <Td>
                      <div className="flex gap-1">
                        {row.status !== "paid" && row.status !== "waived" ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setCollectOpen(row.id);
                                setCollectAmount(String(balance));
                                setCollectMsg("");
                              }}
                            >
                              Collect
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                if (confirm(`Waive challan for ${row.studentName}?`)) {
                                  waiveFee(row.id);
                                  setCollectMsg(`Waived challan for ${row.studentName}`);
                                }
                              }}
                            >
                              Waive
                            </Button>
                          </>
                        ) : null}
                        <Link href={`/challan/${row.id}`}>
                          <Button size="sm" variant="secondary">Print</Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2 text-rose-600"
                          onClick={() => {
                            if (confirm("Delete challan?")) deleteFee(row.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </Table>
          </Card>
        </>
      ) : (
        <Card>
          <Table headers={["Name", "Class", "Amount", "Frequency", dict.common.actions]}>
            {data.feeStructures.map((s) => (
              <tr key={s.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td className="font-medium">{s.name}</Td>
                <Td>{s.className}</Td>
                <Td>{formatCurrency(s.amount)}</Td>
                <Td>{labelize(s.frequency)}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setFromStructure(true);
                        setForm({
                          studentId: data.students[0]?.id ?? "",
                          structureId: s.id,
                          month: new Date().toLocaleString("en-PK", {
                            month: "long",
                            year: "numeric",
                          }),
                          amount: String(s.amount),
                          discount: "0",
                          feeHead: s.name,
                          dueDate: new Date(Date.now() + 7 * 86400000)
                            .toISOString()
                            .slice(0, 10),
                        });
                        setOpen(true);
                      }}
                    >
                      Generate challan
                    </Button>
                    <Button variant="ghost" size="sm" className="px-2" onClick={() => openStructureEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 text-rose-600"
                      onClick={() => {
                        if (confirm("Delete fee structure?")) deleteFeeStructure(s.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={fromStructure ? "Generate challan from structure" : "Generate fee challan"}
        wide
      >
        <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <SelectField
              label="Student"
              value={form.studentId}
              onChange={(v) => setForm({ ...form, studentId: v })}
              required
            >
              {data.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.admissionNo})
                </option>
              ))}
            </SelectField>
          </div>
          {fromStructure ? (
            <div className="sm:col-span-2">
              <SelectField
                label="Fee structure"
                value={form.structureId}
                onChange={(v) => {
                  const st = data.feeStructures.find((x) => x.id === v);
                  setForm({
                    ...form,
                    structureId: v,
                    amount: String(st?.amount ?? form.amount),
                  });
                }}
                required
              >
                {data.feeStructures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.className} ({formatCurrency(s.amount)})
                  </option>
                ))}
              </SelectField>
              {selectedStructure ? (
                <p className="mt-1 text-xs text-[var(--ims-text-muted)]">
                  Base amount locked from structure: {formatCurrency(selectedStructure.amount)} ·{" "}
                  {labelize(selectedStructure.frequency)}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <Input
                label="Base amount (PKR)"
                type="number"
                required
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              <Input
                label="Fee head"
                value={form.feeHead}
                onChange={(e) => setForm({ ...form, feeHead: e.target.value })}
                placeholder="Tuition / Transport / Hostel…"
              />
            </>
          )}
          <Input
            label="Month / period"
            required
            value={form.month}
            onChange={(e) => setForm({ ...form, month: e.target.value })}
          />
          <Input
            label="Due date"
            type="date"
            required
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <Input
            label="Discount (PKR)"
            type="number"
            min={0}
            value={form.discount}
            onChange={(e) => setForm({ ...form, discount: e.target.value })}
          />
          <p className="sm:col-span-2 text-xs text-[var(--ims-text-muted)]">
            Late fee auto-applies after due date: Rs 200 flat + Rs 50/day (max Rs 2,000).
            Net payable = Base − Discount + Late fee.
          </p>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create challan</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={structureOpen}
        onClose={() => setStructureOpen(false)}
        title={editingStructure ? "Edit fee structure" : "Add fee structure"}
      >
        <form onSubmit={onStructureSubmit} className="space-y-3">
          <Input
            label="Name"
            required
            value={structureForm.name}
            onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
          />
          <Input
            label="Class"
            required
            value={structureForm.className}
            onChange={(e) => setStructureForm({ ...structureForm, className: e.target.value })}
          />
          <Input
            label="Amount (PKR)"
            type="number"
            required
            min={0}
            value={structureForm.amount}
            onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })}
          />
          <SelectField
            label="Frequency"
            value={structureForm.frequency}
            onChange={(v) =>
              setStructureForm({ ...structureForm, frequency: v as FeeFrequency })
            }
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
            <option value="one_time">One time</option>
          </SelectField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setStructureOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingStructure ? "Save" : "Add structure"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!collectOpen}
        onClose={() => setCollectOpen(null)}
        title="Collect fee payment"
      >
        <form onSubmit={onCollect} className="space-y-3">
          {selected ? (
            <div className="rounded-md bg-[var(--ims-muted)]/50 p-3 text-xs text-[var(--ims-text-muted)]">
              <p>Net due: {formatCurrency(selected.amount)}</p>
              <p>Already paid: {formatCurrency(selected.paid)}</p>
              <p className="font-medium text-[var(--ims-text)]">
                Balance: {formatCurrency(computeFeeBalance(selected.amount, selected.paid))}
              </p>
            </div>
          ) : null}
          <Input
            label="Amount received (PKR)"
            type="number"
            required
            min={1}
            value={collectAmount}
            onChange={(e) => setCollectAmount(e.target.value)}
          />
          <SelectField
            label="Payment mode"
            value={collectMode}
            onChange={(v) => setCollectMode(v as "cash" | "bank" | "cheque")}
          >
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="cheque">Cheque</option>
          </SelectField>
          <p className="text-xs text-[var(--ims-text-muted)]">
            Excess payment is not added beyond net due (change returned).
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCollectOpen(null)}>
              Cancel
            </Button>
            <Button type="submit">Record payment</Button>
          </div>
        </form>
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk generate month challans">
        <form onSubmit={onBulkGenerate} className="space-y-3">
          <SelectField
            label="Fee structure (class)"
            value={bulkForm.structureId}
            onChange={(v) => setBulkForm({ ...bulkForm, structureId: v })}
            required
          >
            {data.feeStructures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.className} ({formatCurrency(s.amount)})
              </option>
            ))}
          </SelectField>
          <Input
            label="Month / period"
            required
            value={bulkForm.month}
            onChange={(e) => setBulkForm({ ...bulkForm, month: e.target.value })}
          />
          <Input
            label="Due date"
            type="date"
            required
            value={bulkForm.dueDate}
            onChange={(e) => setBulkForm({ ...bulkForm, dueDate: e.target.value })}
          />
          <Input
            label="Discount per student (PKR)"
            type="number"
            min={0}
            value={bulkForm.discount}
            onChange={(e) => setBulkForm({ ...bulkForm, discount: e.target.value })}
          />
          <p className="text-xs text-[var(--ims-text-muted)]">
            Creates one challan per active student in the structure class. Skips students who
            already have the same month + fee head.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setBulkOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Generate for class</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
