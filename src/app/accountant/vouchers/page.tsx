"use client";

import { FormEvent, useState } from "react";
import { PortalShell, ACCOUNTANT_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField, TextArea } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import type { AccountVoucher } from "@/types";

export default function AccountantVouchersPage() {
  const { data, addVoucher } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "receipt" as AccountVoucher["type"],
    account: "Student Fee Income",
    description: "",
    amount: "",
    campusId: data.institute.campuses[0]?.id ?? "camp1",
  });

  const receipts = data.vouchers.filter((v) => v.type === "receipt").reduce((s, v) => s + v.amount, 0);
  const payments = data.vouchers.filter((v) => v.type === "payment").reduce((s, v) => s + v.amount, 0);

  return (
    <PortalShell title="Accounts Portal" subtitle="Fee & finance desk" nav={ACCOUNTANT_NAV}>
      <PageHeader
        title="Vouchers"
        subtitle="Cash/bank receipts and payments"
        actions={<Button size="sm" onClick={() => setOpen(true)}>New voucher</Button>}
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Receipts" value={formatCurrency(receipts)} tone="success" />
        <StatCard label="Payments" value={formatCurrency(payments)} tone="warning" />
        <StatCard label="Net" value={formatCurrency(receipts - payments)} />
      </div>
      <Card>
        <Table headers={["No.", "Date", "Type", "Account", "Description", "Amount"]}>
          {data.vouchers.map((v) => (
            <tr key={v.id}>
              <Td className="font-medium text-[var(--ims-primary)]">{v.voucherNo}</Td>
              <Td>{formatDate(v.date)}</Td>
              <Td><Badge status={v.type === "receipt" ? "paid" : "pending"}>{labelize(v.type)}</Badge></Td>
              <Td>{v.account}</Td>
              <Td>{v.description}</Td>
              <Td>{formatCurrency(v.amount)}</Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New voucher">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            addVoucher({
              date: form.date,
              type: form.type,
              account: form.account,
              description: form.description,
              amount: Number(form.amount),
              campusId: form.campusId,
            });
            setOpen(false);
          }}
        >
          <SelectField label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v as AccountVoucher["type"] })}>
            <option value="receipt">Receipt</option>
            <option value="payment">Payment</option>
          </SelectField>
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input label="Account" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} />
          <TextArea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <Input label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </PortalShell>
  );
}
