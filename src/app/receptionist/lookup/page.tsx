"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PortalShell, RECEPTIONIST_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, labelize } from "@/lib/utils";

export default function ReceptionistLookupPage() {
  const { data } = useData();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data.students.filter((s) => s.status === "active").slice(0, 20);
    return data.students.filter((s) => {
      const name = `${s.firstName} ${s.lastName}`.toLowerCase();
      return (
        name.includes(term) ||
        s.admissionNo.toLowerCase().includes(term) ||
        s.phone?.toLowerCase().includes(term) ||
        `${s.className}-${s.section}`.toLowerCase().includes(term)
      );
    });
  }, [data.students, q]);

  return (
    <PortalShell
      title="Reception Portal"
      subtitle="Front desk"
      nav={RECEPTIONIST_NAV}
      accent="accent"
    >
      <PageHeader
        title="Student lookup"
        subtitle="Find student by name, admission no, phone, or class"
        actions={
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search students…"
            className="h-9 w-72 rounded-md border border-[var(--ims-border)] bg-white px-3 text-sm"
          />
        }
      />
      <Card>
        <Table
          headers={[
            "Admission #",
            "Name",
            "Class",
            "Phone",
            "Fee due",
            "Status",
            "Print",
          ]}
        >
          {rows.map((s) => {
            const due = data.fees
              .filter((f) => f.studentId === s.id)
              .reduce((sum, f) => sum + Math.max(0, f.amount - f.paid), 0);
            return (
              <tr key={s.id}>
                <Td className="font-medium text-[var(--ims-primary)]">{s.admissionNo}</Td>
                <Td>
                  {s.firstName} {s.lastName}
                </Td>
                <Td>
                  {s.className}-{s.section}
                </Td>
                <Td>{s.phone ?? "—"}</Td>
                <Td>{formatCurrency(due)}</Td>
                <Td>
                  <Badge status={s.status === "active" ? "paid" : "pending"}>
                    {labelize(s.status)}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <Link href={`/id-card/${s.id}`}>
                      <Button size="sm" variant="secondary">
                        ID
                      </Button>
                    </Link>
                    <Link href={`/report-card/${s.id}`}>
                      <Button size="sm" variant="secondary">
                        Report
                      </Button>
                    </Link>
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
        {!rows.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
            No students match
          </p>
        ) : null}
      </Card>
    </PortalShell>
  );
}
