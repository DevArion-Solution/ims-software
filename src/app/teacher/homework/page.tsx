"use client";

import { FormEvent, useState } from "react";
import { PortalShell, TEACHER_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { teacherScope } from "@/lib/portal/scope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, Td } from "@/components/ui/Table";
import { formatDate } from "@/lib/utils";

export default function TeacherHomeworkPage() {
  const { session } = useAuth();
  const { data, addHomework, closeHomework, deleteHomework } = useData();
  const scope = teacherScope(data, session?.linkedStaffId);
  const [form, setForm] = useState({
    title: "",
    description: "",
    className: scope.myClasses[0]?.name ?? "",
    section: scope.myClasses[0]?.section ?? "A",
    subject: scope.mySubjects[0]?.name ?? "",
    dueDate: new Date().toISOString().slice(0, 10),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!scope.member || !form.title.trim()) return;
    addHomework({
      title: form.title,
      description: form.description,
      className: form.className,
      section: form.section,
      subject: form.subject,
      teacherId: scope.staffId,
      teacherName: scope.member.name,
      dueDate: form.dueDate,
    });
    setForm((f) => ({ ...f, title: "", description: "" }));
  }

  return (
    <PortalShell title="Teacher Portal" subtitle="Classroom workspace" nav={TEACHER_NAV}>
      <PageHeader title="Homework" subtitle="Assign work to your classes" />
      <Card className="mb-6 p-4">
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Due date"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Class</span>
            <select
              value={`${form.className}|${form.section}`}
              onChange={(e) => {
                const [className, section] = e.target.value.split("|");
                setForm({ ...form, className: className!, section: section! });
              }}
              className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3"
            >
              {scope.myClasses.map((c) => (
                <option key={c.id} value={`${c.name}|${c.section}`}>
                  {c.name}-{c.section}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Subject</span>
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3"
            >
              {scope.mySubjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
              {!scope.mySubjects.length ? <option value="General">General</option> : null}
            </select>
          </label>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <Button type="submit">Assign homework</Button>
          </div>
        </form>
      </Card>

      <Card>
        <Table headers={["Title", "Class", "Subject", "Due", "Status", ""]}>
          {scope.myHomework.map((h) => (
            <tr key={h.id}>
              <Td>
                <p className="font-medium">{h.title}</p>
                <p className="text-xs text-[var(--ims-text-muted)]">{h.description}</p>
              </Td>
              <Td>
                {h.className}-{h.section}
              </Td>
              <Td>{h.subject}</Td>
              <Td>{formatDate(h.dueDate)}</Td>
              <Td>{h.status}</Td>
              <Td>
                <div className="flex gap-1">
                  {h.status === "assigned" ? (
                    <Button size="sm" variant="secondary" onClick={() => closeHomework(h.id)}>
                      Close
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => deleteHomework(h.id)}>
                    Del
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
        {!scope.myHomework.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">No homework yet</p>
        ) : null}
      </Card>
    </PortalShell>
  );
}
