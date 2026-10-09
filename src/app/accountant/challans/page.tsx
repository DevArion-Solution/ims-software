"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { PortalShell, ACCOUNTANT_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField } from "@/components/ui/Modal";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";

export default function AccountantChallansPage() {
  const { data, addFee, collectFee } = useData();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [collectId, setCollectId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [form, setForm] = useState({
    studentId: data.students[0]?.id ?? "",
    month: new Date().toLocaleString("en-PK", { month: "long", year: "numeric" }),
    amount: "15000",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    feeHead: "Monthly Tuition",
  });

  const rows = useMemo(() => {
    return data.fees.filter((f) => {
      const matchS = status === "all" || f.status === status;
      const hay = `${f.studentName} ${f.month} ${f.id}`.toLowerCase();
      return matchS && (!q || hay.includes(q.toLowerCase()));
    });
  }, [data.fees, status, q]);

  function createChallan(e: FormEvent) {
    e.preventDefault();
    const student = data.students.find((s) => s.id === form.studentId);
    if (!student) return;
    addFee({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      className: `${student.className}-${student.section}`,
      month: form.month,
      amount: Number(form.amount),
      dueDate: form.dueDate,
      feeHead: form.feeHead,
    });
    setOpen(false);
  }

  return (
    <PortalShell title="Accounts Portal" subtitle="Fee & finance desk" nav={ACCOUNTANT_NAV}>
      <PageHeader
        title="Fee Challans"
        subtitle="Create, collect, and print challans"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            New challan
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search student / month…"
          className="max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3 text-sm"
        >
          <option value="all">All</option>
          {["pending", "partial", "paid", "overdue"].map((s) => (
            <option key={s} value={s}>
              {labelize(s)}
            </option>
          ))}
        </select>
      </div>
      <Card>
        <Table
          headers={["Challan", "Student", "Class", "Month", "Amount", "Due", "Status", ""]}
        >
          {rows.map((f) => (
            <tr key={f.id}>
              <Td className="font-medium text-[var(--ims-primary)]">{f.id.toUpperCase()}</Td>
              <Td>{f.studentName}</Td>
              <Td>{f.className}</Td>
              <Td>{f.month}</Td>
              <Td>{formatCurrency(f.amount)}</Td>
              <Td>{formatDate(f.dueDate)}</Td>
              <Td>
                <Badge status={f.status}>{labelize(f.status)}</Badge>
              </Td>
              <Td>
                <div className="flex gap-1">
                  {f.status !== "paid" ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setCollectId(f.id);
                        setAmount(String(Math.max(0, f.amount - f.paid)));
                      }}
                    >
                      Collect
                    </Button>
                  ) : null}
                  <Link href={`/challan/${f.id}`}>
                    <Button size="sm" variant="secondary">
                      Print
                    </Button>
                  </Link>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Create challan">
        <form className="space-y-3" onSubmit={createChallan}>
          <SelectField
            label="Student"
            value={form.studentId}
            onChange={(v) => setForm({ ...form, studentId: v })}
          >
            {data.students
              .filter((s) => s.status === "active")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
          </SelectField>
          <Input
            label="Month / period"
            value={form.month}
            onChange={(e) => setForm({ ...form, month: e.target.value })}
          />
          <Input
            label="Fee head"
            value={form.feeHead}
            onChange={(e) => setForm({ ...form, feeHead: e.target.value })}
          />
          <Input
            label="Amount"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <Input
            label="Due date"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!collectId} onClose={() => setCollectId(null)} title="Collect against challan">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!collectId) return;
            collectFee(collectId, Number(amount));
            setCollectId(null);
          }}
        >
          <Input
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCollectId(null)}>
              Cancel
            </Button>
            <Button type="submit">Collect</Button>
          </div>
        </form>
      </Modal>
    </PortalShell>
  );
}
