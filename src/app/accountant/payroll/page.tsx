"use client";

import { useMemo, useState } from "react";
import { PortalShell, ACCOUNTANT_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";

export default function AccountantPayrollPage() {
  const { data, generatePayroll, payPayroll, payAllPayrollForMonth } = useData();
  const [month, setMonth] = useState("October 2026");
  const [msg, setMsg] = useState("");

  const rows = useMemo(
    () => data.payroll.filter((p) => p.month === month),
    [data.payroll, month],
  );
  const net = rows.reduce((s, p) => s + p.net, 0);
  const pending = rows.filter((p) => p.status !== "paid").length;

  return (
    <PortalShell title="Accounts Portal" subtitle="Fee & finance desk" nav={ACCOUNTANT_NAV}>
      <PageHeader
        title="Payroll / Salaries"
        subtitle="Generate, pay and post salary vouchers"
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const n = generatePayroll(month, true);
                setMsg(n ? `Generated ${n} line(s).` : "Already generated for active staff.");
              }}
            >
              Generate
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const n = payAllPayrollForMonth(month);
                setMsg(n ? `Paid ${n} — vouchers posted.` : "Nothing pending.");
              }}
            >
              Pay all & post
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Lines" value={String(rows.length)} />
        <StatCard label="Net payroll" value={formatCurrency(net)} />
        <StatCard label="Pending pay" value={String(pending)} tone="warning" />
      </div>

      <Card className="mb-4 p-4">
        <Input label="Month label" value={month} onChange={(e) => { setMonth(e.target.value); setMsg(""); }} />
        {msg ? <p className="mt-2 text-sm text-emerald-700">{msg}</p> : null}
      </Card>

      <Card>
        <Table headers={["Staff", "Month", "Basic", "Allowances", "Deductions", "Net", "Status", ""]}>
          {data.payroll.map((row) => (
            <tr key={row.id}>
              <Td className="font-medium">{row.staffName}</Td>
              <Td>{row.month}</Td>
              <Td>{formatCurrency(row.basic)}</Td>
              <Td>{formatCurrency(row.allowances)}</Td>
              <Td>{formatCurrency(row.deductions)}</Td>
              <Td className="font-semibold">{formatCurrency(row.net)}</Td>
              <Td>
                <Badge status={row.status === "paid" ? "paid" : "pending"}>{labelize(row.status)}</Badge>
              </Td>
              <Td>
                {row.status !== "paid" ? (
                  <Button size="sm" onClick={() => payPayroll(row.id)}>Pay & post</Button>
                ) : (
                  <span className="text-xs text-[var(--ims-text-muted)]">
                    {row.paidOn ? formatDate(row.paidOn) : "Paid"}
                  </span>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </PortalShell>
  );
}
