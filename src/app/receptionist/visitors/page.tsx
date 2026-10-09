"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PortalShell, RECEPTIONIST_NAV } from "@/components/layout/PortalShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";

interface VisitorLog {
  id: string;
  name: string;
  phone: string;
  purpose: string;
  meetingWith: string;
  inAt: string;
  outAt?: string;
}

const STORAGE_KEY = "ims.reception.visitors";

export default function ReceptionistVisitorsPage() {
  const [visitors, setVisitors] = useState<VisitorLog[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    purpose: "Meeting",
    meetingWith: "",
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setVisitors(JSON.parse(raw) as VisitorLog[]);
    } catch {
      // ignore
    }
  }, []);

  function persist(next: VisitorLog[]) {
    setVisitors(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const entry: VisitorLog = {
      id: `v-${Date.now()}`,
      name: form.name,
      phone: form.phone,
      purpose: form.purpose,
      meetingWith: form.meetingWith,
      inAt: new Date().toISOString(),
    };
    persist([entry, ...visitors]);
    setOpen(false);
    setForm({ name: "", phone: "", purpose: "Meeting", meetingWith: "" });
  }

  function checkOut(id: string) {
    persist(
      visitors.map((v) =>
        v.id === id && !v.outAt ? { ...v, outAt: new Date().toISOString() } : v,
      ),
    );
  }

  return (
    <PortalShell
      title="Reception Portal"
      subtitle="Front desk"
      nav={RECEPTIONIST_NAV}
      accent="accent"
    >
      <PageHeader
        title="Visitors"
        subtitle="Front desk visitor log (saved on this device)"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Check in
          </Button>
        }
      />
      <Card>
        <Table headers={["Name", "Phone", "Purpose", "Meeting", "In", "Out", ""]}>
          {visitors.map((v) => (
            <tr key={v.id}>
              <Td className="font-medium">{v.name}</Td>
              <Td>{v.phone}</Td>
              <Td>{v.purpose}</Td>
              <Td>{v.meetingWith || "—"}</Td>
              <Td>{formatDate(v.inAt.slice(0, 10))}</Td>
              <Td>{v.outAt ? formatDate(v.outAt.slice(0, 10)) : "On campus"}</Td>
              <Td>
                {!v.outAt ? (
                  <Button size="sm" variant="secondary" onClick={() => checkOut(v.id)}>
                    Check out
                  </Button>
                ) : (
                  "—"
                )}
              </Td>
            </tr>
          ))}
        </Table>
        {!visitors.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
            No visitors logged yet
          </p>
        ) : null}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Visitor check-in">
        <form className="space-y-3" onSubmit={submit}>
          <Input
            label="Visitor name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Phone"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <SelectField
            label="Purpose"
            value={form.purpose}
            onChange={(v) => setForm({ ...form, purpose: v })}
          >
            <option value="Meeting">Meeting</option>
            <option value="Admission">Admission</option>
            <option value="Fee payment">Fee payment</option>
            <option value="Delivery">Delivery</option>
            <option value="Other">Other</option>
          </SelectField>
          <Input
            label="Meeting with"
            value={form.meetingWith}
            onChange={(e) => setForm({ ...form, meetingWith: e.target.value })}
            placeholder="Staff / office name"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Check in</Button>
          </div>
        </form>
      </Modal>
    </PortalShell>
  );
}
