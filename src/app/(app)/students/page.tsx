"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Eye, IdCard, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField } from "@/components/ui/Modal";
import { DocumentUpload } from "@/components/ui/DocumentUpload";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useData } from "@/components/providers/DataProvider";
import { useCampus } from "@/components/providers/CampusProvider";
import { labelize } from "@/lib/utils";
import type { Gender, ProofDocument, Student, StudentStatus } from "@/types";

const emptyForm = {
  firstName: "",
  lastName: "",
  gender: "male" as Gender,
  dateOfBirth: "",
  phone: "",
  email: "",
  className: "Class 8",
  section: "A",
  campusId: "camp1",
  status: "active" as StudentStatus,
  enrollmentDate: new Date().toISOString().slice(0, 10),
  address: "",
  guardianName: "",
  guardianPhone: "",
  guardianRelation: "Father",
  cnicOrBForm: "",
  documents: [] as ProofDocument[],
};

export default function StudentsPage() {
  const { dict } = useLocale();
  const { data, addStudent, updateStudent, deleteStudent } = useData();
  const { campusFilter, setCampusFilter } = useCampus();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyForm);

  const campusName = (id: string) =>
    data.institute.campuses.find((c) => c.id === id)?.name ?? id;

  const filtered = useMemo(() => {
    return data.students.filter((s) => {
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.admissionNo.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q);
      const matchCampus = campusFilter === "all" || s.campusId === campusFilter;
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchQuery && matchCampus && matchStatus;
    });
  }, [data.students, query, campusFilter, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      campusId: data.institute.campuses[0]?.id ?? "camp1",
      enrollmentDate: new Date().toISOString().slice(0, 10),
    });
    setOpen(true);
  }

  function openEdit(student: Student) {
    setEditing(student);
    setForm({
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      phone: student.phone ?? "",
      email: student.email ?? "",
      className: student.className,
      section: student.section,
      campusId: student.campusId,
      status: student.status,
      enrollmentDate: student.enrollmentDate,
      address: student.address ?? "",
      guardianName: student.guardians[0]?.name ?? "",
      guardianPhone: student.guardians[0]?.phone ?? "",
      guardianRelation: student.guardians[0]?.relation ?? "Father",
      cnicOrBForm: student.cnicOrBForm ?? "",
      documents: student.documents ? [...student.documents] : [],
    });
    setOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      phone: form.phone || undefined,
      email: form.email || undefined,
      className: form.className,
      section: form.section,
      campusId: form.campusId,
      status: form.status,
      enrollmentDate: form.enrollmentDate,
      address: form.address || undefined,
      cnicOrBForm: form.cnicOrBForm || undefined,
      documents: form.documents.length ? form.documents : undefined,
      guardians: [
        {
          name: form.guardianName,
          relation: form.guardianRelation,
          phone: form.guardianPhone,
        },
      ],
    };
    if (editing) {
      updateStudent(editing.id, payload);
    } else {
      addStudent(payload);
    }
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title={dict.students.title}
        subtitle={`${filtered.length} students · full CRUD enabled`}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {dict.students.add}
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-[var(--ims-border)] p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ims-text-subtle)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${dict.common.search} by name, admission no, phone…`}
              className="h-10 w-full rounded-md border border-[var(--ims-border)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--ims-primary)] focus:ring-2 focus:ring-[var(--ims-primary-soft)]"
            />
          </div>
          <select
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
            className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3 text-sm"
          >
            <option value="all">{dict.common.all} campuses</option>
            {data.institute.campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3 text-sm"
          >
            <option value="all">{dict.common.all} status</option>
            {["active", "inactive", "transferred", "alumni", "expelled"].map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </select>
        </div>

        <Table
          headers={[
            dict.students.admissionNo,
            dict.students.name,
            dict.students.class,
            "Campus",
            dict.students.guardians,
            dict.students.status,
            dict.common.actions,
          ]}
        >
          {filtered.map((student) => (
            <tr key={student.id} className="hover:bg-[var(--ims-muted)]/40">
              <Td className="font-medium text-[var(--ims-primary)]">
                {student.admissionNo}
              </Td>
              <Td>
                <div>
                  <p className="font-medium">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-xs text-[var(--ims-text-muted)]">
                    {student.phone ?? "—"}
                  </p>
                </div>
              </Td>
              <Td>
                {student.className} · {student.section}
              </Td>
              <Td className="text-xs">{campusName(student.campusId)}</Td>
              <Td>
                <div>
                  <p>{student.guardians[0]?.name}</p>
                  <p className="text-xs text-[var(--ims-text-muted)]">
                    {student.guardians[0]?.phone}
                  </p>
                </div>
              </Td>
              <Td>
                <Badge status={student.status}>{labelize(student.status)}</Badge>
              </Td>
              <Td>
                <div className="flex gap-1">
                  <Link href={`/students/${student.id}`}>
                    <Button variant="ghost" size="sm" className="px-2" title="View">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/id-card/${student.id}`}>
                    <Button variant="ghost" size="sm" className="px-2" title="ID card">
                      <IdCard className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/report-card/${student.id}`}>
                    <Button variant="ghost" size="sm" className="px-2" title="Report card">
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="px-2" onClick={() => openEdit(student)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 text-rose-600"
                    onClick={() => {
                      if (confirm("Delete this student?")) deleteStudent(student.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
        {!filtered.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
            {dict.common.noData}
          </p>
        ) : null}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit student" : "Add student"}
        description="Student profile with guardian details"
        wide
      >
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <Input
            label="First name"
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          <Input
            label="Last name"
            required
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
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
            required
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
          />
          <Input
            label="Class"
            required
            value={form.className}
            onChange={(e) => setForm({ ...form, className: e.target.value })}
          />
          <Input
            label="Section"
            required
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
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
            label="Status"
            value={form.status}
            onChange={(v) => setForm({ ...form, status: v as StudentStatus })}
          >
            {["active", "inactive", "transferred", "alumni", "expelled"].map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </SelectField>
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="CNIC / B-Form"
            value={form.cnicOrBForm}
            onChange={(e) => setForm({ ...form, cnicOrBForm: e.target.value })}
          />
          <Input
            label="Guardian name"
            required
            value={form.guardianName}
            onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
          />
          <Input
            label="Guardian phone"
            required
            value={form.guardianPhone}
            onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
          />
          <Input
            label="Address"
            className="sm:col-span-2"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="sm:col-span-2">
            <DocumentUpload
              title="Student proof documents"
              hint="Upload B-Form, CNIC, photos, leaving certificate and any other proof"
              documents={form.documents}
              onChange={(documents) => setForm({ ...form, documents })}
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {dict.common.cancel}
            </Button>
            <Button type="submit">{editing ? dict.common.save : dict.common.add}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
