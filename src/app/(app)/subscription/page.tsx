"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import type { PlatformInvoice, PlatformPlan, SchoolTenant } from "@/types/platform";

type BillingBundle = {
  school: SchoolTenant;
  plan: PlatformPlan | null;
  invoices: PlatformInvoice[];
};

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--ims-text-muted)]">Loading billing…</p>}>
      <SubscriptionInner />
    </Suspense>
  );
}

function SubscriptionInner() {
  const searchParams = useSearchParams();
  const [bundle, setBundle] = useState<BillingBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const stripeHandled = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/school/billing", { credentials: "include", cache: "no-store" });
      const json = (await res.json()) as BillingBundle & { error?: string };
      if (!res.ok) {
        setMsg(json.error ?? "Failed to load billing");
        setBundle(null);
      } else {
        setBundle(json);
      }
    } catch {
      setMsg("Network error loading billing");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Return from Stripe Checkout / sandbox
  useEffect(() => {
    if (stripeHandled.current) return;
    const gw = searchParams.get("gateway");
    if (gw !== "stripe") return;

    const cancelled = searchParams.get("cancelled");
    if (cancelled === "1") {
      setMsg("Stripe payment cancelled.");
      return;
    }

    const invoiceId = searchParams.get("invoiceId");
    const sessionId = searchParams.get("session_id");
    const sandbox = searchParams.get("sandbox") === "1";
    if (!invoiceId) return;
    if (!sandbox && !sessionId) return;

    stripeHandled.current = true;
    void (async () => {
      setBusyId(invoiceId);
      try {
        const confirmRes = await fetch("/api/school/billing/confirm", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId,
            sessionId: sessionId ?? undefined,
            sandbox,
            txnRef: searchParams.get("txnRef") ?? undefined,
          }),
        });
        const confirmed = (await confirmRes.json()) as {
          ok?: boolean;
          error?: string;
          txnRef?: string;
          message?: string;
        };
        if (!confirmRes.ok || !confirmed.ok) {
          setMsg(confirmed.error ?? "Plan payment confirmation failed");
        } else {
          setMsg(
            confirmed.message ??
              `Plan paid${confirmed.txnRef ? ` · Ref ${confirmed.txnRef}` : ""}`,
          );
          window.history.replaceState({}, "", "/subscription");
          await load();
        }
      } catch {
        setMsg("Network error confirming plan payment");
      }
      setBusyId(null);
    })();
  }, [searchParams, load]);

  async function payInvoice(invoiceId: string) {
    setBusyId(invoiceId);
    setMsg("");
    try {
      const initRes = await fetch("/api/school/billing/pay", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const init = (await initRes.json()) as {
        ok?: boolean;
        sandbox?: boolean;
        txnRef?: string;
        redirectUrl?: string;
        error?: string;
      };
      if (!initRes.ok || !init.ok) {
        setMsg(init.error ?? "Could not start Stripe payment");
        setBusyId(null);
        return;
      }

      if (init.redirectUrl?.startsWith("http") && !init.sandbox) {
        window.location.href = init.redirectUrl;
        return;
      }

      // Sandbox — confirm in-app
      const confirmRes = await fetch("/api/school/billing/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          sandbox: true,
          txnRef: init.txnRef,
        }),
      });
      const confirmed = (await confirmRes.json()) as { ok?: boolean; error?: string; message?: string };
      if (!confirmRes.ok || !confirmed.ok) {
        setMsg(confirmed.error ?? "Sandbox confirm failed");
      } else {
        setMsg(confirmed.message ?? "Sandbox plan payment recorded");
        await load();
      }
    } catch {
      setMsg("Network error during plan payment");
    }
    setBusyId(null);
  }

  const openInvoices =
    bundle?.invoices.filter((i) => i.status === "due" || i.status === "overdue") ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Plan & billing"
        subtitle="Pay your IMS Cloud subscription with Stripe"
        actions={
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {msg ? <p className="text-sm text-emerald-700 break-words">{msg}</p> : null}

      {loading && !bundle ? (
        <p className="text-sm text-[var(--ims-text-muted)]">Loading…</p>
      ) : !bundle ? (
        <Card className="p-6 text-sm text-[var(--ims-text-muted)]">
          No platform billing record for this school. Contact Super Admin.
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Plan" value={bundle.plan?.name ?? "—"} />
            <StatCard
              label="Billing cycle"
              value={labelize(bundle.school.billingCycle)}
            />
            <StatCard
              label="Subscription ends"
              value={
                bundle.school.subscriptionEndsAt
                  ? formatDate(bundle.school.subscriptionEndsAt)
                  : "—"
              }
            />
            <StatCard
              label="Open invoices"
              value={openInvoices.length}
              tone={openInvoices.length ? "warning" : "success"}
            />
          </div>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-[var(--ims-text)]">Current plan</h2>
            <p className="mt-1 text-sm text-[var(--ims-text-muted)]">
              {bundle.plan
                ? `${bundle.plan.name} · ${formatCurrency(
                    bundle.school.billingCycle === "yearly"
                      ? bundle.plan.priceYearly
                      : bundle.plan.priceMonthly,
                  )} / ${bundle.school.billingCycle === "yearly" ? "year" : "month"}`
                : "No plan assigned"}
            </p>
            <p className="mt-2 text-xs text-[var(--ims-text-muted)]">
              Status: <Badge status={bundle.school.status}>{labelize(bundle.school.status)}</Badge>
              {" · "}
              Pay open invoices with Stripe — money goes to the platform (IMS) account.
            </p>
          </Card>

          <Card className="overflow-x-auto">
            <div className="border-b border-[var(--ims-border)] px-4 py-3">
              <h2 className="text-sm font-semibold">Invoices</h2>
            </div>
            <Table headers={["Invoice", "Plan", "Amount", "Period", "Due", "Status", "Pay"]}>
              {bundle.invoices.map((inv) => {
                const canPay = inv.status === "due" || inv.status === "overdue";
                return (
                  <tr key={inv.id}>
                    <Td className="font-medium">{inv.id}</Td>
                    <Td>{inv.planName}</Td>
                    <Td>{formatCurrency(inv.amount)}</Td>
                    <Td>{inv.period}</Td>
                    <Td>{formatDate(inv.dueAt)}</Td>
                    <Td>
                      <Badge status={inv.status}>{labelize(inv.status)}</Badge>
                    </Td>
                    <Td>
                      {canPay ? (
                        <Button
                          size="sm"
                          disabled={busyId === inv.id}
                          onClick={() => void payInvoice(inv.id)}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          {busyId === inv.id ? "Processing…" : "Pay with Stripe"}
                        </Button>
                      ) : (
                        <span className="text-xs text-[var(--ims-text-muted)]">
                          {inv.paidAt ? `Paid ${formatDate(inv.paidAt)}` : labelize(inv.status)}
                        </span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
            {!bundle.invoices.length ? (
              <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
                No invoices yet. Super Admin can issue one from Billing.
              </p>
            ) : null}
          </Card>
        </>
      )}
    </div>
  );
}
