"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { useData } from "@/components/providers/DataProvider";
import { formatDate, formatPercent, labelize } from "@/lib/utils";
import { averageOf, rankByScore } from "@/lib/calc";
import type { Exam } from "@/types";

export default function ExamsPage() {
  const {
    data,
    addExam,
    updateExam,
    deleteExam,
    addResult,
    deleteResult,
    publishExamResults,
  } = useData();
  const [tab, setTab] = useState<"exams" | "results">("exams");
  const [examOpen, setExamOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [examForm, setExamForm] = useState({
    name: "",
    term: "Term 1",
    className: "Class 8",
    startDate: "",
    endDate: "",
    status: "scheduled" as Exam["status"],
    published: false,
  });
  const [resultForm, setResultForm] = useState({
    examId: data.exams[0]?.id ?? "",
    studentId: data.students[0]?.id ?? "",
    subject: "",
    obtained: "",
    total: "100",
  });
  const [sheetForm, setSheetForm] = useState({
    examId: data.exams[0]?.id ?? "",
    subject: data.subjects[0]?.name ?? "",
    total: "100",
  });
  const [sheetMarks, setSheetMarks] = useState<Record<string, string>>({});

  const avg = averageOf(data.results.map((r) => r.percentage ?? 0), 1);
  const passRate = data.results.length
    ? averageOf(data.results.map((r) => (r.passed ? 100 : 0)), 1)
    : 0;

  const ranked = useMemo(() => {
    const byStudent = new Map<string, { id: string; name: string; scores: number[] }>();
    for (const r of data.results) {
      const cur = byStudent.get(r.studentId) ?? {
        id: r.studentId,
        name: r.studentName,
        scores: [],
      };
      cur.scores.push(r.percentage ?? 0);
      byStudent.set(r.studentId, cur);
    }
    const list = [...byStudent.values()].map((s) => ({
      id: s.id,
      name: s.name,
      score: averageOf(s.scores, 2),
    }));
    const ranks = rankByScore(list);
    return list
      .map((s) => ({ ...s, rank: ranks.get(s.id) ?? 0 }))
      .sort((a, b) => a.rank - b.rank);
  }, [data.results]);

  const sheetExam = data.exams.find((e) => e.id === sheetForm.examId);
  const sheetStudents = useMemo(() => {
    if (!sheetExam) return [];
    return data.students.filter(
      (s) =>
        s.status === "active" &&
        (s.className === sheetExam.className ||
          s.className.startsWith(sheetExam.className.replace(/-.*/, ""))),
    );
  }, [data.students, sheetExam]);

  function openSheet() {
    setSheetForm({
      examId: data.exams[0]?.id ?? "",
      subject: data.subjects[0]?.name ?? "",
      total: "100",
    });
    setSheetMarks({});
    setSheetOpen(true);
  }

  function saveSheet(e: FormEvent) {
    e.preventDefault();
    if (!sheetExam) return;
    let n = 0;
    for (const student of sheetStudents) {
      const raw = sheetMarks[student.id];
      if (raw === undefined || raw === "") continue;
      addResult({
        examId: sheetExam.id,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        className: student.className,
        subject: sheetForm.subject,
        obtained: Number(raw),
        total: Number(sheetForm.total) || 100,
      });
      n += 1;
    }
    setSheetOpen(false);
    if (n) setTab("results");
  }

  return (
    <div>
      <PageHeader
        title="Exams & Results"
        subtitle="Publish gates parent/student view · Class marks sheet · Grade from %"
        actions={
          tab === "exams" ? (
            <Button size="sm" onClick={() => setExamOpen(true)}>
              <Plus className="h-4 w-4" /> Schedule exam
            </Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={openSheet}>
                Class marks sheet
              </Button>
              <Button size="sm" onClick={() => setResultOpen(true)}>
                <Plus className="h-4 w-4" /> Enter marks
              </Button>
            </>
          )
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Result average" value={data.results.length ? formatPercent(avg) : "—"} />
        <StatCard label="Pass rate" value={data.results.length ? formatPercent(passRate) : "—"} tone="success" />
        <StatCard label="Result rows" value={data.results.length} />
      </div>

      <div className="mb-4 flex gap-2">
        <Button size="sm" variant={tab === "exams" ? "primary" : "secondary"} onClick={() => setTab("exams")}>
          Exams
        </Button>
        <Button size="sm" variant={tab === "results" ? "primary" : "secondary"} onClick={() => setTab("results")}>
          Results & ranks
        </Button>
      </div>

      {tab === "exams" ? (
        <Card>
          <Table headers={["Exam", "Term", "Class", "Dates", "Status", "Portal", "Actions"]}>
            {data.exams.map((exam) => (
              <tr key={exam.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td className="font-medium">{exam.name}</Td>
                <Td>{exam.term}</Td>
                <Td>{exam.className}</Td>
                <Td>
                  {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
                </Td>
                <Td>
                  <select
                    value={exam.status}
                    onChange={(e) =>
                      updateExam(exam.id, { status: e.target.value as Exam["status"] })
                    }
                    className="h-8 rounded border border-[var(--ims-border)] px-2 text-xs"
                  >
                    {["scheduled", "ongoing", "completed", "cancelled"].map((s) => (
                      <option key={s} value={s}>
                        {labelize(s)}
                      </option>
                    ))}
                  </select>
                </Td>
                <Td>
                  <Badge status={exam.published ? "paid" : "pending"}>
                    {exam.published ? "Published" : "Draft"}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      size="sm"
                      variant={exam.published ? "secondary" : "primary"}
                      onClick={() => publishExamResults(exam.id, !exam.published)}
                    >
                      {exam.published ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 text-rose-600"
                      onClick={() => {
                        if (confirm("Delete exam?")) deleteExam(exam.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <Table headers={["Student", "Exam", "Subject", "Marks", "%", "Grade", "Pass", "Actions"]}>
              {data.results.map((r) => {
                const exam = data.exams.find((e) => e.id === r.examId);
                return (
                  <tr key={r.id} className="hover:bg-[var(--ims-muted)]/40">
                    <Td className="font-medium">{r.studentName}</Td>
                    <Td>{exam?.name ?? r.examId}</Td>
                    <Td>{r.subject}</Td>
                    <Td>
                      {r.obtained}/{r.total}
                    </Td>
                    <Td>{formatPercent(r.percentage ?? 0, 2)}</Td>
                    <Td>
                      <Badge status={r.passed ? "paid" : "overdue"}>{r.grade}</Badge>
                    </Td>
                    <Td>{r.passed ? "Yes" : "No"}</Td>
                    <Td>
                      <div className="flex gap-1">
                        <Link href={`/report-card/${r.studentId}`}>
                          <Button variant="ghost" size="sm" className="px-2" title="Print report card">
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2 text-rose-600"
                          onClick={() => deleteResult(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </Table>
          </Card>
          <Card>
            <Table headers={["Rank", "Student", "Avg %", "Report"]}>
              {ranked.map((s) => (
                <tr key={s.id}>
                  <Td className="font-semibold">#{s.rank}</Td>
                  <Td>{s.name}</Td>
                  <Td>{formatPercent(s.score, 2)}</Td>
                  <Td>
                    <Link href={`/report-card/${s.id}`}>
                      <Button size="sm" variant="secondary">
                        Print report card
                      </Button>
                    </Link>
                  </Td>
                </tr>
              ))}
            </Table>
            {!ranked.length ? (
              <p className="p-6 text-center text-sm text-[var(--ims-text-muted)]">Enter marks to see ranks</p>
            ) : null}
          </Card>
        </div>
      )}

      <Modal open={examOpen} onClose={() => setExamOpen(false)} title="Schedule exam">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            addExam(examForm);
            setExamOpen(false);
          }}
        >
          <Input label="Exam name" required value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} />
          <Input label="Term" required value={examForm.term} onChange={(e) => setExamForm({ ...examForm, term: e.target.value })} />
          <Input label="Class" required value={examForm.className} onChange={(e) => setExamForm({ ...examForm, className: e.target.value })} />
          <Input label="Start date" type="date" required value={examForm.startDate} onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })} />
          <Input label="End date" type="date" required value={examForm.endDate} onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setExamOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <Modal open={resultOpen} onClose={() => setResultOpen(false)} title="Enter result marks">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const student = data.students.find((s) => s.id === resultForm.studentId);
            if (!student) return;
            addResult({
              examId: resultForm.examId,
              studentId: student.id,
              studentName: `${student.firstName} ${student.lastName}`,
              className: student.className,
              subject: resultForm.subject,
              obtained: Number(resultForm.obtained),
              total: Number(resultForm.total),
            });
            setResultOpen(false);
            setResultForm({ ...resultForm, obtained: "", subject: "" });
          }}
        >
          <SelectField label="Exam" value={resultForm.examId} onChange={(v) => setResultForm({ ...resultForm, examId: v })}>
            {data.exams.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </SelectField>
          <SelectField label="Student" value={resultForm.studentId} onChange={(v) => setResultForm({ ...resultForm, studentId: v })}>
            {data.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </SelectField>
          <Input label="Subject" required value={resultForm.subject} onChange={(e) => setResultForm({ ...resultForm, subject: e.target.value })} />
          <Input label="Obtained" type="number" required min={0} value={resultForm.obtained} onChange={(e) => setResultForm({ ...resultForm, obtained: e.target.value })} />
          <Input label="Total" type="number" required min={1} value={resultForm.total} onChange={(e) => setResultForm({ ...resultForm, total: e.target.value })} />
          <p className="text-xs text-[var(--ims-text-muted)]">
            Obtained is clamped to 0…Total. Pass mark = 40%. Grades: A+≥90, A≥80, B≥70, C≥60, D≥50, E≥40, else F.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setResultOpen(false)}>Cancel</Button>
            <Button type="submit">Save marks</Button>
          </div>
        </form>
      </Modal>

      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} title="Class marks sheet" wide>
        <form onSubmit={saveSheet} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField
              label="Exam"
              value={sheetForm.examId}
              onChange={(v) => setSheetForm({ ...sheetForm, examId: v })}
            >
              {data.exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.className})
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Subject"
              value={sheetForm.subject}
              onChange={(v) => setSheetForm({ ...sheetForm, subject: v })}
            >
              {data.subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
              {!data.subjects.length ? <option value="General">General</option> : null}
            </SelectField>
            <Input
              label="Total marks"
              type="number"
              min={1}
              value={sheetForm.total}
              onChange={(e) => setSheetForm({ ...sheetForm, total: e.target.value })}
            />
          </div>
          <div className="max-h-80 overflow-auto rounded-md border border-[var(--ims-border)]">
            <Table headers={["Student", "Class", "Obtained"]}>
              {sheetStudents.map((s) => {
                const existing = data.results.find(
                  (r) =>
                    r.examId === sheetForm.examId &&
                    r.studentId === s.id &&
                    r.subject === sheetForm.subject,
                );
                return (
                  <tr key={s.id}>
                    <Td className="font-medium">
                      {s.firstName} {s.lastName}
                    </Td>
                    <Td>
                      {s.className}-{s.section}
                    </Td>
                    <Td>
                      <input
                        type="number"
                        min={0}
                        className="h-8 w-24 rounded border border-[var(--ims-border)] px-2 text-sm"
                        defaultValue={
                          sheetMarks[s.id] ??
                          (existing ? String(existing.obtained) : "")
                        }
                        onChange={(e) =>
                          setSheetMarks((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                      />
                    </Td>
                  </tr>
                );
              })}
            </Table>
            {!sheetStudents.length ? (
              <p className="p-6 text-center text-sm text-[var(--ims-text-muted)]">
                No students match this exam class
              </p>
            ) : null}
          </div>
          <p className="text-xs text-[var(--ims-text-muted)]">
            Empty cells are skipped. Existing subject rows are updated.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save sheet</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
