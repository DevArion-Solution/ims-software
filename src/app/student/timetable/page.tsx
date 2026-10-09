"use client";

import { useMemo } from "react";
import { PortalShell, STUDENT_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { studentScope } from "@/lib/portal/scope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StudentTimetablePage() {
  const { session } = useAuth();
  const { data } = useData();
  const scope = studentScope(data, session?.linkedStudentId);
  const slots = scope.timetable;

  const byDay = useMemo(() => {
    const map = new Map<string, typeof slots>();
    for (const day of DAYS) map.set(day, []);
    for (const t of slots) {
      const list = map.get(t.day) ?? [];
      list.push(t);
      map.set(t.day, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.period - b.period);
    }
    return map;
  }, [slots]);

  return (
    <PortalShell title="Student Portal" subtitle="My academics" nav={STUDENT_NAV} accent="accent">
      <PageHeader
        title="My Timetable"
        subtitle={
          scope.me ? `${scope.me.className}-${scope.me.section}` : "Class schedule"
        }
      />
      <div className="mb-6 grid gap-3 lg:grid-cols-3">
        {DAYS.map((day) => {
          const daySlots = byDay.get(day) ?? [];
          return (
            <Card key={day} className="p-4">
              <p className="mb-2 text-sm font-semibold">{day}</p>
              {daySlots.length ? (
                <ul className="space-y-2">
                  {daySlots.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-md border border-[var(--ims-border)] bg-[var(--ims-muted)]/30 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">P{t.period}</span> · {t.subject}
                      <p className="text-xs text-[var(--ims-text-muted)]">
                        {t.teacher}
                        {t.room ? ` · ${t.room}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--ims-text-muted)]">No periods</p>
              )}
            </Card>
          );
        })}
      </div>
      <Card>
        <Table headers={["Day", "Period", "Subject", "Teacher", "Room"]}>
          {slots.map((t) => (
            <tr key={t.id}>
              <Td>{t.day}</Td>
              <Td>{t.period}</Td>
              <Td className="font-medium">{t.subject}</Td>
              <Td>{t.teacher}</Td>
              <Td>{t.room ?? "—"}</Td>
            </tr>
          ))}
        </Table>
        {!slots.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
            No timetable slots for your class yet. Ask admin to add them in Academics.
          </p>
        ) : null}
      </Card>
    </PortalShell>
  );
}
