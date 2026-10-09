"use client";

import { PortalShell, PARENT_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { useParentChild } from "@/components/providers/ParentChildProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ChildSwitcher } from "@/components/parent/ChildSwitcher";
import { formatDate } from "@/lib/utils";

export default function ParentHomeworkPage() {
  const { data } = useData();
  const { child } = useParentChild();
  const rows = data.homework.filter(
    (h) =>
      child &&
      h.className === child.className &&
      (!h.section || h.section === child.section) &&
      h.status === "assigned",
  );

  return (
    <PortalShell title="Parent Portal" subtitle="Your child's progress" nav={PARENT_NAV} accent="accent">
      <PageHeader title="Homework" subtitle="Assigned work for this child" actions={<ChildSwitcher />} />
      <div className="space-y-3">
        {rows.map((h) => (
          <Card key={h.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{h.title}</p>
                <p className="mt-1 text-sm text-[var(--ims-text-muted)]">{h.description}</p>
                <p className="mt-2 text-xs text-[var(--ims-text-muted)]">
                  {h.subject} · {h.teacherName} · {h.className}-{h.section}
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
