"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField } from "@/components/ui/Modal";
import { useData } from "@/components/providers/DataProvider";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** Common PK school / college class labels */
const CLASS_PRESETS = [
  "Nursery",
  "Prep",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "1st Year",
  "2nd Year",
] as const;

const SECTION_PRESETS = ["A", "B", "C", "D", "E", "F"] as const;

type ClashKind = "teacher" | "room" | "class";

function findClashes(
  slots: {
    day: string;
    period: number;
    teacher: string;
    room?: string;
    className: string;
    section: string;
    subject: string;
  }[],
  kind: ClashKind,
) {
  const seen = new Map<string, string[]>();
  for (const slot of slots) {
    let key = "";
    if (kind === "teacher") {
      if (!slot.teacher.trim()) continue;
      key = `${slot.day}|${slot.period}|${slot.teacher.trim().toLowerCase()}`;
    } else if (kind === "room") {
      if (!slot.room?.trim()) continue;
      key = `${slot.day}|${slot.period}|${slot.room.trim().toLowerCase()}`;
    } else {
      key = `${slot.day}|${slot.period}|${slot.className.trim().toLowerCase()}|${slot.section.trim().toLowerCase()}`;
    }
    const label = `${slot.className}-${slot.section} (${slot.subject}${slot.teacher ? ` · ${slot.teacher}` : ""}${slot.room ? ` · ${slot.room}` : ""})`;
    const list = seen.get(key) ?? [];
    list.push(label);
    seen.set(key, list);
  }
  return [...seen.entries()]
    .filter(([, labels]) => labels.length > 1)
    .map(([key, labels]) => {
      const parts = key.split("|");
      return {
        day: parts[0],
        period: parts[1],
        entity: kind === "class" ? `${parts[2]}-${parts[3]}` : parts[2],
        labels,
      };
    });
}

export default function AcademicsPage() {
  const {
    data,
    addClass,
    deleteClass,
    addSubject,
    deleteSubject,
    addTimetableSlot,
    deleteTimetableSlot,
  } = useData();
  const [tab, setTab] = useState<"classes" | "subjects" | "timetable">("classes");
  const [classOpen, setClassOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [ttOpen, setTtOpen] = useState(false);
  const [printClass, setPrintClass] = useState<string>("");
  const [classError, setClassError] = useState("");
  const [classCustom, setClassCustom] = useState(false);
  const [sectionCustom, setSectionCustom] = useState(false);

  const [classForm, setClassForm] = useState({
    name: "Class 1",
    section: "A",
    campusId: data.institute.campuses[0]?.id ?? "camp1",
    classTeacher: "",
    capacity: "40",
    enrolled: "0",
    room: "",
  });
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
    className: data.classes[0]?.name ?? "Class 8",
    teacher: "",
    periodsPerWeek: "5",
  });
  const [ttForm, setTtForm] = useState({
    day: "Monday",
    period: "1",
    className: data.classes[0]?.name ?? "Class 8",
    section: data.classes[0]?.section ?? "A",
    subject: "",
    teacher: "",
    room: "",
  });

  const campusName = (id: string) =>
    data.institute.campuses.find((c) => c.id === id)?.name ?? id;

  const overCapacity = useMemo(
    () => data.classes.filter((c) => c.enrolled > c.capacity),
    [data.classes],
  );

  const teacherConflicts = useMemo(
    () => findClashes(data.timetable, "teacher"),
    [data.timetable],
  );
  const roomConflicts = useMemo(
    () => findClashes(data.timetable, "room"),
    [data.timetable],
  );
  const classConflicts = useMemo(
    () => findClashes(data.timetable, "class"),
    [data.timetable],
  );

  const pendingTeacher = useMemo(() => {
    if (!ttForm.teacher.trim()) return null;
    return (
      data.timetable.find(
        (t) =>
          t.day === ttForm.day &&
          t.period === Number(ttForm.period) &&
          t.teacher.trim().toLowerCase() === ttForm.teacher.trim().toLowerCase(),
      ) ?? null
    );
  }, [data.timetable, ttForm]);

  const pendingRoom = useMemo(() => {
    if (!ttForm.room.trim()) return null;
    return (
      data.timetable.find(
        (t) =>
          t.day === ttForm.day &&
          t.period === Number(ttForm.period) &&
          (t.room ?? "").trim().toLowerCase() === ttForm.room.trim().toLowerCase(),
      ) ?? null
    );
  }, [data.timetable, ttForm]);

  const pendingClass = useMemo(() => {
    return (
      data.timetable.find(
        (t) =>
          t.day === ttForm.day &&
          t.period === Number(ttForm.period) &&
          t.className.trim().toLowerCase() === ttForm.className.trim().toLowerCase() &&
          t.section.trim().toLowerCase() === ttForm.section.trim().toLowerCase(),
      ) ?? null
    );
  }, [data.timetable, ttForm]);

  const classOptions = useMemo(() => {
    const set = new Set(
      data.classes.map((c) => `${c.name}-${c.section}`).concat(
        data.timetable.map((t) => `${t.className}-${t.section}`),
      ),
    );
    return [...set].sort();
  }, [data.classes, data.timetable]);

  const gridClass = printClass || classOptions[0] || "";
  const gridSlots = useMemo(() => {
    if (!gridClass) return [];
    const [name, ...rest] = gridClass.split("-");
    const section = rest.join("-") || "A";
    return data.timetable.filter(
      (t) => t.className === name && t.section === section,
    );
  }, [data.timetable, gridClass]);

  const periods = useMemo(() => {
    const nums = new Set(data.timetable.map((t) => t.period));
    if (!nums.size) return [1, 2, 3, 4, 5, 6];
    return [...nums].sort((a, b) => a - b);
  }, [data.timetable]);

  function slotConflicted(t: (typeof data.timetable)[0]) {
    const teacherHit = teacherConflicts.some(
      (c) =>
        c.day === t.day &&
        Number(c.period) === t.period &&
        c.entity === t.teacher.trim().toLowerCase(),
    );
    const roomHit =
      !!t.room &&
      roomConflicts.some(
        (c) =>
          c.day === t.day &&
          Number(c.period) === t.period &&
          c.entity === t.room!.trim().toLowerCase(),
      );
    const classHit = classConflicts.some(
      (c) =>
        c.day === t.day &&
        Number(c.period) === t.period &&
        c.entity === `${t.className.trim().toLowerCase()}-${t.section.trim().toLowerCase()}`,
    );
    return { teacherHit, roomHit, classHit, any: teacherHit || roomHit || classHit };
  }

  function printTimetable() {
    window.print();
  }

  return (
    <div>
      <PageHeader
        title="Academics"
        subtitle="Create class + section → subjects → timetable · Clash checks included"
        actions={
          <>
            {tab === "classes" && (
              <Button
                size="sm"
                onClick={() => {
                  setClassError("");
                  setClassOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add class / section
              </Button>
            )}
            {tab === "subjects" && (
              <Button size="sm" onClick={() => setSubjectOpen(true)}>
                <Plus className="h-4 w-4" /> Add subject
              </Button>
            )}
            {tab === "timetable" && (
              <>
                <Button size="sm" variant="secondary" onClick={printTimetable}>
                  <Printer className="h-4 w-4" /> Print grid
                </Button>
                <Button size="sm" onClick={() => setTtOpen(true)}>
                  <Plus className="h-4 w-4" /> Add slot
                </Button>
              </>
            )}
          </>
        }
      />

      {(overCapacity.length > 0 ||
        teacherConflicts.length > 0 ||
        roomConflicts.length > 0 ||
        classConflicts.length > 0) && (
        <div className="mb-4 space-y-2 print:hidden">
          {overCapacity.map((c) => (
            <div
              key={c.id}
              className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Capacity warning: <strong>{c.name}-{c.section}</strong> has{" "}
                {c.enrolled} enrolled (capacity {c.capacity}).
              </span>
            </div>
          ))}
          {teacherConflicts.map((c) => (
            <div
              key={`t-${c.day}-${c.period}-${c.entity}`}
              className="flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-900"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Teacher clash: <strong>{c.entity}</strong> on {c.day} period {c.period} —{" "}
                {c.labels.join(" vs ")}.
              </span>
            </div>
          ))}
          {roomConflicts.map((c) => (
            <div
              key={`r-${c.day}-${c.period}-${c.entity}`}
              className="flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-950"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Room clash: <strong>{c.entity}</strong> on {c.day} period {c.period} —{" "}
                {c.labels.join(" vs ")}.
              </span>
            </div>
          ))}
          {classConflicts.map((c) => (
            <div
              key={`c-${c.day}-${c.period}-${c.entity}`}
              className="flex items-start gap-2 rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-sm text-violet-950"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Class clash: <strong>{c.entity}</strong> on {c.day} period {c.period} —{" "}
                {c.labels.join(" vs ")}.
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex gap-2 print:hidden">
        {(["classes", "subjects", "timetable"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "primary" : "secondary"}
            onClick={() => setTab(t)}
          >
            {t === "classes" ? "Classes" : t === "subjects" ? "Subjects" : "Timetable"}
          </Button>
        ))}
      </div>

      {tab === "classes" && (
        <Card className="print:hidden">
          <p className="mb-3 text-xs text-[var(--ims-text-muted)]">
            Har class + section alag row hoti hai (e.g. Class 5-A, Class 5-B). Students add
            karte waqt yehi class/section select hota hai. Phir Subjects + Timetable tabs.
          </p>
          <Table headers={["Class", "Section", "Campus", "Teacher", "Strength", "Room", "Actions"]}>
            {data.classes.map((c) => (
              <tr key={c.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td className="font-medium">{c.name}</Td>
                <Td>{c.section}</Td>
                <Td className="text-xs">{campusName(c.campusId)}</Td>
                <Td>{c.classTeacher ?? "—"}</Td>
                <Td>
                  <span className={c.enrolled > c.capacity ? "font-semibold text-amber-700" : ""}>
                    {c.enrolled}/{c.capacity}
                  </span>
                  {c.enrolled > c.capacity ? (
                    <span className="ml-1 text-xs text-amber-700">over</span>
                  ) : null}
                </Td>
                <Td>{c.room ?? "—"}</Td>
                <Td>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 text-rose-600"
                    onClick={() => {
                      if (confirm("Delete class?")) deleteClass(c.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "subjects" && (
        <Card className="print:hidden">
          <Table headers={["Code", "Subject", "Class", "Teacher", "Periods/week", "Actions"]}>
            {data.subjects.map((s) => (
              <tr key={s.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td className="font-medium text-[var(--ims-primary)]">{s.code}</Td>
                <Td>{s.name}</Td>
                <Td>{s.className}</Td>
                <Td>{s.teacher ?? "—"}</Td>
                <Td>{s.periodsPerWeek}</Td>
                <Td>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 text-rose-600"
                    onClick={() => deleteSubject(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "timetable" && (
        <div className="space-y-4">
          <Card className="print:shadow-none print:border-0">
            <CardHeader
              title={`Weekly grid${gridClass ? ` · ${gridClass}` : ""}`}
              action={
                <div className="flex items-center gap-2 print:hidden">
                  <select
                    className="h-8 rounded border border-[var(--ims-border)] px-2 text-xs"
                    value={gridClass}
                    onChange={(e) => setPrintClass(e.target.value)}
                  >
                    {classOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    {!classOptions.length ? <option value="">No classes</option> : null}
                  </select>
                </div>
              }
            />
            <div className="overflow-x-auto p-2">
              <table className="w-full min-w-[640px] border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border border-[var(--ims-border)] bg-[var(--ims-muted)]/50 px-2 py-2 text-left">
                      Period
                    </th>
                    {DAYS.map((d) => (
                      <th
                        key={d}
                        className="border border-[var(--ims-border)] bg-[var(--ims-muted)]/50 px-2 py-2 text-left"
                      >
                        {d.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p}>
                      <td className="border border-[var(--ims-border)] px-2 py-2 font-semibold">
                        P{p}
                      </td>
                      {DAYS.map((d) => {
                        const cell = gridSlots.find(
                          (s) => s.day === d && s.period === p,
                        );
                        const clash = cell ? slotConflicted(cell) : null;
                        return (
                          <td
                            key={d}
                            className={`border border-[var(--ims-border)] px-2 py-2 align-top ${
                              clash?.any ? "bg-rose-50" : ""
                            }`}
                          >
                            {cell ? (
                              <div>
                                <div className="font-medium">{cell.subject}</div>
                                <div className="text-[var(--ims-text-muted)]">
                                  {cell.teacher}
                                  {cell.room ? ` · ${cell.room}` : ""}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[var(--ims-text-muted)]">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!gridSlots.length ? (
                <p className="p-4 text-center text-sm text-[var(--ims-text-muted)] print:hidden">
                  No slots for this class yet
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="print:hidden">
            <CardHeader title="All slots" />
            <Table headers={["Day", "Period", "Class", "Subject", "Teacher", "Room", "Actions"]}>
              {data.timetable.map((t) => {
                const clash = slotConflicted(t);
                return (
                  <tr
                    key={t.id}
                    className={
                      clash.any
                        ? "bg-rose-50 hover:bg-rose-50/80"
                        : "hover:bg-[var(--ims-muted)]/40"
                    }
                  >
                    <Td>{t.day}</Td>
                    <Td>{t.period}</Td>
                    <Td>
                      {t.className}-{t.section}
                    </Td>
                    <Td>{t.subject}</Td>
                    <Td>
                      {t.teacher}
                      {clash.teacherHit ? (
                        <span className="ml-1 text-xs text-rose-700">teacher</span>
                      ) : null}
                    </Td>
                    <Td>
                      {t.room ?? "—"}
                      {clash.roomHit ? (
                        <span className="ml-1 text-xs text-orange-700">room</span>
                      ) : null}
                      {clash.classHit ? (
                        <span className="ml-1 text-xs text-violet-700">class</span>
                      ) : null}
                    </Td>
                    <Td>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 text-rose-600"
                        onClick={() => deleteTimetableSlot(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </Table>
          </Card>
        </div>
      )}

      <Modal
        open={classOpen}
        onClose={() => setClassOpen(false)}
        title="Add class / section"
      >
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setClassError("");
            const name = classForm.name.trim();
            const section = classForm.section.trim().toUpperCase();
            if (!name || !section) {
              setClassError("Class name aur section dono zaroori hain");
              return;
            }
            const dup = data.classes.some(
              (c) =>
                c.name.trim().toLowerCase() === name.toLowerCase() &&
                c.section.trim().toLowerCase() === section.toLowerCase(),
            );
            if (dup) {
              setClassError(`${name}-${section} pehle se maujood hai`);
              return;
            }
            addClass({
              name,
              section,
              campusId: classForm.campusId,
              classTeacher: classForm.classTeacher || undefined,
              capacity: Number(classForm.capacity) || 40,
              enrolled: Number(classForm.enrolled) || 0,
              room: classForm.room || undefined,
            });
            setClassForm({
              ...classForm,
              name: "Class 1",
              section: "A",
              classTeacher: "",
              room: "",
              enrolled: "0",
            });
            setClassCustom(false);
            setSectionCustom(false);
            setClassOpen(false);
          }}
        >
          <p className="text-xs text-[var(--ims-text-muted)]">
            Example: Class 5 + Section A → students / attendance / fees is class pe filter
            honge.
          </p>
          {!classCustom ? (
            <SelectField
              label="Class"
              value={
                CLASS_PRESETS.includes(classForm.name as (typeof CLASS_PRESETS)[number])
                  ? classForm.name
                  : "__custom__"
              }
              onChange={(v) => {
                if (v === "__custom__") {
                  setClassCustom(true);
                  setClassForm({ ...classForm, name: "" });
                } else {
                  setClassForm({ ...classForm, name: v });
                }
              }}
            >
              {CLASS_PRESETS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value="__custom__">Other (type name)…</option>
            </SelectField>
          ) : (
            <Input
              label="Class name (custom)"
              required
              placeholder="e.g. O Level · Year 1"
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
            />
          )}
          {!sectionCustom ? (
            <SelectField
              label="Section"
              value={
                SECTION_PRESETS.includes(
                  classForm.section.toUpperCase() as (typeof SECTION_PRESETS)[number],
                )
                  ? classForm.section.toUpperCase()
                  : "__custom__"
              }
              onChange={(v) => {
                if (v === "__custom__") {
                  setSectionCustom(true);
                  setClassForm({ ...classForm, section: "" });
                } else {
                  setClassForm({ ...classForm, section: v });
                }
              }}
            >
              {SECTION_PRESETS.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
              <option value="__custom__">Other…</option>
            </SelectField>
          ) : (
            <Input
              label="Section (custom)"
              required
              placeholder="e.g. Girls / Morning"
              value={classForm.section}
              onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
            />
          )}
          <SelectField
            label="Campus"
            value={classForm.campusId}
            onChange={(v) => setClassForm({ ...classForm, campusId: v })}
          >
            {data.institute.campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <Input
            label="Class teacher"
            value={classForm.classTeacher}
            onChange={(e) => setClassForm({ ...classForm, classTeacher: e.target.value })}
          />
          <Input
            label="Capacity"
            type="number"
            value={classForm.capacity}
            onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value })}
          />
          <Input
            label="Room"
            value={classForm.room}
            onChange={(e) => setClassForm({ ...classForm, room: e.target.value })}
          />
          {classError ? <p className="text-sm text-rose-700">{classError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setClassOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save class</Button>
          </div>
        </form>
      </Modal>

      <Modal open={subjectOpen} onClose={() => setSubjectOpen(false)} title="Add subject">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!data.classes.length) {
              alert("Pehle Academics → Classes mein class/section banao");
              return;
            }
            addSubject({
              name: subjectForm.name,
              code: subjectForm.code,
              className: subjectForm.className,
              teacher: subjectForm.teacher || undefined,
              periodsPerWeek: Number(subjectForm.periodsPerWeek),
            });
            setSubjectOpen(false);
          }}
        >
          <Input
            label="Subject name"
            required
            value={subjectForm.name}
            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
          />
          <Input
            label="Code"
            required
            value={subjectForm.code}
            onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
          />
          <SelectField
            label="Class (from catalog)"
            value={subjectForm.className}
            onChange={(v) => setSubjectForm({ ...subjectForm, className: v })}
          >
            {[...new Set(data.classes.map((c) => c.name))].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </SelectField>
          <Input
            label="Teacher"
            value={subjectForm.teacher}
            onChange={(e) => setSubjectForm({ ...subjectForm, teacher: e.target.value })}
          />
          <Input
            label="Periods / week"
            type="number"
            value={subjectForm.periodsPerWeek}
            onChange={(e) =>
              setSubjectForm({ ...subjectForm, periodsPerWeek: e.target.value })
            }
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSubjectOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <Modal open={ttOpen} onClose={() => setTtOpen(false)} title="Add timetable slot">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!data.classes.length) {
              alert("Pehle Academics → Classes mein class/section banao");
              return;
            }
            const warnings: string[] = [];
            if (pendingTeacher) warnings.push("teacher");
            if (pendingRoom) warnings.push("room");
            if (pendingClass) warnings.push("class");
            if (
              warnings.length &&
              !confirm(`Clash detected (${warnings.join(", ")}). Add slot anyway?`)
            ) {
              return;
            }
            addTimetableSlot({
              day: ttForm.day,
              period: Number(ttForm.period),
              className: ttForm.className,
              section: ttForm.section,
              subject: ttForm.subject,
              teacher: ttForm.teacher,
              room: ttForm.room || undefined,
            });
            setTtOpen(false);
          }}
        >
          <SelectField
            label="Day"
            value={ttForm.day}
            onChange={(v) => setTtForm({ ...ttForm, day: v })}
          >
            {DAYS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </SelectField>
          <Input
            label="Period"
            type="number"
            required
            value={ttForm.period}
            onChange={(e) => setTtForm({ ...ttForm, period: e.target.value })}
          />
          <SelectField
            label="Class / section"
            value={`${ttForm.className}|${ttForm.section}`}
            onChange={(v) => {
              const [className, section] = v.split("|");
              setTtForm({
                ...ttForm,
                className: className ?? ttForm.className,
                section: section ?? ttForm.section,
              });
            }}
          >
            {data.classes.map((c) => (
              <option key={c.id} value={`${c.name}|${c.section}`}>
                {c.name}-{c.section}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Subject (optional pick)"
            value={ttForm.subject}
            onChange={(v) => setTtForm({ ...ttForm, subject: v })}
          >
            <option value="">— type below or pick —</option>
            {data.subjects
              .filter((sub) => sub.className === ttForm.className)
              .map((sub) => (
                <option key={sub.id} value={sub.name}>
                  {sub.name} ({sub.code})
                </option>
              ))}
          </SelectField>
          <Input
            label="Subject"
            required
            value={ttForm.subject}
            onChange={(e) => setTtForm({ ...ttForm, subject: e.target.value })}
          />
          <Input
            label="Teacher"
            required
            value={ttForm.teacher}
            onChange={(e) => setTtForm({ ...ttForm, teacher: e.target.value })}
          />
          <Input
            label="Room"
            value={ttForm.room}
            onChange={(e) => setTtForm({ ...ttForm, room: e.target.value })}
          />
          {pendingTeacher ? (
            <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900">
              Teacher clash: {pendingTeacher.teacher} already teaches{" "}
              {pendingTeacher.className}-{pendingTeacher.section} (
              {pendingTeacher.subject}) at this slot.
            </p>
          ) : null}
          {pendingRoom ? (
            <p className="rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-xs text-orange-950">
              Room clash: {pendingRoom.room} is used by {pendingRoom.className}-
              {pendingRoom.section} ({pendingRoom.subject}) at this slot.
            </p>
          ) : null}
          {pendingClass ? (
            <p className="rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-xs text-violet-950">
              Class clash: {pendingClass.className}-{pendingClass.section} already has{" "}
              {pendingClass.subject} at this slot.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setTtOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
