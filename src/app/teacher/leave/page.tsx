"use client";

import { FormEvent, useState } from "react";
import { PortalShell, TEACHER_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { teacherScope } from "@/lib/portal/scope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatDate, labelize } from "@/lib/utils";
import type { LeaveType } from "@/types";

export default function TeacherLeavePage() {
  const { session } = useAuth();
  const { data, requestLeave } = useData();
  const scope = teacherScope(data, session?.linkedStaffId);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<LeaveType>("casual");
  const [msg, setMsg] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    requestLeave({ staffId: scope.staffId, from, to, type });
    setMsg("Leave request submitted for approval");
    setFrom("");
    setTo("");
  }

  const leaves = data.leaves.filter((l) => l.staffId === scope.staffId);

  return (
    <PortalShell title="Teacher Portal" subtitle="Classroom workspace" nav={TEACHER_NAV}>
      <PageHeader title="Leave" subtitle="Apply and track leave requests" />
      <Card className="mb-6 p-4">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
          <Input label="From" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" required value={to} onChange={(e) => setTo(e.target.value)} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3"
            >
              <option value="casual">Casual</option>
              <option value="sick">Sick</option>
              <option value="annual">Annual</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button type="submit">Apply leave</Button>
          </div>
        </form>
        {msg ? <p className="mt-3 text-sm text-emerald-700">{msg}</p> : null}
      </Card>
      <Card>
        <Table headers={["From", "To", "Days", "Type", "Status"]}>
          {leaves.map((l) => (
            <tr key={l.id}>
              <Td>{formatDate(l.from)}</Td>
              <Td>{formatDate(l.to)}</Td>
              <Td>{l.days}</Td>
              <Td>{labelize(l.type)}</Td>
              <Td>
                <Badge status={l.status}>{l.status}</Badge>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </PortalShell>
  );
}
