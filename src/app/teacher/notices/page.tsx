"use client";

import { PortalShell, TEACHER_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { teacherScope } from "@/lib/portal/scope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { formatDate, labelize } from "@/lib/utils";

export default function TeacherNoticesPage() {
  const { session } = useAuth();
  const { data } = useData();
  const scope = teacherScope(data, session?.linkedStaffId);

  return (
    <PortalShell title="Teacher Portal" subtitle="Classroom workspace" nav={TEACHER_NAV}>
      <PageHeader title="Notices" subtitle="School notices for staff" />
      <div className="space-y-3">
        {scope.myNotices.map((n) => (
          <Card key={n.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-[var(--ims-text)]">{n.title}</p>
                <p className="mt-1 text-sm text-[var(--ims-text-muted)]">{n.body}</p>
              </div>
              <p className="text-xs text-[var(--ims-text-muted)]">
                {labelize(n.channel)} · {formatDate(n.sentOn ?? n.createdOn)}
              </p>
            </div>
          </Card>
        ))}
        {!scope.myNotices.length ? (
          <Card className="p-10 text-center text-sm text-[var(--ims-text-muted)]">
            No staff notices yet
          </Card>
        ) : null}
      </div>
    </PortalShell>
  );
}
