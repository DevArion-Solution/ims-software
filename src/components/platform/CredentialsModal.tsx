"use client";

import { Copy, KeyRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { ProvisionedCredentials } from "@/components/providers/PlatformProvider";

export function CredentialsModal({
  open,
  onClose,
  title,
  description,
  credentials,
  schoolName,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  credentials: ProvisionedCredentials | null;
  schoolName?: string;
}) {
  if (!credentials) return null;

  function copyAll() {
    const text = `IMS School Admin Login\nSchool: ${schoolName ?? credentials!.tenantId}\nEmail: ${credentials!.email}\nPassword: ${credentials!.password}\nPortal: /login → Admin`;
    void navigator.clipboard.writeText(text);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? "Admin credentials created"}
      description={
        description ??
        "Share these login details with the school admin. The password is shown once."
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-[var(--sa-gold)]/40 bg-[var(--sa-gold-soft)]/30 p-4">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sa-gold)]" />
          <div className="min-w-0 flex-1 space-y-2 text-sm">
            {schoolName ? (
              <p>
                <span className="text-[var(--sa-muted)]">School: </span>
                <strong>{schoolName}</strong>
              </p>
            ) : null}
            <p>
              <span className="text-[var(--sa-muted)]">Email: </span>
              <strong className="font-mono">{credentials.email}</strong>
            </p>
            <p>
              <span className="text-[var(--sa-muted)]">Password: </span>
              <strong className="font-mono text-[var(--sa-ink)]">{credentials.password}</strong>
            </p>
            <p className="text-xs text-[var(--sa-muted)]">
              Login at /login → Admin portal. Ask them to change password after first sign-in.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={copyAll}>
            <Copy className="h-4 w-4" />
            Copy credentials
          </Button>
          <Button onClick={onClose} className="bg-[var(--sa-ink)] hover:bg-[var(--sa-ink-2)]">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
