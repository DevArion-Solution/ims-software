"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField } from "@/components/ui/Modal";
import { DocumentUpload, STAFF_DOC_LABELS } from "@/components/ui/DocumentUpload";
import { StatCard } from "@/components/ui/StatCard";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useData } from "@/components/providers/DataProvider";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import {
  inclusiveDayCount,
  staffAttendanceMonthSummary,
  sumMoney,
  unpaidLeaveDaysForMonth,
} from "@/lib/calc";
import type { LeaveType, PayrollRun, ProofDocument, StaffMember } from "@/types";

type Tab = "directory" | "leaves" | "payroll";

type StaffForm = {
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
  joinDate: string;
  salary: string;
  campusId: string;
  cnic: string;
  bankTitle: string;
  bankAccount: string;
  bankName: string;
  documents: ProofDocument[];
};

export default function StaffPage() {
  const { dict } = useLocale();
  const {
    data,
    addStaff,
    updateStaff,
    deleteStaff,
    requestLeave,
    approveLeave,
    rejectLeave,
    generatePayroll,
    updatePayrollLine,
    payPayroll,
    payAllPayrollForMonth,
  } = useData();
  const [tab, setTab] = useState<Tab>("directory");
  const [open, setOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [editPayOpen, setEditPayOpen] = useState(false);
  const [editingPay, setEditingPay] = useState<PayrollRun | null>(null);
  const [payEditForm, setPayEditForm] = useState({
    allowances: "",
    deductions: "",
    remarks: "",
  });
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [payrollMsg, setPayrollMsg] = useState("");
  const [form, setForm] = useState<StaffForm>({
    name: "",
    role: "Teacher",
    department: "General",
    phone: "",
    email: "",
    status: "active",
    joinDate: new Date().toISOString().slice(0, 10),
    salary: "50000",
    campusId: "camp1",
    cnic: "",
    bankTitle: "",
    bankAccount: "",
    bankName: "",
    documents: [],
  });
  const [leaveForm, setLeaveForm] = useState({
    staffId: data.staff[0]?.id ?? "",
    from: new Date().toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    type: "casual" as LeaveType,
  });
  const [payrollMonth, setPayrollMonth] = useState(
    new Date().toLocaleString("en-PK", { month: "long", year: "numeric" }),
  );

  const leavePreviewDays = useMemo(() => {
    if (!leaveForm.from || !leaveForm.to) return 0;
    const to = leaveForm.to < leaveForm.from ? leaveForm.from : leaveForm.to;
    return inclusiveDayCount(leaveForm.from, to);
  }, [leaveForm.from, leaveForm.to]);

  const payrollForMonth = useMemo(
    () => data.payroll.filter((p) => p.month === payrollMonth),
    [data.payroll, payrollMonth],
  );
  const payrollNetTotal = sumMoney(payrollForMonth.map((p) => p.net));
  const paidCount = payrollForMonth.filter((p) => p.status === "paid").length;
  const draftCount = payrollForMonth.filter((p) => p.status !== "paid").length;

  const attendanceByStaff = useMemo(() => {
    const map = new Map<
      string,
      { present: number; absent: number; late: number; leave: number }
    >();
    for (const s of data.staff) {
      map.set(
        s.id,
        staffAttendanceMonthSummary(data.staffAttendance ?? [], s.id, payrollMonth),
      );
    }
    return map;
  }, [data.staff, data.staffAttendance, payrollMonth]);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      role: "Teacher",
      department: "General",
      phone: "",
      email: "",
      status: "active",
      joinDate: new Date().toISOString().slice(0, 10),
      salary: "50000",
      campusId: data.institute.campuses[0]?.id ?? "camp1",
      cnic: "",
      bankTitle: "",
      bankAccount: "",
      bankName: "",
      documents: [],
    });
    setOpen(true);
  }

  function openEdit(member: StaffMember) {
    setEditing(member);
    setForm({
      name: member.name,
      role: member.role,
      department: member.department,
      phone: member.phone,
      email: member.email,
      status: member.status,
      joinDate: member.joinDate,
      salary: String(member.salary ?? 0),
      campusId: member.campusId ?? data.institute.campuses[0]?.id ?? "camp1",
      cnic: member.cnic ?? "",
      bankTitle: member.bankTitle ?? "",
      bankAccount: member.bankAccount ?? "",
      bankName: member.bankName ?? "",
      documents: member.documents ? [...member.documents] : [],
    });
    setOpen(true);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      role: form.role,
      department: form.department,
      phone: form.phone,
      email: form.email,
      status: form.status,
      joinDate: form.joinDate,
      salary: Number(form.salary),
      campusId: form.campusId,
      cnic: form.cnic || undefined,
      bankTitle: form.bankTitle || undefined,
      bankAccount: form.bankAccount || undefined,
      bankName: form.bankName || undefined,
      documents: form.documents.length ? form.documents : undefined,
    };
    if (editing) updateStaff(editing.id, payload);
    else addStaff(payload);
    setOpen(false);
  }

  function onLeaveSubmit(e: FormEvent) {
    e.preventDefault();
    requestLeave({
      staffId: leaveForm.staffId,
      from: leaveForm.from,
      to: leaveForm.to < leaveForm.from ? leaveForm.from : leaveForm.to,
      type: leaveForm.type,
    });
    setLeaveOpen(false);
  }

  function onGeneratePayroll() {
    const created = generatePayroll(payrollMonth, true);
    setPayrollMsg(
      created > 0
        ? `Synced ${created} payroll line(s) for ${payrollMonth} (10% allowances; tax 5% if basic > 100k; unpaid leave = basic/30 per day). Paid lines were left unchanged.`
        : `No changes — all active staff already have paid lines for ${payrollMonth}, or no salaried staff.`,
    );
  }

  function openEditPay(row: PayrollRun) {
    setEditingPay(row);
    setPayEditForm({
      allowances: String(row.allowances),
      deductions: String(row.deductions),
      remarks: row.remarks ?? "",
    });
    setEditPayOpen(true);
  }

  function onSavePayEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingPay) return;
    const ok = updatePayrollLine(editingPay.id, {
      allowances: Number(payEditForm.allowances),
      deductions: Number(payEditForm.deductions),
      remarks: payEditForm.remarks,
    });
    setEditPayOpen(false);
    setPayrollMsg(
      ok
        ? `Updated payroll line for ${editingPay.staffName}.`
        : "Could not edit — line may already be paid.",
    );
  }

  return (
    <div>
      <PageHeader
        title={dict.modules.staff.title}
        subtitle="Directory · leave → unpaid deduction · editable payroll · payslips"
        actions={
          tab === "directory" ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add staff
            </Button>
          ) : tab === "leaves" ? (
            <Button
              size="sm"
              onClick={() => {
                setLeaveForm({
                  staffId: data.staff[0]?.id ?? "",
                  from: new Date().toISOString().slice(0, 10),
                  to: new Date().toISOString().slice(0, 10),
                  type: "casual",
                });
                setLeaveOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Request leave
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={onGeneratePayroll}>
                Generate / refresh
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const n = payAllPayrollForMonth(payrollMonth);
                  setPayrollMsg(
                    n
                      ? `Paid ${n} — salary vouchers posted to Accounts.`
                      : "Nothing pending for this month.",
                  );
                }}
              >
                Pay all & post
              </Button>
            </div>
          )
        }
      />

      <div className="mb-4 flex gap-2">
        {(
          [
            ["directory", "Directory"],
            ["leaves", "Leaves"],
            ["payroll", "Payroll"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={tab === key ? "primary" : "secondary"}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "directory" && (
        <Card>
          <Table
            headers={[
              "Employee No.",
              "Name",
              "Role",
              "Department",
              "Phone",
              "Salary",
              "Bank",
              "Joined",
              dict.common.status,
              dict.common.actions,
            ]}
          >
            {data.staff.map((member) => (
              <tr key={member.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td className="font-medium text-[var(--ims-primary)]">
                  {member.employeeNo}
                </Td>
                <Td>
                  <div>
                    <Link
                      href={`/staff/${member.id}`}
                      className="font-medium text-[var(--ims-primary)] hover:underline"
                    >
                      {member.name}
                    </Link>
                    <p className="text-xs text-[var(--ims-text-muted)]">{member.email}</p>
                  </div>
                </Td>
                <Td>{member.role}</Td>
                <Td>{member.department}</Td>
                <Td>{member.phone}</Td>
                <Td>{formatCurrency(member.salary ?? 0)}</Td>
                <Td className="text-xs">
                  {member.bankAccount ? (
                    <>
                      <div>{member.bankName ?? "Bank"}</div>
                      <div className="text-[var(--ims-text-muted)]">{member.bankAccount}</div>
                    </>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>{formatDate(member.joinDate)}</Td>
                <Td>
                  <Badge status={member.status}>{labelize(member.status)}</Badge>
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      onClick={() => openEdit(member)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 text-rose-600"
                      onClick={() => {
                        if (confirm("Delete staff member?")) deleteStaff(member.id);
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
      )}

      {tab === "leaves" && (
        <Card>
          <Table
            headers={[
              "Staff",
              "Type",
              "From",
              "To",
              "Days",
              dict.common.status,
              dict.common.actions,
            ]}
          >
            {data.leaves.map((leave) => (
              <tr key={leave.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td className="font-medium">{leave.staffName}</Td>
                <Td>
                  {labelize(leave.type)}
                  {leave.type === "unpaid" && leave.status === "approved" ? (
                    <span className="ml-1 text-xs text-rose-700">deducts</span>
                  ) : null}
                </Td>
                <Td>{formatDate(leave.from)}</Td>
                <Td>{formatDate(leave.to)}</Td>
                <Td>{leave.days}</Td>
                <Td>
                  <Badge
                    status={
                      leave.status === "approved"
                        ? "paid"
                        : leave.status === "rejected"
                          ? "overdue"
                          : "pending"
                    }
                  >
                    {labelize(leave.status)}
                  </Badge>
                </Td>
                <Td>
                  {leave.status === "pending" ? (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => approveLeave(leave.id)}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => rejectLeave(leave.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    "—"
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "payroll" && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-4">
            <StatCard label="Lines this month" value={String(payrollForMonth.length)} />
            <StatCard label="Paid" value={String(paidCount)} tone="success" />
            <StatCard label="Pending" value={String(draftCount)} />
            <StatCard
              label="Net payroll"
              value={formatCurrency(payrollNetTotal)}
              tone="success"
            />
          </div>
          <div className="mb-4 max-w-sm">
            <Input
              label="Payroll month"
              value={payrollMonth}
              onChange={(e) => {
                setPayrollMonth(e.target.value);
                setPayrollMsg("");
              }}
            />
          </div>
          {payrollMsg ? (
            <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {payrollMsg}
            </p>
          ) : null}
          <Card className="mb-4">
            <p className="border-b border-[var(--ims-border)] px-4 py-3 text-xs font-medium">
              Attendance snapshot · {payrollMonth}
            </p>
            <Table
              headers={[
                "Staff",
                "Present",
                "Absent",
                "Late",
                "Leave",
                "Unpaid leave (approved)",
              ]}
            >
              {data.staff
                .filter((s) => s.status === "active")
                .map((s) => {
                  const att = attendanceByStaff.get(s.id) ?? {
                    present: 0,
                    absent: 0,
                    late: 0,
                    leave: 0,
                  };
                  const unpaid = unpaidLeaveDaysForMonth(data.leaves, s.id, payrollMonth);
                  return (
                    <tr key={s.id}>
                      <Td className="font-medium">{s.name}</Td>
                      <Td>{att.present}</Td>
                      <Td>{att.absent}</Td>
                      <Td>{att.late}</Td>
                      <Td>{att.leave}</Td>
                      <Td className={unpaid ? "font-semibold text-rose-700" : ""}>
                        {unpaid}
                      </Td>
                    </tr>
                  );
                })}
            </Table>
          </Card>
          <Card>
            <p className="border-b border-[var(--ims-border)] px-4 py-3 text-xs text-[var(--ims-text-muted)]">
              Basic = salary · Allowances = 10% (editable) · Tax 5% if basic &gt; 100k · Unpaid leave
              deducts basic/30 per day · Generate refreshes unpaid lines only
            </p>
            <Table
              headers={[
                "Staff",
                "Month",
                "Basic",
                "Allowances",
                "Leave days",
                "Deductions",
                "Net",
                dict.common.status,
                dict.common.actions,
              ]}
            >
              {data.payroll.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--ims-muted)]/40">
                  <Td className="font-medium">{row.staffName}</Td>
                  <Td>{row.month}</Td>
                  <Td>{formatCurrency(row.basic)}</Td>
                  <Td>{formatCurrency(row.allowances)}</Td>
                  <Td>{row.leaveDays ?? 0}</Td>
                  <Td>
                    {formatCurrency(row.deductions)}
                    {(row.leaveDeduction ?? 0) > 0 ? (
                      <span className="ml-1 text-xs text-rose-700">
                        (leave {formatCurrency(row.leaveDeduction ?? 0)})
                      </span>
                    ) : null}
                  </Td>
                  <Td className="font-semibold">{formatCurrency(row.net)}</Td>
                  <Td>
                    <Badge
                      status={
                        row.status === "paid"
                          ? "paid"
                          : row.status === "processed"
                            ? "partial"
                            : "pending"
                      }
                    >
                      {labelize(row.status)}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Link href={`/payslip/${row.id}`}>
                        <Button variant="ghost" size="sm" className="px-2" title="Payslip">
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {row.status !== "paid" ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2"
                            onClick={() => openEditPay(row)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              payPayroll(row.id);
                              setPayrollMsg(
                                `Paid ${row.staffName} — salary voucher posted.`,
                              );
                            }}
                          >
                            Pay & post
                          </Button>
                        </>
                      ) : row.paidOn ? (
                        formatDate(row.paidOn)
                      ) : (
                        "—"
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit staff" : "Add staff"}
        wide
      >
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Full name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Role"
            required
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
          <Input
            label="Department"
            required
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <Input
            label="Phone"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Salary (PKR)"
            type="number"
            value={form.salary}
            onChange={(e) => setForm({ ...form, salary: e.target.value })}
          />
          <Input
            label="Join date"
            type="date"
            required
            value={form.joinDate}
            onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
          <SelectField
            label="Campus"
            value={form.campusId}
            onChange={(v) => setForm({ ...form, campusId: v })}
          >
            {data.institute.campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <Input
            label="CNIC"
            value={form.cnic}
            onChange={(e) => setForm({ ...form, cnic: e.target.value })}
            placeholder="xxxxx-xxxxxxx-x"
          />
          <Input
            label="Bank account title"
            value={form.bankTitle}
            onChange={(e) => setForm({ ...form, bankTitle: e.target.value })}
          />
          <Input
            label="Bank name"
            value={form.bankName}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          />
          <Input
            label="Account / IBAN"
            value={form.bankAccount}
            onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
          />
          <div className="sm:col-span-2">
            <DocumentUpload
              title="Staff proof documents"
              hint="Upload CNIC, degrees, experience letters, photo and other proofs"
              labels={STAFF_DOC_LABELS}
              documents={form.documents}
              onChange={(documents) => setForm({ ...form, documents })}
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save" : "Add staff"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Request leave">
        <form onSubmit={onLeaveSubmit} className="space-y-3">
          <SelectField
            label="Staff"
            value={leaveForm.staffId}
            onChange={(v) => setLeaveForm({ ...leaveForm, staffId: v })}
            required
          >
            {data.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Leave type"
            value={leaveForm.type}
            onChange={(v) => setLeaveForm({ ...leaveForm, type: v as LeaveType })}
          >
            <option value="casual">Casual</option>
            <option value="sick">Sick</option>
            <option value="annual">Annual</option>
            <option value="unpaid">Unpaid (deducts from payroll)</option>
          </SelectField>
          <Input
            label="From"
            type="date"
            required
            value={leaveForm.from}
            onChange={(e) => setLeaveForm({ ...leaveForm, from: e.target.value })}
          />
          <Input
            label="To"
            type="date"
            required
            value={leaveForm.to}
            onChange={(e) => setLeaveForm({ ...leaveForm, to: e.target.value })}
          />
          <p className="text-xs text-[var(--ims-text-muted)]">
            Inclusive days:{" "}
            <span className="font-medium text-[var(--ims-text)]">{leavePreviewDays}</span>
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit request</Button>
          </div>
        </form>
      </Modal>

      <Modal open={editPayOpen} onClose={() => setEditPayOpen(false)} title="Edit payroll line">
        <form onSubmit={onSavePayEdit} className="space-y-3">
          <p className="text-sm text-[var(--ims-text-muted)]">
            {editingPay?.staffName} · {editingPay?.month} · Basic{" "}
            {formatCurrency(editingPay?.basic ?? 0)} (locked)
          </p>
          <Input
            label="Allowances"
            type="number"
            min={0}
            required
            value={payEditForm.allowances}
            onChange={(e) => setPayEditForm({ ...payEditForm, allowances: e.target.value })}
          />
          <Input
            label="Total deductions"
            type="number"
            min={0}
            required
            value={payEditForm.deductions}
            onChange={(e) => setPayEditForm({ ...payEditForm, deductions: e.target.value })}
          />
          <Input
            label="Remarks"
            value={payEditForm.remarks}
            onChange={(e) => setPayEditForm({ ...payEditForm, remarks: e.target.value })}
          />
          <p className="text-xs text-[var(--ims-text-muted)]">
            Net preview:{" "}
            {formatCurrency(
              Math.max(
                0,
                (editingPay?.basic ?? 0) +
                  Number(payEditForm.allowances || 0) -
                  Number(payEditForm.deductions || 0),
              ),
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditPayOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save line</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
