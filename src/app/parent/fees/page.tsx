"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { PortalShell, PARENT_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { useParentChild } from "@/components/providers/ParentChildProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { Modal, SelectField } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";
import { useLocale } from "@/components/providers/LocaleProvider";
import { t } from "@/lib/i18n";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import type { OnlineGateway } from "@/types";

export default function ParentFeesPage() {
  return (
    <Suspense fallback={<ParentFeesFallback />}>
      <ParentFeesInner />
    </Suspense>
  );
}

function ParentFeesFallback() {
  return (
    <PortalShell title="Parent Portal" subtitle="Your child's progress" nav={PARENT_NAV} accent="accent">
      <p className="text-sm text-[var(--ims-text-muted)]">Loading fees…</p>
    </PortalShell>
  );
}

function ParentFeesInner() {
  const { data, payFeeOnline } = useData();
  const { child } = useParentChild();
  const { dict } = useLocale();
  const searchParams = useSearchParams();
  const fees = data.fees.filter((f) => f.studentId === child?.id);
  const [payId, setPayId] = useState<string | null>(null);
  const [gateway, setGateway] = useState<OnlineGateway>("stripe");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const stripeHandled = useRef(false);

  const summary = useMemo(() => {
    const outstanding = fees.reduce((s, f) => s + Math.max(0, f.amount - f.paid), 0);
    const paid = fees.reduce((s, f) => s + f.paid, 0);
    const overdue = fees.filter((f) => f.status === "overdue").length;
    return { outstanding, paid, overdue, count: fees.length };
  }, [fees]);

  const open = fees.find((f) => f.id === payId);

  // Return from Stripe Checkout (live)
  useEffect(() => {
    if (stripeHandled.current) return;
    const gw = searchParams.get("gateway");
    const sessionId = searchParams.get("session_id");
    const feeId = searchParams.get("feeId");
    const cancelled = searchParams.get("cancelled");
    if (cancelled === "1" && gw === "stripe") {
      setMsg("Stripe payment cancelled.");
      return;
    }
    if (gw !== "stripe" || !sessionId || !feeId) return;
    stripeHandled.current = true;
    void (async () => {
      setBusy(true);
      try {
        const confirmRes = await fetch("/api/payments/confirm", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gateway: "stripe",
            sessionId,
            feeId,
            amount: Number(searchParams.get("amount") ?? "0"),
            txnRef: searchParams.get("txnRef") ?? undefined,
            sandbox: false,
          }),
        });
        const confirmed = (await confirmRes.json()) as {
          ok?: boolean;
          txnRef?: string;
          amount?: number;
          feeId?: string;
          error?: string;
        };
        if (!confirmRes.ok || !confirmed.ok || !confirmed.feeId || !confirmed.amount) {
          setMsg(confirmed.error ?? "Stripe confirmation failed");
          setBusy(false);
          return;
        }
        const res = payFeeOnline(confirmed.feeId, confirmed.amount, "stripe");
        if (res.ok) {
          setMsg(
            `Paid ${formatCurrency(res.applied ?? 0)} via Stripe. Ref: ${confirmed.txnRef ?? sessionId}`,
          );
          window.history.replaceState({}, "", "/parent/fees");
        } else {
          setMsg(res.error ?? "Ledger update failed after Stripe");
        }
      } catch {
        setMsg("Network error confirming Stripe payment");
      }
      setBusy(false);
    })();
  }, [searchParams, payFeeOnline]);

  async function confirmPay() {
    if (!payId) return;
    setBusy(true);
    setMsg("");
    try {
      const initRes = await fetch("/api/payments/initiate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeId: payId,
          amount: Number(amount),
          gateway,
        }),
      });
      const init = (await initRes.json()) as {
        ok?: boolean;
        txnRef?: string;
        sandbox?: boolean;
        message?: string;
        error?: string;
        redirectUrl?: string;
      };
      if (!initRes.ok || !init.ok || !init.txnRef) {
        setMsg(init.error ?? "Payment initiate failed");
        setBusy(false);
        return;
      }

      // Live Stripe → leave app for Checkout
      if (
        gateway === "stripe" &&
        init.redirectUrl &&
        !init.sandbox &&
        init.redirectUrl.startsWith("http")
      ) {
        window.location.href = init.redirectUrl;
        return;
      }

      // JazzCash / Easypaisa → manual instruction page (open wallet, then confirm)
      if (
        (gateway === "jazzcash" || gateway === "easypaisa") &&
        init.redirectUrl?.startsWith("/parent/fees/manual")
      ) {
        window.location.href = init.redirectUrl;
        return;
      }

      const confirmRes = await fetch("/api/payments/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway,
          txnRef: init.txnRef,
          feeId: payId,
          amount: Number(amount),
          sandbox: init.sandbox ?? true,
        }),
      });
      const confirmed = (await confirmRes.json()) as {
        ok?: boolean;
        txnRef?: string;
        error?: string;
      };
      if (!confirmRes.ok || !confirmed.ok) {
        setMsg(confirmed.error ?? "Payment confirm failed");
        setBusy(false);
        return;
      }

      const res = payFeeOnline(payId, Number(amount), gateway);
      if (res.ok) {
        setMsg(
          `Paid ${formatCurrency(res.applied ?? 0)} via ${gateway}${init.sandbox ? " (sandbox)" : ""}. Ref: ${init.txnRef}`,
        );
        setPayId(null);
        const guardian = child?.guardians?.[0];
        if (guardian?.phone || guardian?.email) {
          void fetch("/api/notify/send", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              channel: guardian.email ? "email" : "sms",
              to: guardian.email ?? guardian.phone,
              name: guardian.name,
              subject: `Fee receipt — ${open?.studentName}`,
              body: `Payment received for ${open?.studentName} (${open?.month}). Amount: ${formatCurrency(res.applied ?? 0)}. Ref: ${init.txnRef}`,
            }),
          });
        }
      } else {
        setMsg(res.error ?? "Ledger update failed");
      }
    } catch {
      setMsg("Network error during payment");
    }
    setBusy(false);
  }

  return (
    <PortalShell title="Parent Portal" subtitle="Your child's progress" nav={PARENT_NAV} accent="accent">
      <PageHeader
        title={t(dict, "portal.fees")}
        subtitle={t(dict, "portal.sandboxPay")}
        actions={<ChildSwitcher />}
      />
      <div className="mb-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label={t(dict, "portal.outstanding")} value={formatCurrency(summary.outstanding)} tone="warning" />
        <StatCard label="Paid to date" value={formatCurrency(summary.paid)} tone="success" />
        <StatCard label="Overdue challans" value={summary.overdue} tone="warning" />
        <StatCard label="Total challans" value={summary.count} />
      </div>
      {msg ? <p className="mb-3 text-sm text-emerald-700 break-words">{msg}</p> : null}
      <Card className="overflow-x-auto">
        <Table headers={["Month", "Amount", "Paid", "Balance", "Due", "Status", "Pay", "Challan"]}>
          {fees.map((f) => {
            const bal = Math.max(0, f.amount - f.paid);
            return (
              <tr key={f.id}>
                <Td className="font-medium">{f.month}</Td>
                <Td>{formatCurrency(f.amount)}</Td>
                <Td>{formatCurrency(f.paid)}</Td>
                <Td>{formatCurrency(bal)}</Td>
                <Td>{formatDate(f.dueDate)}</Td>
                <Td>
                  <Badge status={f.status}>{labelize(f.status)}</Badge>
                </Td>
                <Td>
                  {bal > 0 ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setPayId(f.id);
                        setAmount(String(bal));
                        setMsg("");
                      }}
                    >
                      {t(dict, "portal.payOnline")}
                    </Button>
                  ) : (
                    <span className="text-xs text-[var(--ims-text-muted)]">
                      {f.txnRef ? f.txnRef : f.paymentMode ?? "Paid"}
                    </span>
                  )}
                </Td>
                <Td>
                  <Link href={`/challan/${f.id}`}>
                    <Button size="sm" variant="secondary">
                      Print
                    </Button>
                  </Link>
                </Td>
              </tr>
            );
          })}
        </Table>
        {!fees.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">No fee challans</p>
        ) : null}
      </Card>

      <Modal open={!!payId} onClose={() => !busy && setPayId(null)} title={t(dict, "portal.payOnline")}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void confirmPay();
          }}
        >
          <p className="text-sm text-[var(--ims-text-muted)]">
            {open ? `${open.studentName} · ${open.month}` : ""}
          </p>
          <SelectField
            label="Gateway"
            value={gateway}
            onChange={(v) => setGateway(v as OnlineGateway)}
          >
            <option value="stripe">Stripe (Card)</option>
            <option value="jazzcash">JazzCash (manual)</option>
            <option value="easypaisa">Easypaisa (manual)</option>
            <option value="card">Demo card</option>
          </SelectField>
          <Input
            label="Amount (PKR)"
            type="number"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-[var(--ims-text-muted)]">
            {gateway === "stripe"
              ? "Stripe opens card checkout when keys are set."
              : gateway === "jazzcash" || gateway === "easypaisa"
                ? "Next page: open JazzCash / Easypaisa, pay manually, then confirm with TID."
                : t(dict, "portal.sandboxPay")}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setPayId(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy
                ? "Processing…"
                : gateway === "stripe"
                  ? "Pay with Stripe"
                  : gateway === "jazzcash" || gateway === "easypaisa"
                    ? "Continue to pay page"
                    : "Confirm payment"}
            </Button>
          </div>
        </form>
      </Modal>
    </PortalShell>
  );
}
