"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { usePlatform } from "@/components/providers/PlatformProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Modal";

export default function PlatformSettingsPage() {
  const { data, updateSettings, resetPlatform, refreshPlatform } = usePlatform();
  const [resetting, setResetting] = useState(false);
  const [form, setForm] = useState({ ...data.settings });
  const [rails, setRails] = useState<{
    sandbox?: boolean;
    rails?: Record<string, { mode: string; configured: boolean; provider?: string }>;
    hint?: string;
  } | null>(null);

  useEffect(() => {
    setForm({ ...data.settings });
  }, [data.settings]);

  useEffect(() => {
    void fetch("/api/integrations/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setRails(j))
      .catch(() => setRails(null));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sa-gold)]">
          System
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--sa-text)]">
          Platform settings
        </h1>
        <p className="mt-1 text-sm text-[var(--sa-muted)]">
          Registration policy, default plan, payment rails and communication switches.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--sa-text)]">Brand & support</h2>
          <div className="mt-4 grid gap-3">
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Platform name</span>
              <Input
                value={form.platformName}
                onChange={(e) => setForm({ ...form, platformName: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Support email</span>
              <Input
                value={form.supportEmail}
                onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Support phone</span>
              <Input
                value={form.supportPhone}
                onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--sa-text)]">Onboarding rules</h2>
          <div className="mt-4 space-y-3">
            <Toggle
              label="Allow self-registration"
              checked={form.allowSelfRegistration}
              onChange={(v) => setForm({ ...form, allowSelfRegistration: v })}
            />
            <Toggle
              label="Require Super Admin approval"
              checked={form.requireApproval}
              onChange={(v) => setForm({ ...form, requireApproval: v })}
            />
            <Toggle
              label="Maintenance mode"
              checked={form.maintenanceMode}
              onChange={(v) => setForm({ ...form, maintenanceMode: v })}
            />
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Default trial days</span>
              <Input
                type="number"
                value={form.defaultTrialDays}
                onChange={(e) =>
                  setForm({ ...form, defaultTrialDays: Number(e.target.value) })
                }
              />
            </label>
            <SelectField
              label="Default plan for new schools"
              value={form.defaultPlanId}
              onChange={(v) => setForm({ ...form, defaultPlanId: v })}
            >
              {data.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectField>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)] lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--sa-text)]">Integrations (flags)</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Toggle
              label="WhatsApp alerts (skipped for now)"
              checked={false}
              onChange={() => {
                /* WhatsApp disabled until Cloud API is ready */
              }}
            />
            <Toggle
              label="SMS alerts"
              checked={form.smsEnabled}
              onChange={(v) => setForm({ ...form, smsEnabled: v })}
            />
            <Toggle
              label="JazzCash (manual page)"
              checked={form.jazzcashEnabled}
              onChange={(v) => setForm({ ...form, jazzcashEnabled: v })}
            />
            <Toggle
              label="EasyPaisa (manual page)"
              checked={form.easypaisaEnabled}
              onChange={(v) => setForm({ ...form, easypaisaEnabled: v })}
            />
            <Toggle
              label="Stripe"
              checked={form.stripeEnabled !== false}
              onChange={(v) => setForm({ ...form, stripeEnabled: v })}
            />
          </div>
          {rails ? (
            <div className="mt-5 rounded-xl border border-dashed border-[var(--sa-border)] bg-[var(--sa-muted)]/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sa-muted)]">
                Env rail status {rails.sandbox ? "(sandbox mode)" : "(live preferred)"}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {Object.entries(rails.rails ?? {}).map(([name, info]) => (
                  <div key={name} className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                    <p className="font-medium capitalize">{name}</p>
                    <p className="text-xs text-[var(--sa-muted)]">
                      {info.mode}
                      {info.configured ? " · keys set" : " · keys missing"}
                      {info.provider ? ` · ${info.provider}` : ""}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-[var(--sa-muted)]">{rails.hint}</p>
            </div>
          ) : null}
        </section>
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <Button
          variant="danger"
          disabled={resetting}
          onClick={async () => {
            if (!confirm("Reset all platform demo data in PostgreSQL?")) return;
            setResetting(true);
            await resetPlatform();
            await refreshPlatform();
            setForm({ ...data.settings });
            setResetting(false);
          }}
        >
          <RotateCcw className="h-4 w-4" />
          {resetting ? "Resetting…" : "Reset demo platform"}
        </Button>
        <Button
          className="bg-[var(--sa-ink)] hover:bg-[var(--sa-ink-2)]"
          onClick={() => updateSettings(form)}
        >
          <Save className="h-4 w-4" />
          Save settings
        </Button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border border-[var(--sa-border)] bg-[var(--sa-bg)] px-3 py-3 text-left"
    >
      <span className="text-sm font-medium text-[var(--sa-text)]">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-[var(--sa-cyan)]" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
