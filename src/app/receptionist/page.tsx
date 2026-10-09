"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PortalShell, RECEPTIONIST_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, labelize } from "@/lib/utils";

export default function ReceptionistHomePage() {
  const { session } = useAuth();
  const { data } = useData();

  const inquiries = useMemo(
    () =>
      data.admissions.filter(
        (a) => a.status === "inquiry" || a.status === "applied",
      ),
    [data.admissions],
  );

  return (
    <PortalShell
      title="Reception Portal"
      subtitle="Front desk"
      nav={RECEPTIONIST_NAV}
      accent="accent"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Front desk
          </h1>
          <p className="mt-1 text-sm text-[var(--ims-text-muted)]">
            {session?.user.name} · inquiries, visitors, student lookup
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/receptionist/inquiries">
            <Button size="sm">New inquiry</Button>
          </Link>
          <Link href="/receptionist/lookup">
            <Button size="sm" variant="secondary">
              Lookup
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open inquiries" value={inquiries.length} tone="warning" />
        <StatCard
          label="Active students"
          value={data.students.filter((s) => s.status === "active").length}
          tone="accent"
        />
        <StatCard
          label="Pending admissions"
          value={
            data.admissions.filter(
              (a) =>
                a.status === "under_review" ||
                a.status === "applied" ||
                a.status === "inquiry",
            ).length
          }
        />
        <StatCard label="Campuses" value={data.institute.campuses.length} />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Recent inquiries"
          action={
            <Link href="/receptionist/inquiries">
              <Button size="sm" variant="secondary">
                All
              </Button>
            </Link>
          }
        />
        <Table headers={["Applicant", "Class", "Phone", "Status", "Date"]}>
          {inquiries.slice(0, 6).map((a) => (
            <tr key={a.id}>
              <Td className="font-medium">{a.applicantName}</Td>
              <Td>{a.applyingFor}</Td>
              <Td>{a.phone}</Td>
              <Td>
                <Badge status="pending">{labelize(a.status)}</Badge>
              </Td>
              <Td>{formatDate(a.appliedOn)}</Td>
            </tr>
          ))}
        </Table>
        {!inquiries.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
            No open inquiries
          </p>
        ) : null}
      </Card>
    </PortalShell>
  );
}
