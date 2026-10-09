"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, Inbox } from "lucide-react";
import { usePlatform } from "@/components/providers/PlatformProvider";
import type { ProvisionedCredentials } from "@/components/providers/PlatformProvider";
import { CredentialsModal } from "@/components/platform/CredentialsModal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal, TextArea } from "@/components/ui/Modal";
import { formatDate, labelize } from "@/lib/utils";

export default function RegistrationsPage() {
  const { data, getPlan, approveRegistration, rejectRegistration } = usePlatform();
  const [filter, setFilter] = useState<"pending" | "all" | "approved" | "rejected">("pending");
  const [actionId, setActionId] = useState<string | null>(null);
  const [mode, setMode] = useState<"approve" | "reject">("approve");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<ProvisionedCredentials | null>(null);
  const [credSchoolName, setCredSchoolName] = useState("");

  const rows = useMemo(() => {
    return data.registrations.filter((r) => filter === "all" || r.status === filter);
  }, [data.registrations, filter]);

  const current = actionId ? data.registrations.find((r) => r.id === actionId) : null;

  async function confirm() {
    if (!actionId) return;
    setBusy(true);
    if (mode === "approve") {
      const result = await approveRegistration(actionId, note || undefined);
      if (result?.credentials) {
        setCredSchoolName(result.school.name);
        setCredentials(result.credentials);
      }
    } else {
      rejectRegistration(actionId, note || undefined);
    }
    setBusy(false);
    setActionId(null);
    setNote("");
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sa-gold)]">
          Onboarding
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--sa-text)]">
          School registrations
        </h1>
        <p className="mt-1 text-sm text-[var(--sa-muted)]">
          Approve to create tenant + trial + admin login. Reject with a reason for the applicant.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
              filter === key
                ? "bg-[var(--sa-ink)] text-white"
                : "bg-white text-[var(--sa-muted)] ring-1 ring-[var(--sa-border)]"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--sa-border)] bg-white py-20 text-[var(--sa-muted)]">
            <Inbox className="h-8 w-8" />
            <p className="text-sm">No registrations in this view</p>
          </div>
        ) : (
          rows.map((reg) => {
            const plan = getPlan(reg.requestedPlanId);
            return (
              <article
                key={reg.id}
                className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[var(--sa-text)]">
                        {reg.instituteName}
                      </h2>
                      <Badge status={reg.status}>{reg.status}</Badge>
                      <span className="rounded-full bg-[var(--sa-bg)] px-2.5 py-0.5 text-xs text-[var(--sa-muted)]">
                        {labelize(reg.instituteType)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--sa-muted)]">
                      {reg.city} · {reg.address}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-[var(--sa-bg)] p-3">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--sa-muted)]">
                          Admin
                        </p>
                        <p className="text-sm font-medium text-[var(--sa-text)]">{reg.adminName}</p>
                        <p className="text-xs text-[var(--sa-muted)]">{reg.adminEmail}</p>
                      </div>
                      <div className="rounded-xl bg-[var(--sa-bg)] p-3">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--sa-muted)]">
                          Requested plan
                        </p>
                        <p className="text-sm font-medium text-[var(--sa-text)]">
                          {plan?.name ?? "—"}
                        </p>
                        <p className="text-xs text-[var(--sa-muted)]">
                          ~{reg.expectedStudents} students
                        </p>
                      </div>
                      <div className="rounded-xl bg-[var(--sa-bg)] p-3">
                        <p className="text-[10px] uppercase tracking-wide text-[var(--sa-muted)]">
                          Submitted
                        </p>
                        <p className="text-sm font-medium text-[var(--sa-text)]">
                          {formatDate(reg.submittedAt)}
                        </p>
                        <p className="text-xs text-[var(--sa-muted)]">{reg.phone}</p>
                      </div>
                    </div>
                    {reg.message ? (
                      <p className="mt-3 rounded-xl border border-[var(--sa-border)] bg-[var(--sa-gold-soft)]/40 px-3 py-2 text-sm text-[var(--sa-text)]">
                        “{reg.message}”
                      </p>
                    ) : null}
                    {reg.reviewNote ? (
                      <p className="mt-2 text-xs text-[var(--sa-muted)]">
                        Review note: {reg.reviewNote}
                      </p>
                    ) : null}
                  </div>
                  {reg.status === "pending" ? (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        className="bg-emerald-700 hover:bg-emerald-800"
                        onClick={() => {
                          setMode("approve");
                          setActionId(reg.id);
                          setNote("Approved — trial started. Admin login created.");
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          setMode("reject");
                          setActionId(reg.id);
                          setNote("");
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>

      <Modal
        open={!!actionId}
        onClose={() => setActionId(null)}
        title={mode === "approve" ? "Approve registration" : "Reject registration"}
        description={current?.instituteName}
      >
        <TextArea label="Note" value={note} onChange={setNote} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setActionId(null)}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() => void confirm()}
            className={
              mode === "approve"
                ? "bg-emerald-700 hover:bg-emerald-800"
                : "bg-[var(--ims-danger)]"
            }
          >
            {busy ? "Working…" : `Confirm ${mode}`}
          </Button>
        </div>
      </Modal>

      <CredentialsModal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        credentials={credentials}
        schoolName={credSchoolName}
        title="School approved — admin login ready"
        description="A trial tenant and admin account were created. Share these credentials with the institute admin."
      />
    </div>
  );
}
