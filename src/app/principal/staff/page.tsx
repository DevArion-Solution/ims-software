"use client";

import { useMemo, useState } from "react";
import { PortalShell, PRINCIPAL_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";

export default function PrincipalStaffPage() {
  const { data } = useData();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.staff.filter((s) => {
      if (!term) return true;
      return (
        s.name.toLowerCase().includes(term) ||
        s.role.toLowerCase().includes(term) ||
        s.department.toLowerCase().includes(term) ||
        s.employeeNo.toLowerCase().includes(term)
      );
    });
  }, [data.staff, q]);

  const leaveByStaff = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of data.leaves) {
      if (l.status === "approved") {
        map.set(l.staffId, (map.get(l.staffId) ?? 0) + l.days);
      }
    }
    return map;
  }, [data.leaves]);

  return (
    <PortalShell title="Principal Portal" subtitle="School leadership" nav={PRINCIPAL_NAV}>
      <PageHeader
        title="Staff"
        subtitle="Directory and approved leave days"
        actions={
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, role, dept…"
            className="h-9 w-64 rounded-md border border-[var(--ims-border)] bg-white px-3 text-sm"
          />
        }
      />
      <Card>
        <Table
          headers={[
            "Emp #",
            "Name",
            "Role",
            "Department",
            "Joined",
            "Salary",
            "Leave days",
            "Status",
          ]}
        >
          {rows.map((s) => (
            <tr key={s.id}>
              <Td className="font-medium text-[var(--ims-primary)]">{s.employeeNo}</Td>
              <Td>{s.name}</Td>
              <Td>{s.role}</Td>
              <Td>{s.department}</Td>
              <Td>{formatDate(s.joinDate)}</Td>
              <Td>{formatCurrency(s.salary ?? 0)}</Td>
              <Td>{leaveByStaff.get(s.id) ?? 0}</Td>
              <Td>
                <Badge status={s.status === "active" ? "paid" : "pending"}>
                  {labelize(s.status)}
                </Badge>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </PortalShell>
  );
}
