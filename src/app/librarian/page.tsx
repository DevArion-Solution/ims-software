"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PortalShell, LIBRARIAN_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import { daysOverdue, libraryOverdueFine } from "@/lib/calc";

export default function LibrarianHomePage() {
  const { session } = useAuth();
  const { data } = useData();

  const stats = useMemo(() => {
    const titles = data.books.length;
    const copies = data.books.reduce((s, b) => s + b.copies, 0);
    const available = data.books.reduce((s, b) => s + b.available, 0);
    const open = data.bookIssues.filter((i) => i.status !== "returned");
    const overdue = open.filter((i) => daysOverdue(i.dueDate) > 0);
    const fines = overdue.reduce((s, i) => s + libraryOverdueFine(i.dueDate), 0);
    return { titles, copies, available, open: open.length, overdue: overdue.length, fines };
  }, [data.books, data.bookIssues]);

  const recent = data.bookIssues.slice(0, 6);

  return (
    <PortalShell title="Librarian Portal" subtitle="Catalog & circulation" nav={LIBRARIAN_NAV} accent="accent">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Library desk
          </h1>
          <p className="mt-1 text-sm text-[var(--ims-text-muted)]">
            {session?.user.name} · overdue fine Rs 10/day
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/librarian/catalog">
            <Button size="sm" variant="secondary">
              Catalog
            </Button>
          </Link>
          <Link href="/librarian/issues">
            <Button size="sm">Issue / Return</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Titles" value={stats.titles} />
        <StatCard label="Copies" value={stats.copies} />
        <StatCard label="Available" value={stats.available} tone="success" />
        <StatCard label="On issue" value={stats.open} tone="accent" />
        <StatCard label="Overdue" value={stats.overdue} tone="warning" />
        <StatCard label="Est. fines" value={formatCurrency(stats.fines)} tone="warning" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Recent circulation" />
        <Table headers={["Book", "Member", "Due", "Fine", "Status"]}>
          {recent.map((i) => {
            const overdueDays = i.status === "returned" ? 0 : daysOverdue(i.dueDate);
            return (
              <tr key={i.id}>
                <Td className="font-medium">{i.bookTitle}</Td>
                <Td>{i.memberName}</Td>
                <Td>{formatDate(i.dueDate)}</Td>
                <Td>
                  {formatCurrency(
                    i.status === "returned" ? i.fine : libraryOverdueFine(i.dueDate),
                  )}
                </Td>
                <Td>
                  <Badge
                    status={
                      i.status === "returned"
                        ? "paid"
                        : overdueDays > 0
                          ? "overdue"
                          : "pending"
                    }
                  >
                    {overdueDays > 0 && i.status !== "returned"
                      ? "Overdue"
                      : labelize(i.status)}
                  </Badge>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </PortalShell>
  );
}
