"use client";

import { useParams, useRouter } from "next/navigation";
import { useData } from "@/components/providers/DataProvider";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import { getCountryPack } from "@/lib/config/countries";

export default function PayslipPrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = useData();
  const row = data.payroll.find((p) => p.id === params.id);
  const staff = row ? data.staff.find((s) => s.id === row.staffId) : null;
  const institute = data.institute;
  const country = getCountryPack(institute.countryCode);

  if (!row) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-[var(--ims-text-muted)]">Payslip not found</p>
        <Button onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const tax = row.taxDeduction ?? 0;
  const leaveDed = row.leaveDeduction ?? 0;
  const otherDed = Math.max(0, row.deductions - tax - leaveDed);

  return (
    <div className="min-h-screen bg-[var(--ims-bg)] p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end gap-2 print:hidden">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
        <Button onClick={() => window.print()}>Print payslip</Button>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg border border-[var(--ims-border)] bg-white p-6 shadow-sm print:border-0 print:shadow-none sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-[var(--ims-border)] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ims-primary)]">
              Salary Payslip
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
              {institute.name}
            </h1>
            <p className="mt-1 text-xs text-[var(--ims-text-muted)]">
              {institute.address} · {institute.phone}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">Payslip #: {row.id.toUpperCase()}</p>
            <p className="text-[var(--ims-text-muted)]">{row.month}</p>
            <p className="mt-1 capitalize text-[var(--ims-text-muted)]">
              Status: {labelize(row.status)}
            </p>
            {row.paidOn ? (
              <p className="text-[var(--ims-text-muted)]">Paid: {formatDate(row.paidOn)}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-[var(--ims-muted)]/50 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--ims-text-muted)]">Employee</p>
            <p className="mt-1 font-semibold">{row.staffName}</p>
            {staff ? (
              <>
                <p className="mt-1">Emp #: {staff.employeeNo}</p>
                <p className="mt-1">
                  {staff.role} · {staff.department}
                </p>
                <p className="mt-1">CNIC: {staff.cnic ?? "—"}</p>
              </>
            ) : null}
          </div>
          <div className="rounded-md bg-[var(--ims-muted)]/50 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--ims-text-muted)]">
              Bank / payout
            </p>
            <p className="mt-1 font-semibold">{staff?.bankTitle ?? row.staffName}</p>
            <p className="mt-1">Bank: {staff?.bankName ?? "—"}</p>
            <p className="mt-1">Account: {staff?.bankAccount ?? "—"}</p>
            <p className="mt-1">Currency: {country.currency}</p>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--ims-border)] text-left">
              <th className="py-2">Earnings / deductions</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--ims-border)]/60">
              <td className="py-2">Basic salary</td>
              <td className="py-2 text-right">{formatCurrency(row.basic)}</td>
            </tr>
            <tr className="border-b border-[var(--ims-border)]/60">
              <td className="py-2">Allowances</td>
              <td className="py-2 text-right">{formatCurrency(row.allowances)}</td>
            </tr>
            {tax > 0 ? (
              <tr className="border-b border-[var(--ims-border)]/60">
                <td className="py-2">Tax deduction (5%)</td>
                <td className="py-2 text-right text-rose-700">−{formatCurrency(tax)}</td>
              </tr>
            ) : null}
            {leaveDed > 0 ? (
              <tr className="border-b border-[var(--ims-border)]/60">
                <td className="py-2">
                  Unpaid leave ({row.leaveDays ?? 0} day
                  {(row.leaveDays ?? 0) === 1 ? "" : "s"} × basic/30)
                </td>
                <td className="py-2 text-right text-rose-700">−{formatCurrency(leaveDed)}</td>
              </tr>
            ) : null}
            {otherDed > 0 ? (
              <tr className="border-b border-[var(--ims-border)]/60">
                <td className="py-2">Other deductions</td>
                <td className="py-2 text-right text-rose-700">−{formatCurrency(otherDed)}</td>
              </tr>
            ) : null}
            <tr>
              <td className="py-3 font-semibold">Net payable</td>
              <td className="py-3 text-right text-lg font-semibold">
                {formatCurrency(row.net)}
              </td>
            </tr>
          </tbody>
        </table>

        {row.remarks ? (
          <p className="mt-4 text-xs text-[var(--ims-text-muted)]">Remarks: {row.remarks}</p>
        ) : null}
        {row.voucherId ? (
          <p className="mt-1 text-xs text-[var(--ims-text-muted)]">
            Voucher: {row.voucherId}
          </p>
        ) : null}

        <div className="mt-10 grid grid-cols-2 gap-8 text-xs text-[var(--ims-text-muted)]">
          <div>
            <div className="mb-8 border-b border-[var(--ims-border)]" />
            Employee signature
          </div>
          <div>
            <div className="mb-8 border-b border-[var(--ims-border)]" />
            Accounts / HR
          </div>
        </div>
      </div>
    </div>
  );
}
