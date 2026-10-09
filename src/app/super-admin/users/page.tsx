"use client";

import { useState } from "react";
import { Plus, UserCog } from "lucide-react";
import { usePlatform } from "@/components/providers/PlatformProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, Field, SelectField } from "@/components/ui/Modal";
import { Table, Td } from "@/components/ui/Table";
import { formatDate, labelize } from "@/lib/utils";
import type { PlatformStaffRole, PlatformUser } from "@/types/platform";

const ROLE_PERMS: Record<PlatformStaffRole, string[]> = {
  owner: ["*"],
  support: ["schools.read", "schools.impersonate", "registrations.manage", "audit.read"],
  sales: ["schools.read", "registrations.manage", "plans.read", "billing.read"],
  billing: ["billing.manage", "invoices.manage", "schools.read"],
};

export default function PlatformUsersPage() {
  const { data, savePlatformUser, togglePlatformUser } = usePlatform();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PlatformUser>({
    id: "",
    name: "",
    email: "",
    role: "support",
    active: true,
    lastActiveAt: new Date().toISOString(),
    permissions: ROLE_PERMS.support,
  });

  function openCreate() {
    setForm({
      id: `pu_${Math.random().toString(36).slice(2, 7)}`,
      name: "",
      email: "",
      role: "support",
      active: true,
      lastActiveAt: new Date().toISOString(),
      permissions: ROLE_PERMS.support,
    });
    setOpen(true);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sa-gold)]">
            Control
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--sa-text)]">
            Platform users
          </h1>
          <p className="mt-1 text-sm text-[var(--sa-muted)]">
            Owner, support, sales and billing staff who run IMS Cloud — not school users.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[var(--sa-ink)] hover:bg-[var(--sa-ink-2)]">
          <Plus className="h-4 w-4" />
          Add staff
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--sa-border)] bg-white shadow-[var(--sa-shadow)]">
        <Table headers={["Person", "Role", "Permissions", "Last active", "Status", ""]}>
          {data.users.map((user) => (
            <tr key={user.id}>
              <Td>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--sa-cyan-soft)] text-[var(--sa-cyan)]">
                    <UserCog className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-[var(--sa-muted)]">{user.email}</p>
                  </div>
                </div>
              </Td>
              <Td>{labelize(user.role)}</Td>
              <Td>
                <p className="max-w-xs truncate text-xs text-[var(--sa-muted)]">
                  {user.permissions.join(", ")}
                </p>
              </Td>
              <Td>{formatDate(user.lastActiveAt)}</Td>
              <Td>
                <Badge status={user.active ? "active" : "inactive"}>
                  {user.active ? "active" : "inactive"}
                </Badge>
              </Td>
              <Td>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setForm({ ...user });
                      setOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => togglePlatformUser(user.id)}>
                    {user.active ? "Disable" : "Enable"}
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Platform staff">
        <div className="grid gap-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <SelectField
            label="Role"
            value={form.role}
            onChange={(v) => {
              const role = v as PlatformStaffRole;
              setForm({ ...form, role, permissions: ROLE_PERMS[role] });
            }}
          >
            <option value="owner">Owner</option>
            <option value="support">Support</option>
            <option value="sales">Sales</option>
            <option value="billing">Billing</option>
          </SelectField>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[var(--sa-ink)] hover:bg-[var(--sa-ink-2)]"
            onClick={() => {
              if (!form.name.trim() || !form.email.trim()) return;
              savePlatformUser(form);
              setOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
