"use client";

import { PortalShell, TEACHER_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { teacherScope } from "@/lib/portal/scope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";

export default function TeacherTimetablePage() {
  const { session } = useAuth();
  const { data } = useData();
  const scope = teacherScope(data, session?.linkedStaffId);
  const rows = [...scope.myTimetable].sort((a, b) =>
    a.day === b.day ? a.period - b.period : a.day.localeCompare(b.day),
  );

  return (
    <PortalShell title="Teacher Portal" subtitle="Classroom workspace" nav={TEACHER_NAV}>
      <PageHeader
        title="My Timetable"
        subtitle={scope.member ? `Slots for ${scope.member.name}` : "Weekly teaching slots"}
      />
      <Card>
        <Table headers={["Day", "Period", "Class", "Subject", "Room"]}>
          {rows.map((t) => (
            <tr key={t.id}>
              <Td>{t.day}</Td>
              <Td>{t.period}</Td>
              <Td>
                {t.className}-{t.section}
              </Td>
              <Td className="font-medium">{t.subject}</Td>
              <Td>{t.room ?? "—"}</Td>
            </tr>
          ))}
        </Table>
        {!rows.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
            No timetable slots assigned to you
          </p>
        ) : null}
      </Card>
    </PortalShell>
  );
}
