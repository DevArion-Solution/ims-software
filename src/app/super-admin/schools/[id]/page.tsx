"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Ban,
  Eye,
  Play,
  Shield,
  Users,
  GraduationCap,
  CreditCard,
  KeyRound,
} from "lucide-react";
import { usePlatform } from "@/components/providers/PlatformProvider";
import type { ProvisionedCredentials } from "@/components/providers/PlatformProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { CredentialsModal } from "@/components/platform/CredentialsModal";
import { PLATFORM_MODULES } from "@/lib/platform/modules";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";

export default function SchoolDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, getPlan, effectiveModules, setSchoolStatus, assignPlan, provisionSchoolAdmin } =
    usePlatform();
  const { impersonateSchoolAdmin } = useAuth();
  const [credentials, setCredentials] = useState<ProvisionedCredentials | null>(null);

  const school = useMemo(
    () => data.schools.find((s) => s.id === params.id),
    [data.schools, params.id],
  );
  const plan = school ? getPlan(school.planId) : undefined;
  const modules = school ? effectiveModules(school) : [];
  const maxStudents = school?.maxStudentsOverride ?? plan?.maxStudents ?? 0;
  const maxStaff = school?.maxStaffOverride ?? plan?.maxStaff ?? 0;
  const schoolInvoices = data.invoices.filter((i) => i.schoolId === params.id);

  if (!school) {
    return (
      <div className="py-20 text-center">
        <p className="text-[var(--sa-muted)]">School not found</p>
        <Link href="/super-admin/schools" className="mt-4 inline-block text-sm font-semibold text-[var(--sa-cyan)]">
          ← Back to schools
        </Link>
      </div>
    );
  }

  const studentPct = maxStudents ? Math.min(100, (school.studentsCount / maxStudents) * 100) : 0;
  const staffPct = maxStaff ? Math.min(100, (school.staffCount / maxStaff) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/super-admin/schools"
            className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--sa-cyan)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All schools
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 aspect-square items-center justify-center overflow-hidden rounded-full bg-[#4993a7] text-lg font-bold leading-none text-white">
              {school.logoInitials}
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--sa-text)]">
                {school.name}
              </h1>
              <p className="text-sm text-[var(--sa-muted)]">
                {school.city} · {labelize(school.type)} · {school.adminEmail}
              </p>
            </div>
            <Badge status={school.status}>{school.status}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const creds = await provisionSchoolAdmin(school.id);
              if (creds) setCredentials(creds);
            }}
          >
            <KeyRound className="h-4 w-4" />
            Admin login
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/super-admin/modules?school=${school.id}`)}
          >
            <Shield className="h-4 w-4" />
            Module access
          </Button>
          <Button
            onClick={async () => {
              const result = await impersonateSchoolAdmin({
                id: school.id,
                name: school.name,
                adminName: school.adminName,
                adminEmail: school.adminEmail,
              });
              if (result.ok) router.push("/dashboard");
            }}
          >
            <Eye className="h-4 w-4" />
            Open school
          </Button>
          {school.status === "suspended" ? (
            <Button
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={() => setSchoolStatus(school.id, "active", "Reactivated from detail page")}
            >
              <Play className="h-4 w-4" />
              Activate
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={() => setSchoolStatus(school.id, "suspended", "Suspended from detail page")}
            >
              <Ban className="h-4 w-4" />
              Suspend
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Students"
          value={`${school.studentsCount} / ${maxStudents || "∞"}`}
          pct={studentPct}
          tone="cyan"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Staff"
          value={`${school.staffCount} / ${maxStaff || "∞"}`}
          pct={staffPct}
          tone="gold"
        />
        <StatCard
          icon={<CreditCard className="h-4 w-4" />}
          label="MRR"
          value={formatCurrency(school.mrr)}
          pct={100}
          tone="ink"
        />
        <StatCard
          icon={<Shield className="h-4 w-4" />}
          label="Modules"
          value={String(modules.length)}
          pct={(modules.length / PLATFORM_MODULES.length) * 100}
          tone="cyan"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--sa-text)]">Subscription</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Plan" value={plan?.name ?? "—"} />
            <Row label="Billing" value={school.billingCycle} />
            <Row label="Registered" value={formatDate(school.registeredAt)} />
            <Row label="Trial ends" value={school.trialEndsAt ? formatDate(school.trialEndsAt) : "—"} />
            <Row
              label="Subscription ends"
              value={school.subscriptionEndsAt ? formatDate(school.subscriptionEndsAt) : "—"}
            />
            <Row label="Admin" value={`${school.adminName} · ${school.adminEmail}`} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.plans.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={p.id === school.planId ? "primary" : "secondary"}
                onClick={() => assignPlan(school.id, p.id, school.billingCycle)}
              >
                {p.name}
              </Button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--sa-text)]">Enabled modules</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {modules.map((m) => {
              const mod = PLATFORM_MODULES.find((x) => x.id === m);
              return (
                <span
                  key={m}
                  className="rounded-full bg-[var(--sa-cyan-soft)] px-2.5 py-1 text-xs font-medium text-[var(--sa-text)]"
                >
                  {mod?.label ?? m}
                </span>
              );
            })}
          </div>
          {school.notes ? (
            <p className="mt-4 rounded-xl bg-[var(--sa-bg)] p-3 text-xs text-[var(--sa-muted)]">
              {school.notes}
            </p>
          ) : null}
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
        <h2 className="text-sm font-semibold text-[var(--sa-text)]">Billing history</h2>
        {schoolInvoices.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--sa-muted)]">No invoices yet</p>
        ) : (
          <div className="mt-3 divide-y divide-[var(--sa-border)]">
            {schoolInvoices.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-medium">{inv.id}</p>
                  <p className="text-xs text-[var(--sa-muted)]">{inv.period}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span>{formatCurrency(inv.amount)}</span>
                  <Badge status={inv.status}>{inv.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CredentialsModal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        credentials={credentials}
        schoolName={school.name}
        title="Admin login credentials"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--sa-border)] pb-2">
      <dt className="text-[var(--sa-muted)]">{label}</dt>
      <dd className="text-right font-medium text-[var(--sa-text)]">{value}</dd>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  pct,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  pct: number;
  tone: "cyan" | "gold" | "ink";
}) {
  const bar =
    tone === "cyan" ? "bg-[var(--sa-cyan)]" : tone === "gold" ? "bg-[var(--sa-gold)]" : "bg-[var(--sa-ink)]";
  return (
    <div className="rounded-2xl border border-[var(--sa-border)] bg-white p-4 shadow-[var(--sa-shadow)]">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-[var(--sa-muted)]">{label}</p>
        <span className="text-[var(--sa-muted)]">{icon}</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-[var(--sa-text)]">{value}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--sa-bg)]">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
