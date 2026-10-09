"use client";

import { useMemo } from "react";
import { PortalShell, STUDENT_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { studentScope } from "@/lib/portal/scope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

export default function StudentHomeworkPage() {
  const { session } = useAuth();
  const { data } = useData();
  const scope = studentScope(data, session?.linkedStudentId);
  const rows = useMemo(
    () =>
      [...scope.homework].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [scope.homework],
  );

  return (
    <PortalShell title="Student Portal" subtitle="My academics" nav={STUDENT_NAV} accent="accent">
      <PageHeader
        title="Homework"
        subtitle={scope.me ? `${scope.me.className}-${scope.me.section}` : "Assigned work"}
      />
      <div className="space-y-3">
        {rows.map((h) => (
          <Card key={h.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{h.title}</p>
                <p className="mt-1 text-sm text-[var(--ims-text-muted)]">{h.description}</p>
                <p className="mt-2 text-xs text-[var(--ims-text-muted)]">
                  {h.subject} · {h.teacherName}
                </p>
              </div>
              <p className="text-sm font-medium">Due {formatDate(h.dueDate)}</p>
            </div>
          </Card>
        ))}
        {!rows.length ? (
          <Card className="p-10 text-center text-sm text-[var(--ims-text-muted)]">
            No open homework
          </Card>
        ) : null}
      </div>
    </PortalShell>
  );
}
