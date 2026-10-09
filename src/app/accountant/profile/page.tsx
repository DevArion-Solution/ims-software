"use client";

import { useMemo, useState } from "react";
import { PortalShell, ACCOUNTANT_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Td } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { DocumentsList } from "@/components/ui/DocumentUpload";
import { buildStaffReport } from "@/lib/reports/person";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";

type Tab = "overview" | "salary" | "leaves" | "docs";

export default function AccountantProfilePage() {
  const { session } = useAuth();
  const { data } = useData();
  const [tab, setTab] = useState<Tab>("overview");
  const staffId = session?.linkedStaffId ?? "st3";

  const report = useMemo(
    () => buildStaffReport({ ...data, papers: data.papers }, staffId),
    [data, staffId],
  );

  if (!report) {
    return (
      <PortalShell title="Accounts Portal" subtitle="Fee & finance desk" nav={ACCOUNTANT_NAV}>
        <p className="text-sm text-[var(--ims-text-muted)]">Staff profile not linked.</p>
      </PortalShell>
    );
  }

  const { member } = report;

  return (
    <PortalShell title="Accounts Portal" subtitle="Fee & finance desk" nav={ACCOUNTANT_NAV}>
      <PageHeader
        title="My Staff Profile"
        subtitle={`${member.name} · ${member.employeeNo} · salary, leaves & documents`}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Basic salary" value={formatCurrency(member.salary ?? 0)} />
        <StatCard label="Paid to date" value={report.paidNetLabel} tone="success" />
        <StatCard label="Pending salary" value={report.pendingNetLabel} tone="warning" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["overview", "Overview"],
            ["salary", "Salary history"],
            ["leaves", "Leaves"],
            ["docs", "Documents"],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} size="sm" variant={tab === id ? "primary" : "secondary"} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>

      {tab === "overview" && (
        <Card>
          <CardHeader title="Profile" action={<Badge status={member.status}>{labelize(member.status)}</Badge>} />
          <CardBody className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Role" value={member.role} />
            <Field label="Department" value={member.department} />
            <Field label="Phone" value={member.phone} />
            <Field label="Email" value={member.email} />
            <Field label="Joined" value={formatDate(member.joinDate)} />
            <Field label="CNIC" value={member.cnic ?? "—"} />
          </CardBody>
        </Card>
      )}

      {tab === "salary" && (
        <Card>
          <Table headers={["Month", "Basic", "Allowances", "Deductions", "Net", "Status", "Paid on"]}>
            {report.payroll.map((p) => (
              <tr key={p.id}>
                <Td>{p.month}</Td>
                <Td>{formatCurrency(p.basic)}</Td>
                <Td>{formatCurrency(p.allowances)}</Td>
                <Td>{formatCurrency(p.deductions)}</Td>
                <Td className="font-semibold">{formatCurrency(p.net)}</Td>
                <Td>
                  <Badge status={p.status === "paid" ? "paid" : "pending"}>{labelize(p.status)}</Badge>
                </Td>
                <Td>{p.paidOn ? formatDate(p.paidOn) : "—"}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "leaves" && (
        <Card>
          <Table headers={["From", "To", "Days", "Type", "Status"]}>
            {report.leaves.map((l) => (
              <tr key={l.id}>
                <Td>{formatDate(l.from)}</Td>
                <Td>{formatDate(l.to)}</Td>
                <Td>{l.days}</Td>
                <Td>{labelize(l.type)}</Td>
                <Td>
                  <Badge status={l.status === "approved" ? "paid" : "pending"}>{labelize(l.status)}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "docs" && (
        <Card>
          <CardHeader title="My documents" />
          <CardBody>
            <DocumentsList documents={member.documents} empty="No documents uploaded yet" />
          </CardBody>
        </Card>
      )}
    </PortalShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[var(--ims-text-muted)]">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
