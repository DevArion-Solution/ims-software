"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Eye,
  Ban,
  Play,
  ShieldCheck,
  Building2,
  Download,
  CheckSquare,
} from "lucide-react";
import { usePlatform } from "@/components/providers/PlatformProvider";
import type { ProvisionedCredentials } from "@/components/providers/PlatformProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { CredentialsModal } from "@/components/platform/CredentialsModal";
import { downloadCsv, exportSchoolsCsv } from "@/lib/platform/analytics";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField, Field } from "@/components/ui/Modal";
import { Table, Td } from "@/components/ui/Table";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import type { InstituteType } from "@/types";
import type { PlanBillingCycle, SchoolTenantStatus } from "@/types/platform";

const TYPES: InstituteType[] = [
  "school",
  "college",
  "university",
  "academy",
  "coaching",
  "madrasa",
  "vocational",
];

export default function SuperAdminSchoolsPage() {
  const router = useRouter();
  const { data, getPlan, createSchool, setSchoolStatus, bulkSetSchoolStatus, updateSchool } =
    usePlatform();
  const { impersonateSchoolAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<ProvisionedCredentials | null>(null);
  const [credSchoolName, setCredSchoolName] = useState("");
  const [form, setForm] = useState({
    name: "",
    shortName: "",
    type: "school" as InstituteType,
    city: "",
    address: "",
    phone: "",
    email: "",
    adminName: "",
    adminEmail: "",
    planId: data.plans[1]?.id ?? data.plans[0]?.id ?? "",
    billingCycle: "monthly" as PlanBillingCycle,
    status: "trial" as SchoolTenantStatus,
  });

  const rows = useMemo(() => {
    return data.schools.filter((s) => {
      const hay = `${s.name} ${s.city} ${s.adminEmail} ${s.code}`.toLowerCase();
      const matchQ = !q || hay.includes(q.toLowerCase());
      const matchS = status === "all" || s.status === status;
      return matchQ && matchS;
    });
  }, [data.schools, q, status]);

  const editing = editId ? data.schools.find((s) => s.id === editId) : null;

  function openCreate() {
    setEditId(null);
    setForm({
      name: "",
      shortName: "",
      type: "school",
      city: "",
      address: "",
      phone: "",
      email: "",
      adminName: "",
      adminEmail: "",
      planId: data.settings.defaultPlanId,
      billingCycle: "monthly",
      status: "trial",
    });
    setOpen(true);
  }

  function openEdit(id: string) {
    const s = data.schools.find((x) => x.id === id);
    if (!s) return;
    setEditId(id);
    setForm({
      name: s.name,
      shortName: s.shortName,
      type: s.type,
      city: s.city,
      address: s.address,
      phone: s.phone,
      email: s.email,
      adminName: s.adminName,
      adminEmail: s.adminEmail,
      planId: s.planId,
      billingCycle: s.billingCycle,
      status: s.status,
    });
    setOpen(true);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  async function save() {
    if (!form.name.trim() || !form.adminEmail.trim()) return;
    setSaving(true);
    if (editId) {
      updateSchool(editId, {
        name: form.name,
        shortName: form.shortName,
        type: form.type,
        city: form.city,
        address: form.address,
        phone: form.phone,
        email: form.email,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
      });
      setOpen(false);
    } else {
      const result = await createSchool(form);
      setOpen(false);
      if (result.credentials) {
        setCredSchoolName(result.school.name);
        setCredentials(result.credentials);
      }
    }
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sa-gold)]">
            Tenants
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--sa-text)]">
            Schools & organizations
          </h1>
          <p className="mt-1 text-sm text-[var(--sa-muted)]">
            Register, activate, suspend, and open any school for support.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => downloadCsv("ims-schools.csv", exportSchoolsCsv(data))}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            onClick={openCreate}
            className="bg-[var(--sa-ink)] hover:bg-[var(--sa-ink-2)]"
          >
            <Plus className="h-4 w-4" />
            Add school
          </Button>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--sa-border)] bg-white px-4 py-3">
          <span className="text-sm font-medium text-[var(--sa-text)]">
            {selected.size} selected
          </span>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              bulkSetSchoolStatus([...selected], "suspended", "Bulk suspended by Super Admin");
              setSelected(new Set());
            }}
          >
            <Ban className="h-3.5 w-3.5" />
            Suspend all
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              bulkSetSchoolStatus([...selected], "active", "Bulk reactivated");
              setSelected(new Set());
            }}
          >
            <Play className="h-3.5 w-3.5" />
            Activate all
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--sa-border)] bg-white p-4 shadow-[var(--sa-shadow)] sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sa-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search school, city, admin email…"
            className="h-10 w-full rounded-xl border border-[var(--sa-border)] bg-[var(--sa-bg)] pl-9 pr-3 text-sm outline-none focus:border-[var(--sa-cyan)]"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-xl border border-[var(--sa-border)] bg-white px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--sa-border)] bg-white shadow-[var(--sa-shadow)]">
        <Table
          headers={[
            "",
            "School",
            "Plan",
            "Usage",
            "MRR",
            "Status",
            "Registered",
            "Actions",
          ]}
        >
          {rows.map((school) => {
            const plan = getPlan(school.planId);
            const maxStudents = school.maxStudentsOverride ?? plan?.maxStudents ?? 0;
            const checked = selected.has(school.id);
            return (
              <tr key={school.id} className="hover:bg-[var(--sa-bg)]/70">
                <Td>
                  <button
                    type="button"
                    onClick={() => toggleSelect(school.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                      checked
                        ? "border-[var(--sa-ink)] bg-[var(--sa-ink)] text-white"
                        : "border-[var(--sa-border)] text-[var(--sa-muted)]"
                    }`}
                    aria-label={checked ? "Deselect" : "Select"}
                  >
                    {checked ? <CheckSquare className="h-4 w-4" /> : null}
                  </button>
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 aspect-square items-center justify-center overflow-hidden rounded-full bg-[#4993a7] text-[10px] font-bold leading-none text-white">
                      {school.logoInitials}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--sa-text)]">{school.name}</p>
                      <p className="text-xs text-[var(--sa-muted)]">
                        {school.city} · {labelize(school.type)} · {school.adminEmail}
                      </p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <p className="text-sm font-medium">{plan?.name ?? "—"}</p>
                  <p className="text-xs text-[var(--sa-muted)]">{school.billingCycle}</p>
                </Td>
                <Td>
                  <p className="text-sm">
                    {school.studentsCount}/{maxStudents || "∞"} students
                  </p>
                  <p className="text-xs text-[var(--sa-muted)]">
                    {school.staffCount} staff · {school.campusesCount} campuses
                  </p>
                </Td>
                <Td>{formatCurrency(school.mrr)}</Td>
                <Td>
                  <Badge status={school.status}>{school.status}</Badge>
                </Td>
                <Td>{formatDate(school.registeredAt)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <Link href={`/super-admin/schools/${school.id}`}>
                      <Button size="sm" variant="secondary">
                        Detail
                      </Button>
                    </Link>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(school.id)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
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
                      <Eye className="h-3.5 w-3.5" />
                      Open
                    </Button>
                    {school.status === "suspended" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSchoolStatus(school.id, "active", "Reactivated")}
                      >
                        <Play className="h-3.5 w-3.5" />
                        Activate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          setSchoolStatus(school.id, "suspended", "Suspended by Super Admin")
                        }
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Suspend
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-[var(--sa-muted)]">
            <Building2 className="h-8 w-8" />
            <p className="text-sm">No schools match this filter</p>
          </div>
        ) : null}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit school" : "Register school"}
        description="Creates a tenant organization with an institute admin."
        wide
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Institute name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Short code">
            <Input
              value={form.shortName}
              onChange={(e) => setForm({ ...form, shortName: e.target.value })}
            />
          </Field>
          <SelectField
            label="Type"
            value={form.type}
            onChange={(v) => setForm({ ...form, type: v as InstituteType })}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {labelize(t)}
              </option>
            ))}
          </SelectField>
          <Field label="City">
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </Field>
          <Field label="Address">
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Institute email">
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Admin name">
            <Input
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
            />
          </Field>
          <Field label="Admin email">
            <Input
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
            />
          </Field>
          {!editing ? (
            <>
              <SelectField
                label="Plan"
                value={form.planId}
                onChange={(v) => setForm({ ...form, planId: v })}
              >
                {data.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Billing"
                value={form.billingCycle}
                onChange={(v) => setForm({ ...form, billingCycle: v as PlanBillingCycle })}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </SelectField>
              <SelectField
                label="Initial status"
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v as SchoolTenantStatus })}
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
              </SelectField>
            </>
          ) : null}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving} className="bg-[var(--sa-ink)] hover:bg-[var(--sa-ink-2)]">
            <ShieldCheck className="h-4 w-4" />
            {saving ? "Creating…" : editing ? "Save changes" : "Create tenant"}
          </Button>
        </div>
      </Modal>

      <CredentialsModal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        credentials={credentials}
        schoolName={credSchoolName}
      />
    </div>
  );
}
