"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { PortalShell, RECEPTIONIST_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField } from "@/components/ui/Modal";
import { formatDate, labelize } from "@/lib/utils";

export default function ReceptionistInquiriesPage() {
  const { data, addAdmission, updateAdmissionStatus } = useData();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    applicantName: "",
    fatherName: "",
    applyingFor: "Class 1",
    phone: "",
    email: "",
    source: "Walk-in",
    notes: "",
  });

  const rows = data.admissions.filter(
    (a) =>
      a.status === "inquiry" ||
      a.status === "applied" ||
      a.status === "under_review",
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    addAdmission({
      applicantName: form.applicantName,
      fatherName: form.fatherName,
      applyingFor: form.applyingFor,
      phone: form.phone,
      email: form.email || undefined,
      campusId: data.institute.campuses[0]?.id ?? "camp1",
      source: form.source,
      notes: form.notes || undefined,
      status: "inquiry",
    });
    setOpen(false);
    setForm({
      applicantName: "",
      fatherName: "",
      applyingFor: "Class 1",
      phone: "",
      email: "",
      source: "Walk-in",
      notes: "",
    });
  }

  return (
    <PortalShell
      title="Reception Portal"
      subtitle="Front desk"
      nav={RECEPTIONIST_NAV}
      accent="accent"
    >
      <PageHeader
        title="Inquiries"
        subtitle="Walk-in and phone admission inquiries"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Log inquiry
          </Button>
        }
      />
      <Card>
        <Table headers={["Applicant", "Father", "Class", "Phone", "Source", "Status", "Actions"]}>
          {rows.map((a) => (
            <tr key={a.id}>
              <Td className="font-medium">{a.applicantName}</Td>
              <Td>{a.fatherName}</Td>
              <Td>{a.applyingFor}</Td>
              <Td>{a.phone}</Td>
              <Td>{a.source ?? "—"}</Td>
              <Td>
                <Badge status="pending">{labelize(a.status)}</Badge>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {a.status === "inquiry" ? (
                    <Button
                      size="sm"
                      onClick={() => updateAdmissionStatus(a.id, "applied")}
                    >
                      Mark applied
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => updateAdmissionStatus(a.id, "under_review")}
                  >
                    Send to review
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
        {!rows.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
            No open inquiries
          </p>
        ) : null}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Log inquiry">
        <form className="space-y-3" onSubmit={submit}>
          <Input
            label="Applicant name"
            required
            value={form.applicantName}
            onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
          />
          <Input
            label="Father name"
            required
            value={form.fatherName}
            onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
          />
          <SelectField
            label="Applying for"
            value={form.applyingFor}
            onChange={(v) => setForm({ ...form, applyingFor: v })}
          >
            {data.classes.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}-{c.section}
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
          <SelectField
            label="Source"
            value={form.source}
            onChange={(v) => setForm({ ...form, source: v })}
          >
            <option value="Walk-in">Walk-in</option>
            <option value="Phone">Phone</option>
            <option value="Website">Website</option>
            <option value="Referral">Referral</option>
          </SelectField>
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save inquiry</Button>
          </div>
        </form>
      </Modal>
    </PortalShell>
  );
}
