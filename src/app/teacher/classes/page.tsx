"use client";

import { PortalShell, TEACHER_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { teacherScope } from "@/lib/portal/scope";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { PageHeader } from "@/components/ui/PageHeader";

export default function TeacherClassesPage() {
  const { session } = useAuth();
  const { data } = useData();
  const scope = teacherScope(data, session?.linkedStaffId);

  return (
    <PortalShell title="Teacher Portal" subtitle="Classroom workspace" nav={TEACHER_NAV}>
      <PageHeader
        title="My Classes"
        subtitle={`${scope.myClasses.length} classes · ${scope.myStudents.length} students · ${scope.mySubjects.length} subjects`}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {scope.mySubjects.slice(0, 6).map((s) => (
          <Card key={s.id} className="p-4">
            <p className="text-xs text-[var(--ims-text-muted)]">{s.className}</p>
            <p className="font-semibold">{s.name}</p>
          </Card>
        ))}
      </div>
      <Card>
        <Table headers={["Class", "Section", "Role", "Students", "Room"]}>
          {scope.myClasses.map((c) => (
            <tr key={c.id} className="hover:bg-[var(--ims-muted)]/40">
              <Td className="font-medium">{c.name}</Td>
              <Td>{c.section}</Td>
              <Td>
                {c.classTeacher === scope.member?.name ? "Class teacher" : "Subject teacher"}
              </Td>
              <Td>
                {
                  scope.myStudents.filter(
                    (s) => s.className === c.name && s.section === c.section,
                  ).length
                }
                /{c.capacity}
              </Td>
              <Td>{c.room ?? "—"}</Td>
            </tr>
          ))}
        </Table>
        {!scope.myClasses.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
            No classes linked to your staff profile
          </p>
        ) : null}
      </Card>

      <Card className="mt-6">
        <Table headers={["Admission No.", "Student", "Class", "Phone", "Guardian"]}>
          {scope.myStudents.map((s) => (
            <tr key={s.id} className="hover:bg-[var(--ims-muted)]/40">
              <Td className="text-[var(--ims-primary)]">{s.admissionNo}</Td>
              <Td className="font-medium">
                {s.firstName} {s.lastName}
              </Td>
              <Td>
                {s.className}-{s.section}
              </Td>
              <Td>{s.phone ?? "—"}</Td>
              <Td>{s.guardians[0]?.name ?? "—"}</Td>
            </tr>
          ))}
        </Table>
      </Card>
    </PortalShell>
  );
}
