"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Download, KeyRound, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal, SelectField } from "@/components/ui/Modal";
import { Table, Td } from "@/components/ui/Table";
import { CredentialsModal } from "@/components/platform/CredentialsModal";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useData } from "@/components/providers/DataProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { resolveTenantId } from "@/lib/platform/resolve-tenant";
import { COUNTRY_PACKS } from "@/lib/config/countries";
import { INSTITUTE_TYPES } from "@/lib/config/institute-types";
import { NAV_MODULES } from "@/lib/config/modules";
import {
  downloadTextFile,
  staffToCsv,
  studentsToCsv,
} from "@/lib/school/csv";
import { labelize } from "@/lib/utils";
import type { InstituteType, UserRole } from "@/types";

type TabId = "general" | "users" | "import" | "year" | "backup" | "audit";

const MODULE_CHECKBOXES = NAV_MODULES.filter(
  (m) => m.id !== "dashboard" && m.id !== "settings" && m.id !== "subscription",
);

export default function SettingsPage() {
  const { dict } = useLocale();
  const { session } = useAuth();
  const tenantId = resolveTenantId(session);
  const {
    data,
    updateInstitute,
    addCampus,
    resetData,
    updateFeePolicy,
    addSystemUser,
    updateSystemUser,
    deleteSystemUser,
    importStudentsCsv,
    importStaffCsv,
    rolloverAcademicYear,
    replaceWorkspace,
    exportWorkspaceJson,
  } = useData();

  const [tab, setTab] = useState<TabId>("general");
  const [saved, setSaved] = useState(false);
  const [policySaved, setPolicySaved] = useState(false);
  const [campusOpen, setCampusOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [provisionBusy, setProvisionBusy] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
    tenantId: string;
  } | null>(null);
  const [importMsg, setImportMsg] = useState("");
  const [yearMsg, setYearMsg] = useState("");
  const [backupMsg, setBackupMsg] = useState("");
  const [newYear, setNewYear] = useState(() => {
    const cur = data.institute.academicYear;
    const m = /^(\d{4})-(\d{2})$/.exec(cur);
    if (m) return `${Number(m[1]) + 1}-${String(Number(m[2]) + 1).padStart(2, "0")}`;
    return cur;
  });
  const [promoteClasses, setPromoteClasses] = useState(true);
  const [clearAttendance, setClearAttendance] = useState(false);
  const [auditQ, setAuditQ] = useState("");
  const studentFileRef = useRef<HTMLInputElement>(null);
  const staffFileRef = useRef<HTMLInputElement>(null);
  const backupFileRef = useRef<HTMLInputElement>(null);

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "teacher" as UserRole,
    campusId: data.institute.campuses[0]?.id ?? "camp1",
    modules: [] as string[],
    createLogin: true,
  });

  const [form, setForm] = useState({
    name: data.institute.name,
    shortName: data.institute.shortName,
    type: data.institute.type,
    academicYear: data.institute.academicYear,
    city: data.institute.city,
    phone: data.institute.phone,
    email: data.institute.email,
    address: data.institute.address,
    countryCode: data.institute.countryCode,
  });
  const [policyForm, setPolicyForm] = useState({
    flatLateFee: String(data.feePolicy.flatLateFee),
    perDayLateFee: String(data.feePolicy.perDayLateFee),
    graceDays: String(data.feePolicy.graceDays),
    maxLateFee: String(data.feePolicy.maxLateFee),
  });
  const [campusForm, setCampusForm] = useState({
    name: "",
    city: "",
    address: "",
    isMain: false,
  });

  const country = COUNTRY_PACKS.find((c) => c.code === form.countryCode);
  const typeLabel =
    INSTITUTE_TYPES.find((t) => t.value === form.type)?.label ?? form.type;

  const filteredAudit = useMemo(() => {
    const q = auditQ.trim().toLowerCase();
    if (!q) return data.auditLogs;
    return data.auditLogs.filter((a) =>
      `${a.actor} ${a.action} ${a.entity} ${a.detail}`.toLowerCase().includes(q),
    );
  }, [data.auditLogs, auditQ]);

  function onSave(e: FormEvent) {
    e.preventDefault();
    updateInstitute({
      name: form.name,
      shortName: form.shortName,
      type: form.type as InstituteType,
      academicYear: form.academicYear,
      city: form.city,
      phone: form.phone,
      email: form.email,
      address: form.address,
      countryCode: form.countryCode,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  function onSavePolicy(e: FormEvent) {
    e.preventDefault();
    updateFeePolicy({
      flatLateFee: Number(policyForm.flatLateFee) || 0,
      perDayLateFee: Number(policyForm.perDayLateFee) || 0,
      graceDays: Number(policyForm.graceDays) || 0,
      maxLateFee: Number(policyForm.maxLateFee) || 0,
    });
    setPolicySaved(true);
    window.setTimeout(() => setPolicySaved(false), 2000);
  }

  function openAddUser() {
    setEditUserId(null);
    setUserForm({
      name: "",
      email: "",
      role: "teacher",
      campusId: data.institute.campuses[0]?.id ?? "camp1",
      modules: [],
      createLogin: true,
    });
    setUserOpen(true);
  }

  function openEditUser(id: string) {
    const u = data.systemUsers.find((x) => x.id === id);
    if (!u) return;
    setEditUserId(id);
    setUserForm({
      name: u.name,
      email: u.email,
      role: u.role,
      campusId: u.campusId ?? data.institute.campuses[0]?.id ?? "camp1",
      modules: [...u.modules],
      createLogin: false,
    });
    setUserOpen(true);
  }

  function toggleModule(id: string) {
    setUserForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(id)
        ? prev.modules.filter((m) => m !== id)
        : [...prev.modules, id],
    }));
  }

  async function provisionLogin(name: string, email: string, role: UserRole) {
    setProvisionBusy(true);
    try {
      const res = await fetch("/api/auth/provision", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, name, email, role }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        alert(err.error ?? "Could not create login");
        return null;
      }
      const json = (await res.json()) as {
        email: string;
        password: string;
        tenantId: string;
      };
      return json;
    } finally {
      setProvisionBusy(false);
    }
  }

  async function saveUser(e: FormEvent) {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim()) return;

    if (editUserId) {
      updateSystemUser(editUserId, {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        campusId: userForm.campusId,
        modules: userForm.modules,
      });
      setUserOpen(false);
      return;
    }

    addSystemUser({
      name: userForm.name,
      email: userForm.email,
      role: userForm.role,
      campusId: userForm.campusId,
      active: true,
      modules: userForm.modules,
    });
    setUserOpen(false);

    if (userForm.createLogin) {
      const creds = await provisionLogin(userForm.name, userForm.email, userForm.role);
      if (creds) setCredentials(creds);
    }
  }

  async function onImportFile(
    file: File | null,
    kind: "students" | "staff",
  ) {
    if (!file) return;
    const text = await file.text();
    const result =
      kind === "students" ? importStudentsCsv(text) : importStaffCsv(text);
    setImportMsg(
      `Imported ${result.added} ${kind}. ${result.errors.length ? `Issues: ${result.errors.slice(0, 3).join("; ")}` : "No errors."}`,
    );
  }

  function runRollover() {
    if (!newYear.trim()) return;
    if (
      !confirm(
        `Roll academic year to ${newYear}?${promoteClasses ? " Classes will be promoted." : ""}`,
      )
    ) {
      return;
    }
    const result = rolloverAcademicYear(newYear.trim(), {
      promoteClasses,
      clearAttendance,
    });
    setForm((f) => ({ ...f, academicYear: newYear.trim() }));
    setYearMsg(
      `Year set to ${newYear}. Promoted ${result.promoted} students, graduated ${result.graduated}.`,
    );
  }

  function downloadBackup() {
    downloadTextFile(
      `ims-backup-${data.institute.shortName}-${data.institute.academicYear}.json`,
      exportWorkspaceJson(),
      "application/json",
    );
    setBackupMsg("Backup downloaded.");
  }

  async function restoreBackup(file: File | null) {
    if (!file) return;
    if (!confirm("Restore will replace current school data. Continue?")) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { data?: unknown } | Record<string, unknown>;
      const payload =
        parsed && typeof parsed === "object" && "data" in parsed
          ? (parsed as { data: unknown }).data
          : parsed;
      replaceWorkspace(payload as Parameters<typeof replaceWorkspace>[0]);
      setBackupMsg("Workspace restored from backup.");
    } catch {
      setBackupMsg("Invalid backup file.");
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "general", label: "General" },
    { id: "users", label: "Users & RBAC" },
    { id: "import", label: "Import" },
    { id: "year", label: "Academic year" },
    { id: "backup", label: "Backup" },
    { id: "audit", label: "Audit log" },
  ];

  return (
    <div>
      <PageHeader title={dict.settings.title} subtitle={dict.settings.subtitle} />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "primary" : "secondary"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openAddUser}>
              Add user
            </Button>
          </div>
          <Card>
            <Table headers={["Name", "Email", "Role", "Modules", "Status", ""]}>
              {data.systemUsers.map((u) => (
                <tr key={u.id}>
                  <Td className="font-medium">{u.name}</Td>
                  <Td>{u.email}</Td>
                  <Td>{labelize(u.role)}</Td>
                  <Td className="max-w-[200px] truncate text-xs">
                    {u.modules.length ? u.modules.join(", ") : "All modules"}
                  </Td>
                  <Td>
                    <Badge status={u.active ? "active" : "inactive"}>
                      {u.active ? "Active" : "Off"}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="secondary" onClick={() => openEditUser(u.id)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={provisionBusy}
                        onClick={async () => {
                          const creds = await provisionLogin(u.name, u.email, u.role);
                          if (creds) setCredentials(creds);
                        }}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Login
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateSystemUser(u.id, { active: !u.active })}
                      >
                        {u.active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600"
                        onClick={() => {
                          if (confirm("Delete user?")) deleteSystemUser(u.id);
                        }}
                      >
                        Del
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
          <p className="text-xs text-[var(--ims-text-muted)]">
            Create login issues a temporary password for the matching portal. Empty module list =
            full access among plan-enabled modules.
          </p>
        </div>
      )}

      {tab === "import" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Import students (CSV)" />
            <CardBody className="space-y-3">
              <p className="text-xs text-[var(--ims-text-muted)]">
                Required columns: firstName, lastName, className. Optional: section, gender,
                dateOfBirth, phone, email, status, guardian.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadTextFile("students-template.csv", studentsToCsv(data.students))}
                >
                  <Download className="h-4 w-4" />
                  Download current / template
                </Button>
                <Button size="sm" onClick={() => studentFileRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </Button>
                <input
                  ref={studentFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => void onImportFile(e.target.files?.[0] ?? null, "students")}
                />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Import staff (CSV)" />
            <CardBody className="space-y-3">
              <p className="text-xs text-[var(--ims-text-muted)]">
                Required: name, role. Optional: department, phone, email, salary, status.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadTextFile("staff-template.csv", staffToCsv(data.staff))}
                >
                  <Download className="h-4 w-4" />
                  Download current / template
                </Button>
                <Button size="sm" onClick={() => staffFileRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </Button>
                <input
                  ref={staffFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => void onImportFile(e.target.files?.[0] ?? null, "staff")}
                />
              </div>
            </CardBody>
          </Card>
          {importMsg ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 lg:col-span-2">
              {importMsg}
            </p>
          ) : null}
        </div>
      )}

      {tab === "year" && (
        <Card>
          <CardHeader title="Academic year rollover" />
          <CardBody className="space-y-4">
            <p className="text-sm text-[var(--ims-text-muted)]">
              Current year: <strong>{data.institute.academicYear}</strong>. Rollover updates the
              year label, optionally promotes Grade/Class numbers, and marks Grade/Class 12 as
              alumni.
            </p>
            <Input
              label="New academic year"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              placeholder="2026-27"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={promoteClasses}
                onChange={(e) => setPromoteClasses(e.target.checked)}
              />
              Promote classes (Grade/Class N → N+1)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={clearAttendance}
                onChange={(e) => setClearAttendance(e.target.checked)}
              />
              Clear attendance for new year
            </label>
            <Button onClick={runRollover}>Run rollover</Button>
            {yearMsg ? <p className="text-sm text-emerald-700">{yearMsg}</p> : null}
          </CardBody>
        </Card>
      )}

      {tab === "backup" && (
        <Card>
          <CardHeader title="Backup & restore" />
          <CardBody className="space-y-4">
            <p className="text-sm text-[var(--ims-text-muted)]">
              Download a full JSON snapshot of this school workspace, or restore from a previous
              backup.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={downloadBackup}>
                <Download className="h-4 w-4" />
                Download backup
              </Button>
              <Button variant="secondary" onClick={() => backupFileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Restore backup
              </Button>
              <input
                ref={backupFileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => void restoreBackup(e.target.files?.[0] ?? null)}
              />
            </div>
            {backupMsg ? <p className="text-sm text-emerald-700">{backupMsg}</p> : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Reset all demo data to defaults?")) resetData();
              }}
            >
              Reset demo data
            </Button>
          </CardBody>
        </Card>
      )}

      {tab === "audit" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={auditQ}
              onChange={(e) => setAuditQ(e.target.value)}
              placeholder="Filter audit log…"
              className="max-w-sm"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                downloadTextFile(
                  "school-audit.csv",
                  [
                    ["When", "Actor", "Action", "Entity", "Detail"],
                    ...filteredAudit.map((a) => [
                      a.at,
                      a.actor,
                      a.action,
                      a.entity,
                      a.detail,
                    ]),
                  ]
                    .map((r) =>
                      r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","),
                    )
                    .join("\n"),
                )
              }
            >
              Export CSV
            </Button>
          </div>
          <Card>
            <Table headers={["When", "Actor", "Action", "Entity", "Detail"]}>
              {filteredAudit.map((a) => (
                <tr key={a.id}>
                  <Td className="whitespace-nowrap text-xs">
                    {a.at.slice(0, 19).replace("T", " ")}
                  </Td>
                  <Td>{a.actor}</Td>
                  <Td>{a.action}</Td>
                  <Td>{a.entity}</Td>
                  <Td className="max-w-[280px] truncate text-xs">{a.detail}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}

      {tab === "general" && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader title={dict.settings.profile} />
              <CardBody>
                <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Institute name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <Input
                    label="Short name"
                    value={form.shortName}
                    onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                  />
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">{dict.settings.type}</span>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({ ...form, type: e.target.value as InstituteType })
                      }
                      className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3 text-sm"
                    >
                      {INSTITUTE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    label={dict.settings.academicYear}
                    value={form.academicYear}
                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                  />
                  <Input
                    label="City"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                  <Input
                    label="Phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  <Input
                    label="Email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="sm:col-span-2"
                  />
                  <Input
                    label="Address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="sm:col-span-2"
                  />
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <Button type="submit">{dict.common.save}</Button>
                    {saved ? <span className="text-sm text-emerald-700">Saved</span> : null}
                  </div>
                </form>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Late fee policy" />
              <CardBody>
                <form onSubmit={onSavePolicy} className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Flat late fee"
                    type="number"
                    value={policyForm.flatLateFee}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, flatLateFee: e.target.value })
                    }
                  />
                  <Input
                    label="Per-day late fee"
                    type="number"
                    value={policyForm.perDayLateFee}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, perDayLateFee: e.target.value })
                    }
                  />
                  <Input
                    label="Grace days"
                    type="number"
                    value={policyForm.graceDays}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, graceDays: e.target.value })
                    }
                  />
                  <Input
                    label="Max late fee"
                    type="number"
                    value={policyForm.maxLateFee}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, maxLateFee: e.target.value })
                    }
                  />
                  <div className="flex items-center gap-3 sm:col-span-2">
                    <Button type="submit">Save fee policy</Button>
                    {policySaved ? (
                      <span className="text-sm text-emerald-700">Policy saved</span>
                    ) : null}
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader title={dict.settings.localization} />
              <CardBody className="space-y-3 text-sm">
                <label className="flex flex-col gap-1.5">
                  <span className="font-medium">Country pack</span>
                  <select
                    value={form.countryCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setForm({ ...form, countryCode: code });
                      updateInstitute({ countryCode: code });
                    }}
                    className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3"
                  >
                    {COUNTRY_PACKS.map((pack) => (
                      <option key={pack.code} value={pack.code}>
                        {pack.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--ims-text-muted)]">Currency</span>
                  <span className="font-medium">
                    {country?.currency} ({country?.currencySymbol})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--ims-text-muted)]">ID field</span>
                  <span className="font-medium">{country?.idLabel}</span>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title={dict.settings.campuses}
                action={
                  <Button size="sm" variant="secondary" onClick={() => setCampusOpen(true)}>
                    Add campus
                  </Button>
                }
              />
              <CardBody className="space-y-3">
                {data.institute.campuses.map((campus) => (
                  <div
                    key={campus.id}
                    className="rounded-md border border-[var(--ims-border)] px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{campus.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--ims-text-muted)]">
                          {campus.address}
                        </p>
                      </div>
                      {campus.isMain ? <Badge status="active">Main</Badge> : null}
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardBody className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-[var(--ims-text-muted)]">
                  Current profile
                </p>
                <p className="text-sm font-medium">
                  {typeLabel} · {country?.name} · AY {form.academicYear}
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      <Modal open={campusOpen} onClose={() => setCampusOpen(false)} title="Add campus">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            addCampus(campusForm);
            setCampusOpen(false);
            setCampusForm({ name: "", city: "", address: "", isMain: false });
          }}
        >
          <Input
            label="Campus name"
            required
            value={campusForm.name}
            onChange={(e) => setCampusForm({ ...campusForm, name: e.target.value })}
          />
          <Input
            label="City"
            required
            value={campusForm.city}
            onChange={(e) => setCampusForm({ ...campusForm, city: e.target.value })}
          />
          <Input
            label="Address"
            required
            value={campusForm.address}
            onChange={(e) => setCampusForm({ ...campusForm, address: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={campusForm.isMain}
              onChange={(e) => setCampusForm({ ...campusForm, isMain: e.target.checked })}
            />
            Mark as main campus
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCampusOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add campus</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={userOpen}
        onClose={() => setUserOpen(false)}
        title={editUserId ? "Edit system user" : "Add system user"}
        wide
      >
        <form className="space-y-3" onSubmit={(e) => void saveUser(e)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Name"
              required
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              required
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            />
            <SelectField
              label="Role"
              value={userForm.role}
              onChange={(v) => setUserForm({ ...userForm, role: v as UserRole })}
            >
              <option value="institute_admin">Institute admin</option>
              <option value="principal">Principal</option>
              <option value="teacher">Teacher</option>
              <option value="accountant">Accountant</option>
              <option value="librarian">Librarian</option>
              <option value="receptionist">Receptionist</option>
            </SelectField>
            <SelectField
              label="Campus"
              value={userForm.campusId}
              onChange={(v) => setUserForm({ ...userForm, campusId: v })}
            >
              {data.institute.campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Module access (blank = all)</p>
            <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-[var(--ims-border)] p-3 sm:grid-cols-3">
              {MODULE_CHECKBOXES.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={userForm.modules.includes(m.id)}
                    onChange={() => toggleModule(m.id)}
                  />
                  {m.id}
                </label>
              ))}
            </div>
          </div>
          {!editUserId ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={userForm.createLogin}
                onChange={(e) =>
                  setUserForm({ ...userForm, createLogin: e.target.checked })
                }
              />
              Create portal login (show password once)
            </label>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setUserOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={provisionBusy}>
              {editUserId ? "Save" : "Add user"}
            </Button>
          </div>
        </form>
      </Modal>

      <CredentialsModal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        credentials={credentials}
        schoolName={data.institute.name}
        title="Portal login created"
      />
    </div>
  );
}
