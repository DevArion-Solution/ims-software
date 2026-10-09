"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField, TextArea } from "@/components/ui/Modal";
import { DocumentUpload } from "@/components/ui/DocumentUpload";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useData } from "@/components/providers/DataProvider";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import type {
  AdmissionApplication,
  AdmissionStatus,
  Gender,
  ProofDocument,
} from "@/types";

const STATUSES: AdmissionStatus[] = [
  "inquiry",
  "applied",
  "under_review",
  "approved",
  "rejected",
  "enrolled",
  "withdrawn",
];

type AppForm = {
  applicantName: string;
  fatherName: string;
  applyingFor: string;
  classId: string;
  section: string;
  gender: Gender;
  dateOfBirth: string;
  feeStructureId: string;
  phone: string;
  email: string;
  campusId: string;
  source: string;
  notes: string;
  address: string;
  previousSchool: string;
  documents: ProofDocument[];
  status: AdmissionStatus;
};

type EnrollForm = {
  className: string;
  section: string;
  gender: Gender;
  dateOfBirth: string;
  feeStructureId: string;
  discount: string;
  dueDate: string;
  month: string;
  createFee: boolean;
};

function emptyForm(campusId: string): AppForm {
  return {
    applicantName: "",
    fatherName: "",
    applyingFor: "",
    classId: "",
    section: "A",
    gender: "male",
    dateOfBirth: "",
    feeStructureId: "",
    phone: "",
    email: "",
    campusId,
    source: "Walk-in",
    notes: "",
    address: "",
    previousSchool: "",
    documents: [],
    status: "inquiry",
  };
}

export default function AdmissionsPage() {
  const { dict } = useLocale();
  const {
    data,
    addAdmission,
    updateAdmissionStatus,
    enrollAdmission,
    deleteAdmission,
  } = useData();
  const defaultCampus = data.institute.campuses[0]?.id ?? "camp1";
  const [open, setOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrolling, setEnrolling] = useState<AdmissionApplication | null>(null);
  const [enrollMsg, setEnrollMsg] = useState("");
  const [form, setForm] = useState<AppForm>(() => emptyForm(defaultCampus));
  const [enrollForm, setEnrollForm] = useState<EnrollForm>({
    className: "",
    section: "A",
    gender: "male",
    dateOfBirth: "2015-01-01",
    feeStructureId: "",
    discount: "0",
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    month: new Date().toLocaleString("en-PK", { month: "long", year: "numeric" }),
    createFee: true,
  });

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of STATUSES) map[s] = 0;
    for (const a of data.admissions) map[a.status] = (map[a.status] ?? 0) + 1;
    return map;
  }, [data.admissions]);

  const campusName = (id: string) =>
    data.institute.campuses.find((c) => c.id === id)?.name ?? id;

  const feeStructuresForClass = useMemo(() => {
    const cls = enrollForm.className.trim();
    if (!cls) return data.feeStructures;
    return data.feeStructures.filter(
      (s) =>
        s.className === cls ||
        cls.startsWith(s.className) ||
        s.className.startsWith(cls),
    );
  }, [data.feeStructures, enrollForm.className]);

  const selectedStructure = data.feeStructures.find(
    (s) => s.id === enrollForm.feeStructureId,
  );
  const feePreview = selectedStructure
    ? Math.max(0, selectedStructure.amount - Number(enrollForm.discount || 0))
    : 0;

  function onClassPick(classId: string) {
    const c = data.classes.find((x) => x.id === classId);
    if (!c) {
      setForm({ ...form, classId: "", applyingFor: form.applyingFor });
      return;
    }
    const match = data.feeStructures.find(
      (s) => s.className === c.name || c.name.startsWith(s.className),
    );
    setForm({
      ...form,
      classId,
      applyingFor: c.name,
      section: c.section || form.section,
      feeStructureId: match?.id ?? form.feeStructureId,
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const applyingFor =
      form.applyingFor.trim() ||
      data.classes.find((c) => c.id === form.classId)?.name ||
      "";
    if (!applyingFor) return;
    addAdmission({
      applicantName: form.applicantName,
      fatherName: form.fatherName,
      applyingFor,
      phone: form.phone,
      email: form.email || undefined,
      campusId: form.campusId,
      source: form.source,
      notes: form.notes || undefined,
      address: form.address || undefined,
      previousSchool: form.previousSchool || undefined,
      documents: form.documents.length ? form.documents : undefined,
      checklist: form.documents.map((d) => d.label),
      status: form.status,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth || undefined,
      section: form.section || undefined,
      classId: form.classId || undefined,
      feeStructureId: form.feeStructureId || undefined,
    });
    setOpen(false);
    setForm(emptyForm(data.institute.campuses[0]?.id ?? "camp1"));
  }

  function openEnroll(row: AdmissionApplication) {
    const linked = data.classes.find((c) => c.id === row.classId);
    const className =
      linked?.name ||
      row.applyingFor.split("—")[0]?.trim() ||
      row.applyingFor.trim();
    const structure =
      (row.feeStructureId &&
        data.feeStructures.find((s) => s.id === row.feeStructureId)) ||
      data.feeStructures.find(
        (s) => s.className === className || className.startsWith(s.className),
      );
    setEnrolling(row);
    setEnrollForm({
      className,
      section: row.section || linked?.section || "A",
      gender: row.gender || "male",
      dateOfBirth: row.dateOfBirth || "2015-01-01",
      feeStructureId: structure?.id ?? "",
      discount: "0",
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      month: new Date().toLocaleString("en-PK", {
        month: "long",
        year: "numeric",
      }),
      createFee: true,
    });
    setEnrollOpen(true);
  }

  function onEnrollSubmit(e: FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    if (!enrollForm.className.trim()) return;
    if (enrollForm.createFee && !enrollForm.feeStructureId) {
      alert("Select a fee structure, or turn off “Create fee challan”.");
      return;
    }
    const result = enrollAdmission(enrolling.id, {
      className: enrollForm.className.trim(),
      section: enrollForm.section.trim() || "A",
      gender: enrollForm.gender,
      dateOfBirth: enrollForm.dateOfBirth,
      feeStructureId: enrollForm.feeStructureId || undefined,
      discount: Number(enrollForm.discount) || 0,
      dueDate: enrollForm.dueDate,
      month: enrollForm.month,
      createFee: enrollForm.createFee,
    });
    setEnrollOpen(false);
    setEnrolling(null);
    if (result) {
      setEnrollMsg(
        `Enrolled — student created${
          result.feeId ? ` · challan ${result.feeId.toUpperCase()}` : " (no fee)"
        }.`,
      );
    } else {
      setEnrollMsg("Enroll failed — already enrolled or application missing.");
    }
  }

  return (
    <div>
      <PageHeader
        title={dict.admissions.title}
        subtitle="Inquiry → review → approve → enroll with class, DOB, gender & fee structure"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {dict.admissions.new}
          </Button>
        }
      />

      {enrollMsg ? (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {enrollMsg}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setEnrollMsg("")}
          >
            dismiss
          </button>
        </p>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {STATUSES.map((status) => (
          <div
            key={status}
            className="rounded-lg border border-[var(--ims-border)] bg-white px-3 py-3"
          >
            <p className="text-[10px] uppercase tracking-wide text-[var(--ims-text-muted)]">
              {labelize(status)}
            </p>
            <p className="mt-1 text-xl font-semibold">{counts[status] ?? 0}</p>
          </div>
        ))}
      </div>

      <Card>
        <Table
          headers={[
            dict.admissions.applicant,
            dict.admissions.father,
            dict.admissions.applyingFor,
            "Campus",
            "Docs",
            dict.admissions.source,
            dict.admissions.appliedOn,
            dict.common.status,
            dict.common.actions,
          ]}
        >
          {data.admissions.map((row) => (
            <tr key={row.id} className="hover:bg-[var(--ims-muted)]/40">
              <Td>
                <div>
                  <p className="font-medium">{row.applicantName}</p>
                  <p className="text-xs text-[var(--ims-text-muted)]">{row.phone}</p>
                  {row.gender || row.dateOfBirth ? (
                    <p className="text-xs text-[var(--ims-text-muted)]">
                      {row.gender ? labelize(row.gender) : ""}
                      {row.dateOfBirth ? ` · DOB ${formatDate(row.dateOfBirth)}` : ""}
                    </p>
                  ) : null}
                  {row.address ? (
                    <p className="text-xs text-[var(--ims-text-subtle)]">{row.address}</p>
                  ) : null}
                </div>
              </Td>
              <Td>{row.fatherName}</Td>
              <Td>
                <div>
                  <p>
                    {row.applyingFor}
                    {row.section ? `-${row.section}` : ""}
                  </p>
                  {row.previousSchool ? (
                    <p className="text-xs text-[var(--ims-text-muted)]">
                      Prev: {row.previousSchool}
                    </p>
                  ) : null}
                </div>
              </Td>
              <Td className="text-xs">{campusName(row.campusId)}</Td>
              <Td className="text-xs">
                {row.documents?.length
                  ? `${row.documents.length} file(s)`
                  : row.checklist?.length
                    ? `${row.checklist.length} checked`
                    : "No proofs"}
              </Td>
              <Td>{row.source ?? "—"}</Td>
              <Td>{formatDate(row.appliedOn)}</Td>
              <Td>
                <select
                  value={row.status}
                  onChange={(e) =>
                    updateAdmissionStatus(row.id, e.target.value as AdmissionStatus)
                  }
                  className="h-8 rounded border border-[var(--ims-border)] bg-white px-2 text-xs"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {labelize(s)}
                    </option>
                  ))}
                </select>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {row.status === "approved" ? (
                    <Button size="sm" onClick={() => openEnroll(row)}>
                      Enroll…
                    </Button>
                  ) : row.status === "enrolled" ? (
                    <Badge status="paid">Enrolled</Badge>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 text-rose-600"
                    onClick={() => {
                      if (confirm("Delete application?")) deleteAdmission(row.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New admission application"
        description="Capture inquiry or full application with class, DOB and documents"
        wide
      >
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Applicant name"
            required
            value={form.applicantName}
            onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
          />
          <Input
            label="Father / guardian"
            required
            value={form.fatherName}
            onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
          />
          <SelectField
            label="Class (catalog)"
            value={form.classId}
            onChange={onClassPick}
          >
            <option value="">— Free text / other —</option>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}-{c.section}
              </option>
            ))}
          </SelectField>
          <Input
            label="Applying for"
            required
            placeholder="Class 6 / 1st Year Pre-Med"
            value={form.applyingFor}
            onChange={(e) => setForm({ ...form, applyingFor: e.target.value })}
          />
          <Input
            label="Section"
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
          />
          <SelectField
            label="Gender"
            value={form.gender}
            onChange={(v) => setForm({ ...form, gender: v as Gender })}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </SelectField>
          <Input
            label="Date of birth"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
          />
          <SelectField
            label="Preferred fee structure"
            value={form.feeStructureId}
            onChange={(v) => setForm({ ...form, feeStructureId: v })}
          >
            <option value="">— Match on enroll —</option>
            {data.feeStructures.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.className}) · {formatCurrency(s.amount)}
              </option>
            ))}
          </SelectField>
          <Input
            label="Phone"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Previous school"
            value={form.previousSchool}
            onChange={(e) => setForm({ ...form, previousSchool: e.target.value })}
          />
          <SelectField
            label="Campus"
            value={form.campusId}
            onChange={(v) => setForm({ ...form, campusId: v })}
          >
            {data.institute.campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Source"
            value={form.source}
            onChange={(v) => setForm({ ...form, source: v })}
          >
            {["Walk-in", "Website", "Referral", "Facebook", "Agent"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </SelectField>
          <SelectField
            label="Status"
            value={form.status}
            onChange={(v) => setForm({ ...form, status: v as AdmissionStatus })}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </SelectField>
          <Input
            label="Address"
            className="sm:col-span-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="sm:col-span-2">
            <DocumentUpload
              title="Proof documents (required for admission)"
              hint="Attach B-Form, CNIC, school leaving, photos, fee slip — file upload for each proof"
              documents={form.documents}
              onChange={(documents) => setForm({ ...form, documents })}
            />
          </div>
          <div className="sm:col-span-2">
            <TextArea
              label="Notes"
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create application</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={enrollOpen}
        onClose={() => {
          setEnrollOpen(false);
          setEnrolling(null);
        }}
        title={`Enroll — ${enrolling?.applicantName ?? ""}`}
        description="Confirm class, section, DOB and fee challan before creating the student"
        wide
      >
        <form onSubmit={onEnrollSubmit} className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Class from catalog"
            value={
              data.classes.find(
                (c) =>
                  c.name === enrollForm.className &&
                  c.section === enrollForm.section,
              )?.id ?? ""
            }
            onChange={(v) => {
              const c = data.classes.find((x) => x.id === v);
              if (!c) return;
              const match = data.feeStructures.find(
                (s) => s.className === c.name || c.name.startsWith(s.className),
              );
              setEnrollForm({
                ...enrollForm,
                className: c.name,
                section: c.section,
                feeStructureId: match?.id ?? enrollForm.feeStructureId,
              });
            }}
          >
            <option value="">— Or type class below —</option>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}-{c.section}
              </option>
            ))}
          </SelectField>
          <Input
            label="Class name"
            required
            value={enrollForm.className}
            onChange={(e) =>
              setEnrollForm({ ...enrollForm, className: e.target.value })
            }
          />
          <Input
            label="Section"
            required
            value={enrollForm.section}
            onChange={(e) =>
              setEnrollForm({ ...enrollForm, section: e.target.value })
            }
          />
          <SelectField
            label="Gender"
            value={enrollForm.gender}
            onChange={(v) =>
              setEnrollForm({ ...enrollForm, gender: v as Gender })
            }
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </SelectField>
          <Input
            label="Date of birth"
            type="date"
            required
            value={enrollForm.dateOfBirth}
            onChange={(e) =>
              setEnrollForm({ ...enrollForm, dateOfBirth: e.target.value })
            }
          />
          <SelectField
            label="Fee structure"
            value={enrollForm.feeStructureId}
            onChange={(v) =>
              setEnrollForm({ ...enrollForm, feeStructureId: v })
            }
          >
            <option value="">— None —</option>
            {(feeStructuresForClass.length
              ? feeStructuresForClass
              : data.feeStructures
            ).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatCurrency(s.amount)}
              </option>
            ))}
          </SelectField>
          <Input
            label="Discount (PKR)"
            type="number"
            min={0}
            value={enrollForm.discount}
            onChange={(e) =>
              setEnrollForm({ ...enrollForm, discount: e.target.value })
            }
          />
          <Input
            label="Fee month label"
            value={enrollForm.month}
            onChange={(e) =>
              setEnrollForm({ ...enrollForm, month: e.target.value })
            }
          />
          <Input
            label="Challan due date"
            type="date"
            value={enrollForm.dueDate}
            onChange={(e) =>
              setEnrollForm({ ...enrollForm, dueDate: e.target.value })
            }
          />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={enrollForm.createFee}
              onChange={(e) =>
                setEnrollForm({ ...enrollForm, createFee: e.target.checked })
              }
            />
            Create fee challan on enroll
          </label>
          {enrollForm.createFee ? (
            <p className="rounded-md border border-[var(--ims-border)] bg-[var(--ims-muted)]/40 px-3 py-2 text-xs text-[var(--ims-text-muted)] sm:col-span-2">
              {selectedStructure
                ? `Challan preview: ${selectedStructure.name} · net ${formatCurrency(feePreview)}`
                : "Select a fee structure to set challan amount (no more hardcoded Rs 15,000)."}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEnrollOpen(false);
                setEnrolling(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Confirm enroll</Button>
          </div>
          <p className="text-xs text-[var(--ims-text-muted)] sm:col-span-2">
            After enroll, open{" "}
            <Link href="/students" className="text-[var(--ims-primary)] underline">
              Students
            </Link>{" "}
            or{" "}
            <Link href="/fees" className="text-[var(--ims-primary)] underline">
              Fees
            </Link>{" "}
            for the new record.
          </p>
        </form>
      </Modal>
    </div>
  );
}
