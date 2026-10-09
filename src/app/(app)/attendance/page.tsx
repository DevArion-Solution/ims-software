"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { SelectField } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { BiometricPanel } from "@/components/attendance/BiometricPanel";
import { useData } from "@/components/providers/DataProvider";
import { fireAbsenceAlerts } from "@/lib/notify/client-alerts";
import { CLASS_PERIODS, periodLabel } from "@/lib/attendance/periods";
import { formatPercent, labelize } from "@/lib/utils";
import { attendancePercentage, todayIso } from "@/lib/calc";
import type { AttendanceStatus } from "@/types";

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "leave", "holiday"];

export default function AttendancePage() {
  const { data, upsertAttendance, setAttendanceStatus, upsertStaffAttendance } = useData();
  const [tab, setTab] = useState<"mark" | "history" | "staff" | "devices">("mark");
  const [date, setDate] = useState(todayIso());
  const [period, setPeriod] = useState(1);
  const [classId, setClassId] = useState(data.classes[0]?.id ?? "");
  const [alertMsg, setAlertMsg] = useState("");

  const selectedClass = data.classes.find((c) => c.id === classId);

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return data.students.filter(
      (s) =>
        s.status === "active" &&
        s.className === selectedClass.name &&
        s.section === selectedClass.section,
    );
  }, [data.students, selectedClass]);

  const rows = useMemo(() => {
    return classStudents.map((student) => {
      const existing = data.attendance.find(
        (a) =>
          a.studentId === student.id &&
          a.date === date &&
          a.className === selectedClass?.name &&
          (a.period ?? 0) === period,
      );
      return { student, record: existing };
    });
  }, [classStudents, data.attendance, date, selectedClass, period]);

  const marked = rows.filter((r) => r.record);
  const markedStats = attendancePercentage(marked.map((r) => ({ status: r.record!.status })));

  const historyRows = useMemo(() => {
    if (!selectedClass) return [];
    return classStudents.map((student) => {
      const records = data.attendance.filter(
        (a) =>
          a.studentId === student.id &&
          a.className === selectedClass.name &&
          a.section === selectedClass.section,
      );
      const stats = attendancePercentage(records);
      return {
        student,
        ...stats,
        totalRecords: records.length,
      };
    });
  }, [classStudents, data.attendance, selectedClass]);

  const staffRows = useMemo(() => {
    return data.staff
      .filter((s) => s.status === "active")
      .map((member) => {
        const record = data.staffAttendance.find(
          (a) => a.staffId === member.id && a.date === date,
        );
        return { member, record };
      });
  }, [data.staff, data.staffAttendance, date]);

  const staffMarked = staffRows.filter((r) => r.record);
  const staffStats = attendancePercentage(
    staffMarked.map((r) => ({ status: r.record!.status })),
  );

  function markAll(status: AttendanceStatus) {
    if (!selectedClass) return;
    const absences: {
      studentId: string;
      studentName: string;
      className: string;
      section: string;
    }[] = [];
    for (const { student } of rows) {
      const studentName = `${student.firstName} ${student.lastName}`;
      upsertAttendance({
        date,
        className: selectedClass.name,
        section: selectedClass.section,
        studentId: student.id,
        studentName,
        status,
        period,
      });
      if (status === "absent") {
        absences.push({
          studentId: student.id,
          studentName,
          className: selectedClass.name,
          section: selectedClass.section,
        });
      }
    }
    if (absences.length && data.alertSettings.absenceAutoNotify) {
      void fireAbsenceAlerts({
        date,
        period,
        schoolName: data.institute.name,
        locale: data.alertSettings.absenceLocale,
        channels: data.alertSettings.absenceChannels,
        absences,
      }).then((r) => setAlertMsg(r.detail ?? `Alerts: ${r.sent} sent`));
    }
  }

  function markOne(
    studentId: string,
    studentName: string,
    status: AttendanceStatus,
    remarks?: string,
  ) {
    if (!selectedClass) return;
    upsertAttendance({
      date,
      className: selectedClass.name,
      section: selectedClass.section,
      studentId,
      studentName,
      status,
      remarks,
      period,
    });
    if (status === "absent" && data.alertSettings.absenceAutoNotify) {
      void fireAbsenceAlerts({
        date,
        period,
        schoolName: data.institute.name,
        locale: data.alertSettings.absenceLocale,
        channels: data.alertSettings.absenceChannels,
        absences: [
          {
            studentId,
            studentName,
            className: selectedClass.name,
            section: selectedClass.section,
          },
        ],
      }).then((r) => setAlertMsg(r.detail ?? `Alerts: ${r.sent} sent`));
    }
  }

  function markAllStaff(status: AttendanceStatus) {
    for (const { member } of staffRows) {
      upsertStaffAttendance({
        date,
        staffId: member.id,
        staffName: member.name,
        status,
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Period-wise class sheets · Gate biometric on Devices tab · Staff day sheet"
        actions={
          tab === "mark" ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => markAll("present")}>
                Mark all present
              </Button>
              <Button size="sm" variant="secondary" onClick={() => markAll("absent")}>
                Mark all absent
              </Button>
              <Button size="sm" variant="secondary" onClick={() => markAll("holiday")}>
                Class holiday
              </Button>
            </>
          ) : tab === "staff" ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => markAllStaff("present")}>
                All present
              </Button>
              <Button size="sm" variant="secondary" onClick={() => markAllStaff("absent")}>
                All absent
              </Button>
            </>
          ) : null
        }
      />

      {alertMsg ? (
        <p className="mb-3 text-sm text-emerald-700 break-words">{alertMsg}</p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" variant={tab === "mark" ? "primary" : "secondary"} onClick={() => setTab("mark")}>
          Student sheet
        </Button>
        <Button size="sm" variant={tab === "history" ? "primary" : "secondary"} onClick={() => setTab("history")}>
          History
        </Button>
        <Button
          size="sm"
          variant={tab === "devices" ? "primary" : "secondary"}
          onClick={() => setTab("devices")}
        >
          Biometric / ZKTeco
        </Button>
        <Button size="sm" variant={tab === "staff" ? "primary" : "secondary"} onClick={() => setTab("staff")}>
          Staff attendance
        </Button>
      </div>

      {tab === "devices" ? (
        <BiometricPanel />
      ) : (
      <>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-[var(--ims-border)] bg-white p-4 xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {tab !== "history" ? (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 rounded-md border border-[var(--ims-border)] px-3"
                />
              </label>
            ) : (
              <div className="flex flex-col justify-end text-sm text-[var(--ims-text-muted)]">
                Aggregated % across all logged dates for the class
              </div>
            )}
            {tab !== "staff" ? (
              <SelectField label="Class" value={classId} onChange={setClassId}>
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.section} ({c.enrolled} students)
                  </option>
                ))}
              </SelectField>
            ) : (
              <div className="flex flex-col justify-end text-sm text-[var(--ims-text-muted)]">
                Active staff only
              </div>
            )}
            {tab === "mark" ? (
              <SelectField
                label="Period"
                value={String(period)}
                onChange={(v) => setPeriod(Number(v))}
              >
                {CLASS_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {periodLabel(p)}
                  </option>
                ))}
              </SelectField>
            ) : null}
          </div>
        </div>
        {tab === "mark" ? (
          <>
            <StatCard label="Attendance %" value={formatPercent(markedStats.percentage)} hint={`${markedStats.counted} counted`} tone="success" />
            <StatCard label="Present" value={markedStats.present} />
            <StatCard label="Absent" value={markedStats.absent} tone="warning" />
          </>
        ) : tab === "staff" ? (
          <>
            <StatCard label="Staff %" value={formatPercent(staffStats.percentage)} tone="success" />
            <StatCard label="Present" value={staffStats.present} />
            <StatCard label="Absent" value={staffStats.absent} tone="warning" />
          </>
        ) : (
          <>
            <StatCard
              label="Class avg %"
              value={
                historyRows.length
                  ? formatPercent(
                      historyRows.reduce((s, r) => s + r.percentage, 0) / historyRows.length,
                    )
                  : "—"
              }
            />
            <StatCard label="Students" value={historyRows.length} />
            <StatCard
              label="Below 75%"
              value={historyRows.filter((r) => r.totalRecords > 0 && r.percentage < 75).length}
              tone="warning"
            />
          </>
        )}
      </div>

      {tab === "mark" ? (
        <>
          <p className="mb-3 text-xs text-[var(--ims-text-muted)]">
            Marking {periodLabel(period)} · Formula: (Present + Late) ÷ (Present + Late + Absent) ×
            100. Leave/Holiday excluded. Late: {markedStats.late} · Leave/Holiday:{" "}
            {markedStats.leave} · Unmarked: {rows.length - marked.length}
          </p>
          <Card className="overflow-x-auto">
            <Table headers={["Student", "Admission No.", "Status", "Remarks", "Quick mark"]}>
              {rows.map(({ student, record }) => (
                <tr key={student.id} className="hover:bg-[var(--ims-muted)]/40">
                  <Td className="font-medium">
                    {student.firstName} {student.lastName}
                  </Td>
                  <Td>{student.admissionNo}</Td>
                  <Td>
                    {record ? (
                      <Badge status={record.status}>{labelize(record.status)}</Badge>
                    ) : (
                      <span className="text-xs text-[var(--ims-text-muted)]">Not marked</span>
                    )}
                  </Td>
                  <Td>
                    <input
                      className="h-8 w-28 rounded border border-[var(--ims-border)] px-2 text-xs sm:w-40"
                      placeholder="Optional"
                      defaultValue={record?.remarks ?? ""}
                      onBlur={(e) => {
                        const remarks = e.target.value.trim();
                        if (!record && !remarks) return;
                        markOne(
                          student.id,
                          `${student.firstName} ${student.lastName}`,
                          record?.status ?? "absent",
                          remarks || undefined,
                        );
                      }}
                    />
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {STATUSES.map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={record?.status === status ? "primary" : "secondary"}
                          onClick={() =>
                            markOne(
                              student.id,
                              `${student.firstName} ${student.lastName}`,
                              status,
                              record?.remarks,
                            )
                          }
                        >
                          {labelize(status)}
                        </Button>
                      ))}
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      ) : tab === "staff" ? (
        <Card className="overflow-x-auto">
          <Table headers={["Staff", "Role", "Dept", "Status", "Quick mark"]}>
            {staffRows.map(({ member, record }) => (
              <tr key={member.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td className="font-medium">{member.name}</Td>
                <Td>{member.role}</Td>
                <Td>{member.department}</Td>
                <Td>
                  {record ? (
                    <Badge status={record.status}>{labelize(record.status)}</Badge>
                  ) : (
                    <span className="text-xs text-[var(--ims-text-muted)]">Not marked</span>
                  )}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {STATUSES.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={record?.status === status ? "primary" : "secondary"}
                        onClick={() =>
                          upsertStaffAttendance({
                            date,
                            staffId: member.id,
                            staffName: member.name,
                            status,
                          })
                        }
                      >
                        {labelize(status)}
                      </Button>
                    ))}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      ) : (
        <Card>
          <Table headers={["Student", "Admission No.", "Records", "Present", "Absent", "Late", "Leave", "Attendance %"]}>
            {historyRows.map((row) => (
              <tr key={row.student.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td className="font-medium">
                  {row.student.firstName} {row.student.lastName}
                </Td>
                <Td>{row.student.admissionNo}</Td>
                <Td>{row.totalRecords}</Td>
                <Td>{row.present}</Td>
                <Td>{row.absent}</Td>
                <Td>{row.late}</Td>
                <Td>{row.leave}</Td>
                <Td>
                  <span
                    className={
                      row.totalRecords > 0 && row.percentage < 75
                        ? "font-semibold text-amber-700"
                        : "font-medium"
                    }
                  >
                    {row.totalRecords ? formatPercent(row.percentage) : "—"}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
      </>
      )}
    </div>
  );
}
