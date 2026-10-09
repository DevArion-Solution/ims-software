"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ExternalLink, Smartphone } from "lucide-react";
import { PortalShell, PARENT_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { useParentChild } from "@/components/providers/ParentChildProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import type { OnlineGateway } from "@/types";

export default function ManualPayPage() {
  return (
    <Suspense
      fallback={
        <PortalShell title="Parent Portal" subtitle="Pay fee" nav={PARENT_NAV} accent="accent">
          <p className="text-sm text-[var(--ims-text-muted)]">Loading…</p>
        </PortalShell>
      }
    >
      <ManualPayInner />
    </Suspense>
  );
}

function ManualPayInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, payFeeOnline } = useData();
  const { child } = useParentChild();

  const gateway = (searchParams.get("gateway") ?? "jazzcash") as OnlineGateway;
  const feeId = searchParams.get("feeId") ?? "";
  const amount = Number(searchParams.get("amount") ?? "0");
  const txnRef = searchParams.get("txnRef") ?? "";
  const studentParam = searchParams.get("student") ?? "";
  const monthParam = searchParams.get("month") ?? "";

  const fee = data.fees.find((f) => f.id === feeId);
  const studentName = studentParam || fee?.studentName || child?.firstName || "Student";
  const month = monthParam || fee?.month || "";

  const [tid, setTid] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const isJazz = gateway === "jazzcash";
  const title = isJazz ? "JazzCash — manual pay" : "Easypaisa — manual pay";
  const appName = isJazz ? "JazzCash" : "Easypaisa";

  /** Deep / store links — open app or Play Store */
  const openAppHref = useMemo(() => {
    if (isJazz) {
      return "https://www.jazzcash.com.pk/";
    }
    return "https://easypaisa.com.pk/";
  }, [isJazz]);

  async function confirmPaid() {
    if (!feeId || amount <= 0) {
      setMsg("Invalid fee details — go back and try again");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const ref = tid.trim() ? `${txnRef || "MAN"}-${tid.trim()}` : txnRef || `MAN-${Date.now()}`;
      const confirmRes = await fetch("/api/payments/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway,
          txnRef: ref,
          feeId,
          amount,
          sandbox: true,
        }),
      });
      const confirmed = (await confirmRes.json()) as {
        ok?: boolean;
        error?: string;
        txnRef?: string;
      };
      if (!confirmRes.ok || !confirmed.ok) {
        setMsg(confirmed.error ?? "Confirm failed");
        setBusy(false);
        return;
      }
      const res = payFeeOnline(feeId, amount, gateway);
      if (res.ok) {
        setMsg(`Paid ${formatCurrency(res.applied ?? 0)} via ${appName}. Ref: ${confirmed.txnRef ?? ref}`);
        setTimeout(() => router.push("/parent/fees"), 1200);
      } else {
        setMsg(res.error ?? "Ledger update failed");
      }
    } catch {
      setMsg("Network error");
    }
    setBusy(false);
  }

  return (
    <PortalShell title="Parent Portal" subtitle="Manual wallet payment" nav={PARENT_NAV} accent="accent">
      <PageHeader
        title={title}
        subtitle="Pay in the wallet app, then confirm here"
        actions={
          <Link href="/parent/fees">
            <Button size="sm" variant="secondary">
              Back to fees
            </Button>
          </Link>
        }
      />

      <Card className="mb-4 space-y-2 p-5">
        <p className="text-sm">
          <span className="text-[var(--ims-text-muted)]">Student: </span>
          <strong>{studentName}</strong>
        </p>
        <p className="text-sm">
          <span className="text-[var(--ims-text-muted)]">Month: </span>
          {month || "—"}
        </p>
        <p className="text-2xl font-semibold">{formatCurrency(amount)}</p>
        <p className="text-xs text-[var(--ims-text-muted)]">Order ref: {txnRef || "—"}</p>
      </Card>

      <Card className="mb-4 space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Smartphone className="h-4 w-4" />
          Steps (manual)
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>
            Neeche button se <strong>{appName}</strong> website / app open karein
          </li>
          <li>
            School ko transfer karein:{" "}
            <strong>{formatCurrency(amount)}</strong>
            {data.institute.phone ? (
              <>
                {" "}
                · School contact: <strong>{data.institute.phone}</strong>
              </>
            ) : null}
          </li>
          <li>
            Account / number school office se confirm karein (ya school ne notice board pe diya ho)
          </li>
          <li>
            Payment ke baad <strong>TID / Transaction ID</strong> yahan likhein
          </li>
          <li>
            <strong>I have paid — Confirm</strong> dabayein
          </li>
        </ol>

        <a
          href={openAppHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex"
        >
          <Button type="button" size="sm">
            <ExternalLink className="h-4 w-4" />
            Open {appName}
          </Button>
        </a>

        <p className="rounded-md border border-[var(--ims-border)] bg-[var(--ims-muted)]/40 px-3 py-2 text-xs text-[var(--ims-text-muted)]">
          School: {data.institute.name}
          {data.institute.email ? ` · ${data.institute.email}` : ""}
          {data.institute.phone ? ` · ${data.institute.phone}` : ""}
        </p>
      </Card>

      <Card className="space-y-3 p-5">
        <Input
          label={`${appName} TID / Transaction ID (optional but recommended)`}
          placeholder="e.g. 1234567890"
          value={tid}
          onChange={(e) => setTid(e.target.value)}
        />
        {msg ? (
          <p
            className={`text-sm break-words ${
              msg.toLowerCase().includes("paid") ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {msg}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || !feeId} onClick={() => void confirmPaid()}>
            {busy ? "Saving…" : "I have paid — Confirm"}
          </Button>
          <Link href="/parent/fees">
            <Button type="button" variant="secondary" disabled={busy}>
              Cancel
            </Button>
          </Link>
        </div>
      </Card>
    </PortalShell>
  );
}
