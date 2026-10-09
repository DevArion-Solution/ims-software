"use client";

import { useMemo, useState } from "react";
import { CreditCard, CheckCircle2, RefreshCw, FilePlus } from "lucide-react";
import { usePlatform } from "@/components/providers/PlatformProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Td } from "@/components/ui/Table";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function BillingPage() {
  const { data, stats, markInvoicePaid, issueInvoice, runBillingSweep } = usePlatform();
  const [status, setStatus] = useState("all");
  const [sweepMsg, setSweepMsg] = useState("");

  const rows = useMemo(() => {
    return data.invoices.filter((i) => status === "all" || i.status === status);
  }, [data.invoices, status]);

  function handleSweep() {
    const result = runBillingSweep();
    setSweepMsg(
      `Sweep complete: ${result.overdueMarked} marked overdue, ${result.suspended} suspended, ${result.trialsExpired} trials expired, ${result.renewalsIssued} renewal invoices issued.`,
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sa-gold)]">
            Commerce
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--sa-text)]">
            Billing & subscriptions
          </h1>
          <p className="mt-1 text-sm text-[var(--sa-muted)]">
            Issue invoices, run billing sweep, mark paid, restore suspended schools.
          </p>
        </div>
        <Button
          onClick={handleSweep}
          className="bg-[var(--sa-ink)] hover:bg-[var(--sa-ink-2)]"
        >
          <RefreshCw className="h-4 w-4" />
          Run billing sweep
        </Button>
      </div>

      {sweepMsg ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {sweepMsg}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--sa-border)] bg-[var(--sa-ink)] p-5 text-white shadow-[var(--sa-shadow)]">
          <p className="text-xs uppercase tracking-wide text-white/50">Platform MRR</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--sa-gold)]">
            {formatCurrency(stats.mrr)}
          </p>
          <p className="mt-1 text-xs text-white/45">ARR {formatCurrency(stats.arr)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
          <p className="text-xs uppercase tracking-wide text-[var(--sa-muted)]">Overdue invoices</p>
          <p className="mt-2 text-3xl font-semibold text-rose-600">{stats.overdueInvoices}</p>
          <p className="mt-1 text-xs text-[var(--sa-muted)]">Auto-suspend after 14 days overdue</p>
        </div>
        <div className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
          <p className="text-xs uppercase tracking-wide text-[var(--sa-muted)]">Paying schools</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--sa-text)]">{stats.activeSchools}</p>
          <p className="mt-1 text-xs text-[var(--sa-muted)]">Active billed tenants</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "due", "overdue", "paid"].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${
              status === key
                ? "bg-[var(--sa-ink)] text-white"
                : "bg-white text-[var(--sa-muted)] ring-1 ring-[var(--sa-border)]"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--sa-border)] bg-white shadow-[var(--sa-shadow)]">
        <Table headers={["Invoice", "School", "Plan", "Amount", "Period", "Due", "Status", ""]}>
          {rows.map((inv) => (
            <tr key={inv.id}>
              <Td className="font-medium">{inv.id}</Td>
              <Td>{inv.schoolName}</Td>
              <Td>{inv.planName}</Td>
              <Td>{formatCurrency(inv.amount)}</Td>
              <Td>{inv.period}</Td>
              <Td>{formatDate(inv.dueAt)}</Td>
              <Td>
                <Badge status={inv.status}>{inv.status}</Badge>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {inv.status !== "paid" && inv.status !== "void" ? (
                    <Button size="sm" onClick={() => markInvoicePaid(inv.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark paid
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--sa-muted)]">
                      <CreditCard className="h-3.5 w-3.5" />
                      Settled
                    </span>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </div>

      <div className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
        <h2 className="text-sm font-semibold text-[var(--sa-text)]">Issue renewal invoice</h2>
        <p className="mt-1 text-xs text-[var(--sa-muted)]">
          Manually issue an invoice for an active school (if no open invoice exists).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.schools
            .filter((s) => s.status === "active")
            .map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant="secondary"
                onClick={() => issueInvoice(s.id)}
              >
                <FilePlus className="h-3.5 w-3.5" />
                {s.shortName}
              </Button>
            ))}
        </div>
      </div>
    </div>
  );
}
