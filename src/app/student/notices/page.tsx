"use client";

import { PortalShell, STUDENT_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate, labelize } from "@/lib/utils";

export default function StudentNoticesPage() {
  const { data } = useData();
  const notices = data.notices.filter(
    (n) => n.status === "sent" && (n.audience === "all" || n.audience === "students"),
  );

  return (
    <PortalShell title="Student Portal" subtitle="My academics" nav={STUDENT_NAV} accent="accent">
      <PageHeader title="Notices" subtitle="Announcements for students" />
      <div className="grid gap-3">
        {notices.map((n) => (
          <Card key={n.id}>
            <CardBody>
              <h3 className="font-medium">{n.title}</h3>
              <p className="mt-1 text-sm text-[var(--ims-text-muted)]">{n.body}</p>
              <p className="mt-2 text-xs text-[var(--ims-text-subtle)]">
                {formatDate(n.createdOn)} · {labelize(n.channel)}
              </p>
            </CardBody>
          </Card>
        ))}
      </div>
    </PortalShell>
  );
}
