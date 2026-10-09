"use client";

import { useParams, useRouter } from "next/navigation";
import { useData } from "@/components/providers/DataProvider";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import { getCountryPack } from "@/lib/config/countries";

export default function ChallanPrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = useData();
  const fee = data.fees.find((f) => f.id === params.id);
  const student = fee ? data.students.find((s) => s.id === fee.studentId) : null;
  const institute = data.institute;
  const country = getCountryPack(institute.countryCode);

  if (!fee) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-[var(--ims-text-muted)]">Challan not found</p>
        <Button onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const balance = Math.max(0, fee.amount - fee.paid);
  const base = fee.baseAmount ?? fee.amount;
  const discount = fee.discount ?? 0;
  const lateFee = fee.lateFee ?? 0;

  return (
    <div className="min-h-screen bg-[var(--ims-bg)] p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end gap-2 print:hidden">
        <Button variant="secondary" onClick={() => router.back()}>Back</Button>
        <Button onClick={() => window.print()}>Print challan</Button>
      </div>

      <div className="mx-auto max-w-3xl rounded-lg border border-[var(--ims-border)] bg-white p-6 shadow-sm print:border-0 print:shadow-none sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-dashed border-[var(--ims-border)] pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ims-primary)]">IMS Fee Challan</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">{institute.name}</h1>
            <p className="mt-1 text-xs text-[var(--ims-text-muted)]">
              {institute.address} · {institute.phone}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">Challan #: {fee.id.toUpperCase()}</p>
            <p className="text-[var(--ims-text-muted)]">Academic Year {institute.academicYear}</p>
            <p className="mt-1 capitalize text-[var(--ims-text-muted)]">Status: {labelize(fee.status)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-[var(--ims-muted)]/50 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--ims-text-muted)]">Student</p>
            <p className="mt-1 font-semibold">{fee.studentName}</p>
            <p className="mt-1 text-[var(--ims-text-muted)]">{fee.className}</p>
            {student ? (
              <>
                <p className="mt-1">Admission: {student.admissionNo}</p>
                <p className="mt-1">Guardian: {student.guardians[0]?.name}</p>
                <p className="mt-1">Phone: {student.guardians[0]?.phone}</p>
              </>
            ) : null}
          </div>
          <div className="rounded-md bg-[var(--ims-muted)]/50 p-4 text-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--ims-text-muted)]">Payment period</p>
            <p className="mt-1 font-semibold">{fee.month}</p>
            <p className="mt-1">Due date: {formatDate(fee.dueDate)}</p>
            <p className="mt-1">Currency: {country.currency}</p>
            <p className="mt-1">Bank deposit / campus cash desk</p>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--ims-border)] text-left">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount ({country.currencySymbol})</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--ims-border)]">
              <td className="py-3">{fee.feeHead ?? "Tuition / monthly fee"} — {fee.month}</td>
              <td className="py-3 text-right">{formatCurrency(base, country.currencySymbol)}</td>
            </tr>
            {discount > 0 ? (
              <tr className="border-b border-[var(--ims-border)]">
                <td className="py-3">Discount</td>
                <td className="py-3 text-right">− {formatCurrency(discount, country.currencySymbol)}</td>
              </tr>
            ) : null}
            {lateFee > 0 ? (
              <tr className="border-b border-[var(--ims-border)]">
                <td className="py-3">Late fee</td>
                <td className="py-3 text-right">{formatCurrency(lateFee, country.currencySymbol)}</td>
              </tr>
            ) : null}
            <tr className="border-b border-[var(--ims-border)]">
              <td className="py-3 font-medium">Net payable</td>
              <td className="py-3 text-right font-medium">{formatCurrency(fee.amount, country.currencySymbol)}</td>
            </tr>
            <tr className="border-b border-[var(--ims-border)]">
              <td className="py-3">Amount paid</td>
              <td className="py-3 text-right">{formatCurrency(fee.paid, country.currencySymbol)}</td>
            </tr>
            <tr>
              <td className="py-3 font-semibold">Balance due</td>
              <td className="py-3 text-right font-semibold">{formatCurrency(balance, country.currencySymbol)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {["Bank copy", "Institute copy", "Parent copy"].map((copy) => (
            <div key={copy} className="border-t border-dashed border-[var(--ims-border)] pt-6 text-center text-xs text-[var(--ims-text-muted)]">
              <div className="mx-auto mb-8 h-10 w-28 border-b border-[var(--ims-border)]" />
              {copy} signature
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] text-[var(--ims-text-subtle)]">
          Generated by IMS · Please pay before due date to avoid late fee · {institute.email}
        </p>
      </div>
    </div>
  );
}
