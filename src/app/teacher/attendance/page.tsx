"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PortalShell, TEACHER_NAV } from "@/components/layout/PortalShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { teacherScope } from "@/lib/portal/scope";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatDate, labelize } from "@/lib/utils";
import { t } from "@/lib/i18n";
import {
  loadOfflineAttendance,
  queueOfflineAttendance,
  syncOfflineAttendance,
} from "@/lib/pwa/offline-attendance";
import { fireAbsenceAlerts } from "@/lib/notify/client-alerts";
import { CLASS_PERIODS, periodLabel } from "@/lib/attendance/periods";
import type { AttendanceStatus } from "@/types";

export default function TeacherAttendancePage() {
  const { session } = useAuth();
  const { data, upsertAttendance } = useData();
  const { dict } = useLocale();
  const scope = teacherScope(data, session?.linkedStaffId);
  const [classKey, setClassKey] = useState(() => {
    const c = scope.myClasses[0];
    return c ? `${c.name}|${c.section}` : "";
  });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState(1);
  const [msg, setMsg] = useState("");
  const [offlineCount, setOfflineCount] = useState(0);
  const [online, setOnline] = useState(true);

  const [className, section] = classKey.split("|");
  const students = useMemo(
    () =>
      scope.myStudents.filter(
        (s) => s.className === className && s.section === section,
      ),
    [scope.myStudents, className, section],
  );

  const timetableHint = useMemo(() => {
    const dayName = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
    });
    return data.timetable.find(
      (t) =>
        t.className === className &&
        t.section === section &&
        t.period === period &&
        t.day.toLowerCase() === dayName.toLowerCase(),
    );
  }, [data.timetable, className, section, period, date]);

  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});

  // Prefill from saved period sheet
  useEffect(() => {
    const next: Record<string, AttendanceStatus> = {};
    for (const s of students) {
      const existing = data.attendance.find(
        (a) =>
          a.studentId === s.id &&
          a.date === date &&
          a.className === className &&
          (a.period ?? 0) === period,
      );
      if (existing) next[s.id] = existing.status;
    }
    setMarks(next);
  }, [students, data.attendance, date, className, period]);

  useEffect(() => {
    setOfflineCount(loadOfflineAttendance().length);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  function setStatus(id: string, status: AttendanceStatus) {
    setMarks((prev) => ({ ...prev, [id]: status }));
  }

  function save(e: FormEvent) {
    e.preventDefault();
    let n = 0;
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    const absences: {
      studentId: string;
      studentName: string;
      className: string;
      section: string;
    }[] = [];
    for (const s of students) {
      const status = marks[s.id] ?? "present";
      const studentName = `${s.firstName} ${s.lastName}`;
      if (offline) {
        queueOfflineAttendance({
          date,
          className: s.className,
          section: s.section,
          studentId: s.id,
          studentName,
          status,
          period,
          subject: timetableHint?.subject,
        });
      } else {
        upsertAttendance({
          date,
          className: s.className,
          section: s.section,
          studentId: s.id,
          studentName,
          status,
          period,
          subject: timetableHint?.subject,
        });
        if (status === "absent") {
          absences.push({
            studentId: s.id,
            studentName,
            className: s.className,
            section: s.section,
          });
        }
      }
      n += 1;
    }
    if (offline) {
      setOfflineCount(loadOfflineAttendance().length);
      setMsg(`${t(dict, "portal.offlineQueued")} (${n}) · ${periodLabel(period)}`);
    } else {
      setMsg(`Saved ${periodLabel(period)} for ${n} students on ${date}`);
      if (absences.length && data.alertSettings.absenceAutoNotify) {
        void fireAbsenceAlerts({
          date,
          period,
          schoolName: data.institute.name,
          locale: data.alertSettings.absenceLocale,
          channels: data.alertSettings.absenceChannels,
          absences,
        }).then((r) => {
          if (r.sent || r.failed) {
            setMsg(
              (m) =>
                `${m} · Parent alerts: ${r.sent} sent${r.failed ? `, ${r.failed} failed` : ""}`,
            );
          }
        });
      }
    }
  }

  async function syncOffline() {
    const res = await syncOfflineAttendance();
    if (res.ok) {
      setOfflineCount(0);
      setMsg(`Synced ${res.applied ?? 0} offline mark(s)`);
    } else {
      setMsg(res.error ?? "Sync failed");
    }
  }

  const history = data.attendance
    .filter((a) => scope.myStudents.some((s) => s.id === a.studentId))
    .slice(0, 30);

  return (
    <PortalShell title="Teacher Portal" subtitle="Classroom workspace" nav={TEACHER_NAV}>
      <PageHeader
        title="Period attendance"
        subtitle={
          online
            ? "Mark each period when the class joins (laptop)"
            : "Offline mode — drafts saved locally"
        }
        actions={
          offlineCount > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => void syncOffline()}>
              {t(dict, "portal.syncOffline")} ({offlineCount})
            </Button>
          ) : null
        }
      />
      <form
        onSubmit={save}
        className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_0.8fr_auto]"
      >
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Class</span>
          <select
            value={classKey}
            onChange={(e) => setClassKey(e.target.value)}
            className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3"
          >
            {scope.myClasses.map((c) => (
              <option key={c.id} value={`${c.name}|${c.section}`}>
                {c.name}-{c.section}
              </option>
            ))}
          </select>
        </label>
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Period</span>
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3"
          >
            {CLASS_PERIODS.map((p) => (
              <option key={p} value={p}>
                Period {p}
                {timetableHint && p === period && timetableHint.subject
                  ? ` · ${timetableHint.subject}`
                  : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={!students.length}>
            Save period
          </Button>
        </div>
      </form>
      {timetableHint ? (
        <p className="mb-3 text-xs text-[var(--ims-text-muted)]">
          Timetable: {timetableHint.subject}
          {timetableHint.room ? ` · ${timetableHint.room}` : ""} · {timetableHint.teacher}
        </p>
      ) : null}
      {msg ? <p className="mb-4 text-sm text-emerald-700">{msg}</p> : null}

      <Card className="overflow-x-auto">
        <Table headers={["Student", "Admission", "Status"]}>
          {students.map((s) => (
            <tr key={s.id}>
              <Td className="font-medium">
                {s.firstName} {s.lastName}
              </Td>
              <Td>{s.admissionNo}</Td>
              <Td>
                <select
                  value={marks[s.id] ?? "present"}
                  onChange={(e) => setStatus(s.id, e.target.value as AttendanceStatus)}
                  className="h-9 rounded-md border border-[var(--ims-border)] bg-white px-2 text-sm"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="leave">Leave</option>
                </select>
              </Td>
            </tr>
          ))}
        </Table>
        {!students.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">
            Select a class you teach
          </p>
        ) : null}
      </Card>

      <Card className="mt-6">
        <CardBody>
          <p className="mb-3 text-sm font-semibold">Recent history (your students)</p>
          <div className="overflow-x-auto">
            <Table headers={["Date", "Period", "Student", "Class", "Status"]}>
              {history.map((a) => (
                <tr key={a.id}>
                  <Td>{formatDate(a.date)}</Td>
                  <Td>{periodLabel(a.period)}</Td>
                  <Td>{a.studentName}</Td>
                  <Td>
                    {a.className}-{a.section}
                    {a.subject ? ` · ${a.subject}` : ""}
                  </Td>
                  <Td>
                    <Badge status={a.status}>{labelize(a.status)}</Badge>
                  </Td>
                </tr>
              ))}
            </Table>
          </div>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
