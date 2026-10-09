"use client";

import { useEffect } from "react";
import { usePlatform } from "@/components/providers/PlatformProvider";
import { formatDate } from "@/lib/utils";

export default function AuditPage() {
  const { data, refreshPlatform } = usePlatform();

  useEffect(() => {
    void refreshPlatform();
  }, [refreshPlatform]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sa-gold)]">
          Control
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--sa-text)]">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-[var(--sa-muted)]">
          Every platform action — approvals, suspensions, plan changes, billing — stays here.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--sa-border)] bg-white shadow-[var(--sa-shadow)]">
        <div className="divide-y divide-[var(--sa-border)]">
          {data.audit.map((row) => (
            <div key={row.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr]">
              <div>
                <p className="text-xs font-medium text-[var(--sa-text)]">
                  {formatDate(row.at)}
                </p>
                <p className="text-[11px] text-[var(--sa-muted)]">
                  {new Date(row.at).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--sa-text)]">
                  <span className="rounded-md bg-[var(--sa-bg)] px-1.5 py-0.5 font-mono text-xs text-[var(--sa-cyan)]">
                    {row.action}
                  </span>{" "}
                  · {row.target}
                </p>
                <p className="mt-1 text-xs text-[var(--sa-muted)]">
                  by {row.actor}
                  {row.detail ? ` — ${row.detail}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
