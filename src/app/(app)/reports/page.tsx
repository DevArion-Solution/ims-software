"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useData } from "@/components/providers/DataProvider";
import { formatCurrency, labelize } from "@/lib/utils";
import { daysOverdue, feeLedgerReconcile, libraryOverdueFine, sumMoney } from "@/lib/calc";
import { exportCsv } from "@/lib/school/export-csv";

export default function ReportsPage() {
  const { data, stats } = useData();

  const studentsByClass = Object.entries(
    data.students.reduce<Record<string, number>>((acc, s) => {
      const key = `${s.className} - ${s.section}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  );

  const feeByStatus = Object.entries(
    data.fees.reduce<Record<string, number>>((acc, f) => {
      acc[f.status] = (acc[f.status] ?? 0) + 1;
      return acc;
    }, {}),
  );

  const openLibrary = useMemo(
    () => data.bookIssues.filter((i) => i.status !== "returned"),
    [data.bookIssues],
  );
  const overdueLibrary = useMemo(
    () => openLibrary.filter((i) => daysOverdue(i.dueDate) > 0),
    [openLibrary],
  );
  const activeBoarders = useMemo(
    () => data.hostelAllotments.filter((a) => a.status === "active"),
    [data.hostelAllotments],
  );
  const transportRiders = data.routeAssignments.length;
  const admissionFunnel = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of data.admissions) {
      map[a.status] = (map[a.status] ?? 0) + 1;
    }
    return Object.entries(map);
  }, [data.admissions]);
  const payrollPending = useMemo(
    () => sumMoney(data.payroll.filter((p) => p.status !== "paid").map((p) => p.net)),
    [data.payroll],
  );
  const messMonthly = useMemo(
    () => sumMoney(activeBoarders.map((a) => a.messFee ?? 0)),
    [activeBoarders],
  );
  const accountsGap = useMemo(
    () => feeLedgerReconcile(data.fees, data.vouchers),
    [data.fees, data.vouchers],
  );

  function exportStudents() {
    exportCsv("students-report.csv", [
      ["Admission No", "Name", "Class", "Section", "Status", "Campus"],
      ...data.students.map((s) => [
        s.admissionNo,
        `${s.firstName} ${s.lastName}`,
        s.className,
        s.section,
        s.status,
        s.campusId,
      ]),
    ]);
  }

  function exportAttendance() {
    exportCsv("attendance-report.csv", [
      ["Date", "Period", "Class", "Section", "Student", "Status", "Subject", "Remarks"],
      ...data.attendance.map((a) => [
        a.date,
        a.period ?? 0,
        a.className,
        a.section,
        a.studentName,
        a.status,
        a.subject ?? "",
        a.remarks ?? "",
      ]),
    ]);
  }

  function exportResults() {
    exportCsv("results-report.csv", [
      ["Student", "Class", "Subject", "Exam", "Obtained", "Total", "%", "Grade", "Passed"],
      ...data.results.map((r) => {
        const exam = data.exams.find((e) => e.id === r.examId);
        return [
          r.studentName,
          r.className,
          r.subject,
          exam?.name ?? r.examId,
          String(r.obtained),
          String(r.total),
          String(r.percentage),
          r.grade,
          r.passed ? "Yes" : "No",
        ];
      }),
    ]);
  }

  function exportStaff() {
    exportCsv("staff-report.csv", [
      ["Employee No", "Name", "Role", "Department", "Phone", "Email", "Salary", "Bank", "Status"],
      ...data.staff.map((s) => [
        s.employeeNo,
        s.name,
        s.role,
        s.department,
        s.phone,
        s.email,
        String(s.salary ?? ""),
        s.bankAccount ? `${s.bankName ?? ""} ${s.bankAccount}` : "",
        s.status,
      ]),
    ]);
  }

  function exportFees() {
    exportCsv("fees-ledger.csv", [
      ["Student", "Class", "Month", "Head", "Amount", "Paid", "Status", "Due", "Remarks"],
      ...data.fees.map((f) => [
        f.studentName,
        f.className,
        f.month,
        f.feeHead ?? "",
        String(f.amount),
        String(f.paid),
        f.status,
        f.dueDate,
        f.remarks ?? "",
      ]),
    ]);
  }

  function exportPayroll() {
    exportCsv("payroll-report.csv", [
      [
        "Staff",
        "Month",
        "Basic",
        "Allowances",
        "Leave days",
        "Leave deduct",
        "Tax",
        "Deductions",
        "Net",
        "Status",
        "Paid on",
      ],
      ...data.payroll.map((p) => [
        p.staffName,
        p.month,
        String(p.basic),
        String(p.allowances),
        String(p.leaveDays ?? 0),
        String(p.leaveDeduction ?? 0),
        String(p.taxDeduction ?? 0),
        String(p.deductions),
        String(p.net),
        p.status,
        p.paidOn ?? "",
      ]),
    ]);
  }

  function exportTransport() {
    exportCsv("transport-riders.csv", [
      ["Student", "Class", "Route", "Vehicle", "Driver", "Fee", "Route status"],
      ...data.routeAssignments.map((a) => {
        const route = data.routes.find((r) => r.id === a.routeId);
        const student = data.students.find((s) => s.id === a.studentId);
        return [
          a.studentName,
          student ? `${student.className}-${student.section}` : "",
          route?.name ?? a.routeId,
          route?.vehicleNo ?? "",
          route?.driver ?? "",
          String(route?.fee ?? ""),
          route?.status ?? "",
        ];
      }),
    ]);
  }

  function exportHostel() {
    exportCsv("hostel-boarders.csv", [
      ["Student", "Room", "Mess fee", "Allot date", "Status"],
      ...data.hostelAllotments.map((a) => [
        a.studentName,
        a.roomLabel,
        String(a.messFee ?? 0),
        a.allotDate,
        a.status,
      ]),
    ]);
  }

  function exportLibrary() {
    exportCsv("library-issues.csv", [
      [
        "Book",
        "Member",
        "Type",
        "Member ID",
        "Issued",
        "Due",
        "Status",
        "Days overdue",
        "Est. fine",
        "Fine posted",
      ],
      ...data.bookIssues.map((i) => {
        const overdue =
          i.status === "returned" ? 0 : daysOverdue(i.dueDate);
        const fine =
          i.status === "returned" ? i.fine : libraryOverdueFine(i.dueDate);
        return [
          i.bookTitle,
          i.memberName,
          i.memberType,
          i.memberId ?? "",
          i.issueDate,
          i.dueDate,
          i.status,
          String(overdue),
          String(fine),
          i.finePosted ? "Yes" : "No",
        ];
      }),
    ]);
  }

  function exportAdmissions() {
    exportCsv("admissions-funnel.csv", [
      [
        "Applicant",
        "Father",
        "Applying for",
        "Section",
        "Gender",
        "DOB",
        "Phone",
        "Status",
        "Applied on",
        "Source",
      ],
      ...data.admissions.map((a) => [
        a.applicantName,
        a.fatherName,
        a.applyingFor,
        a.section ?? "",
        a.gender ?? "",
        a.dateOfBirth ?? "",
        a.phone,
        a.status,
        a.appliedOn,
        a.source ?? "",
      ]),
    ]);
  }

  function exportInventory() {
    exportCsv("inventory-stock.csv", [
      ["SKU", "Name", "Category", "Qty", "Unit", "Unit cost", "Value", "Min", "Status", "Vendor", "Location"],
      ...data.inventory.map((i) => [
        i.sku,
        i.name,
        i.category,
        String(i.quantity),
        i.unit,
        String(i.unitCost ?? 0),
        String(i.quantity * (i.unitCost ?? 0)),
        String(i.minStock),
        i.status,
        i.preferredVendor ?? "",
        i.location,
      ]),
    ]);
  }

  function exportLedger() {
    let running = 0;
    const rows = [...data.vouchers]
      .sort((a, b) => a.date.localeCompare(b.date) || a.voucherNo.localeCompare(b.voucherNo))
      .map((v) => {
        if (v.type === "receipt") running += v.amount;
        else if (v.type === "payment") running -= v.amount;
        return [
          v.voucherNo,
          v.date,
          v.type,
          v.account,
          v.description,
          String(v.amount),
          v.campusId,
          String(running),
        ];
      });
    exportCsv("accounts-ledger.csv", [
      ["Voucher", "Date", "Type", "Account", "Description", "Amount", "Campus", "Running bal."],
      ...rows,
    ]);
  }

  function exportExpenses() {
    exportCsv("accounts-expenses.csv", [
      ["Date", "Category", "Title", "Paid to", "Mode", "Amount", "Campus", "Voucher"],
      ...data.expenses.map((e) => [
        e.date,
        e.category,
        e.title,
        e.paidTo,
        e.paymentMode,
        String(e.amount),
        e.campusId,
        e.voucherId ? "Yes" : "No",
      ]),
    ]);
  }

  function exportTrips() {
    exportCsv("accounts-trips.csv", [
      ["Title", "Purpose", "Destination", "From", "To", "People", "Cost", "Status", "Campus"],
      ...data.trips.map((t) => [
        t.title,
        t.purpose,
        t.destination,
        t.fromDate,
        t.toDate,
        String(t.participants),
        String(t.lines.reduce((s, l) => s + l.amount, 0) || t.estimatedBudget),
        t.status,
        t.campusId,
      ]),
    ]);
  }

  function exportReconcile() {
    const r = feeLedgerReconcile(data.fees, data.vouchers);
    exportCsv("accounts-reconcile.csv", [
      ["Metric", "Amount"],
      ["Fee collected", String(r.feeCollected)],
      ["Fee receipts posted", String(r.feeReceipts)],
      ["Gap", String(r.gap)],
      ["Matched", r.matched ? "Yes" : "No"],
      ["Expenses booked", String(sumMoney(data.expenses.map((e) => e.amount)))],
      ["Payment vouchers", String(sumMoney(data.vouchers.filter((v) => v.type === "payment").map((v) => v.amount)))],
    ]);
  }

  const packs: Array<{ label: string; onClick: () => void }> = [
    { label: "Students", onClick: exportStudents },
    { label: "Attendance", onClick: exportAttendance },
    { label: "Results", onClick: exportResults },
    { label: "Staff", onClick: exportStaff },
    { label: "Fees", onClick: exportFees },
    { label: "Payroll", onClick: exportPayroll },
    { label: "Ledger", onClick: exportLedger },
    { label: "Expenses", onClick: exportExpenses },
    { label: "Trips", onClick: exportTrips },
    { label: "Reconcile", onClick: exportReconcile },
    { label: "Transport", onClick: exportTransport },
    { label: "Hostel", onClick: exportHostel },
    { label: "Library", onClick: exportLibrary },
    { label: "Admissions", onClick: exportAdmissions },
    { label: "Inventory", onClick: exportInventory },
  ];

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Ops packs — students, fees, accounts, transport, hostel, library, payroll, inventory"
        actions={
          <div className="flex max-w-3xl flex-wrap justify-end gap-2">
            {packs.map((p) => (
              <Button key={p.label} size="sm" variant="secondary" onClick={p.onClick}>
                {p.label}
              </Button>
            ))}
          </div>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active students" value={String(stats.totalStudents)} />
        <StatCard label="Staff" value={String(stats.totalStaff)} tone="accent" />
        <StatCard
          label="Collected (this month)"
          value={stats.feeCollectedLabel}
          tone="success"
        />
        <StatCard
          label="Pending (this month)"
          value={stats.feePendingLabel}
          tone="warning"
        />
      </div>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Transport riders" value={String(transportRiders)} />
        <StatCard label="Hostel boarders" value={String(activeBoarders.length)} />
        <StatCard
          label="Library overdue"
          value={String(overdueLibrary.length)}
          tone="warning"
        />
        <StatCard
          label="Payroll pending"
          value={formatCurrency(payrollPending)}
          tone="accent"
        />
      </div>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="All-time outstanding" value={stats.feePendingAllLabel} />
        <StatCard
          label="Mess fee / month"
          value={formatCurrency(messMonthly)}
          tone="success"
        />
        <StatCard
          label="Fee ↔ ledger gap"
          value={formatCurrency(accountsGap.gap)}
          tone={accountsGap.matched ? "success" : "warning"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Students by class"
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  exportCsv("class-strength.csv", [
                    ["Class", "Count"],
                    ...studentsByClass.map(([k, v]) => [k, String(v)]),
                  ])
                }
              >
                Export
              </Button>
            }
          />
          <Table headers={["Class / Section", "Students"]}>
            {studentsByClass.map(([name, count]) => (
              <tr key={name}>
                <Td>{name}</Td>
                <Td className="font-medium">{count}</Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Fee status breakdown"
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  exportCsv("fee-status.csv", [
                    ["Status", "Count"],
                    ...feeByStatus.map(([k, v]) => [k, String(v)]),
                  ])
                }
              >
                Export
              </Button>
            }
          />
          <Table headers={["Status", "Challans", "Outstanding"]}>
            {feeByStatus.map(([status, count]) => {
              const outstanding = data.fees
                .filter((f) => f.status === status)
                .reduce((s, f) => s + Math.max(0, f.amount - f.paid), 0);
              return (
                <tr key={status}>
                  <Td>
                    <Badge status={status}>{labelize(status)}</Badge>
                  </Td>
                  <Td>{count}</Td>
                  <Td>{formatCurrency(outstanding)}</Td>
                </tr>
              );
            })}
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Admissions funnel"
            action={
              <Button size="sm" variant="ghost" onClick={exportAdmissions}>
                Export CSV
              </Button>
            }
          />
          <Table headers={["Status", "Applications"]}>
            {admissionFunnel.map(([status, count]) => (
              <tr key={status}>
                <Td>
                  <Badge
                    status={
                      status === "enrolled"
                        ? "paid"
                        : status === "rejected"
                          ? "overdue"
                          : "pending"
                    }
                  >
                    {labelize(status)}
                  </Badge>
                </Td>
                <Td className="font-medium">{count}</Td>
              </tr>
            ))}
          </Table>
          {!admissionFunnel.length ? (
            <p className="p-4 text-sm text-[var(--ims-text-muted)]">No applications</p>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title="Transport & hostel pulse"
            action={
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={exportTransport}>
                  Transport
                </Button>
                <Button size="sm" variant="ghost" onClick={exportHostel}>
                  Hostel
                </Button>
              </div>
            }
          />
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--ims-text-muted)]">Active routes</span>
              <span className="font-medium">
                {data.routes.filter((r) => r.status === "active").length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ims-text-muted)]">Riders assigned</span>
              <span className="font-medium">{transportRiders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ims-text-muted)]">Hostel rooms</span>
              <span className="font-medium">{data.hostelRooms.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ims-text-muted)]">Active boarders</span>
              <span className="font-medium">{activeBoarders.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ims-text-muted)]">Mess fee / month</span>
              <span className="font-medium">{formatCurrency(messMonthly)}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Library & inventory"
            action={
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={exportLibrary}>
                  Library
                </Button>
                <Button size="sm" variant="ghost" onClick={exportInventory}>
                  Inventory
                </Button>
              </div>
            }
          />
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--ims-text-muted)]">Open issues</span>
              <span className="font-medium">{openLibrary.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ims-text-muted)]">Overdue issues</span>
              <span className="font-medium text-rose-700">{overdueLibrary.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ims-text-muted)]">Est. overdue fines</span>
              <span className="font-medium">
                {formatCurrency(
                  sumMoney(overdueLibrary.map((i) => libraryOverdueFine(i.dueDate))),
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ims-text-muted)]">Low / out stock</span>
              <span className="font-medium">
                {data.inventory.filter((i) => i.status !== "in_stock").length}
              </span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Results overview"
            action={
              <Button size="sm" variant="ghost" onClick={exportResults}>
                Export CSV
              </Button>
            }
          />
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--ims-text-muted)]">Result rows</span>
              <span className="font-medium">{data.results.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ims-text-muted)]">Passed</span>
              <span className="font-medium">
                {data.results.filter((r) => r.passed).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ims-text-muted)]">Failed</span>
              <span className="font-medium">
                {data.results.filter((r) => !r.passed).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--ims-text-muted)]">Today attendance %</span>
              <span className="font-medium">
                {stats.attendanceToday}% ({stats.attendanceCountedToday} counted)
              </span>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
