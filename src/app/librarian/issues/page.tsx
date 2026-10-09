"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PortalShell, LIBRARIAN_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField } from "@/components/ui/Modal";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import { daysOverdue, libraryOverdueFine } from "@/lib/calc";

export default function LibrarianIssuesPage() {
  const {
    data,
    issueBook,
    renewBook,
    returnBook,
    previewLibraryFine,
    postLibraryFineAsFee,
  } = useData();
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnId, setReturnId] = useState<string | null>(null);
  const [fineMsg, setFineMsg] = useState("");
  const [form, setForm] = useState({
    bookId: data.books.find((b) => b.available > 0)?.id ?? "",
    memberType: "student" as "student" | "staff",
    memberId: data.students.find((s) => s.status === "active")?.id ?? "",
    days: "14",
  });

  const returning = data.bookIssues.find((i) => i.id === returnId);
  const previewFine = returnId ? previewLibraryFine(returnId) : 0;
  const previewDays = returning ? daysOverdue(returning.dueDate) : 0;

  const memberOptions = useMemo(() => {
    if (form.memberType === "staff") {
      return data.staff
        .filter((s) => s.status === "active")
        .map((s) => ({ id: s.id, label: `${s.name} · ${s.employeeNo}` }));
    }
    return data.students
      .filter((s) => s.status === "active")
      .map((s) => ({
        id: s.id,
        label: `${s.firstName} ${s.lastName} · ${s.className}-${s.section}`,
      }));
  }, [data.staff, data.students, form.memberType]);

  function submitIssue(e: FormEvent) {
    e.preventDefault();
    if (!form.bookId || !form.memberId) return;
    const ok = issueBook({
      bookId: form.bookId,
      memberType: form.memberType,
      memberId: form.memberId,
      days: Number(form.days) || 14,
    });
    if (!ok) {
      setFineMsg("Could not issue — check stock and member.");
      return;
    }
    setIssueOpen(false);
    setFineMsg("Book issued.");
  }

  return (
    <PortalShell
      title="Librarian Portal"
      subtitle="Catalog & circulation"
      nav={LIBRARIAN_NAV}
      accent="accent"
    >
      <PageHeader
        title="Issue / Return"
        subtitle="Pick student/staff · renew · overdue fine Rs 10/day"
        actions={
          <Button size="sm" onClick={() => setIssueOpen(true)}>
            <Plus className="h-4 w-4" /> Issue book
          </Button>
        }
      />
      {fineMsg ? <p className="mb-3 text-sm text-emerald-700">{fineMsg}</p> : null}
      <Card>
        <Table
          headers={[
            "Book",
            "Member",
            "Type",
            "Issued",
            "Due",
            "Est. fine",
            "Status",
            "Actions",
          ]}
        >
          {data.bookIssues.map((i) => {
            const estFine =
              i.status === "returned" ? i.fine : libraryOverdueFine(i.dueDate);
            const overdueDays =
              i.status === "returned" ? 0 : daysOverdue(i.dueDate);
            return (
              <tr key={i.id}>
                <Td className="font-medium">{i.bookTitle}</Td>
                <Td>
                  <div>
                    <p>{i.memberName}</p>
                    {i.memberId ? (
                      <p className="text-xs text-[var(--ims-text-muted)]">
                        {i.memberId}
                      </p>
                    ) : null}
                  </div>
                </Td>
                <Td className="capitalize">{i.memberType}</Td>
                <Td>{formatDate(i.issueDate)}</Td>
                <Td>{formatDate(i.dueDate)}</Td>
                <Td>{formatCurrency(estFine)}</Td>
                <Td>
                  <Badge
                    status={
                      i.status === "returned"
                        ? "paid"
                        : overdueDays > 0
                          ? "overdue"
                          : "pending"
                    }
                  >
                    {overdueDays > 0 && i.status !== "returned"
                      ? "Overdue"
                      : labelize(i.status)}
                  </Badge>
                </Td>
                <Td>
                  {i.status !== "returned" ? (
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" onClick={() => setReturnId(i.id)}>
                        Return
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          renewBook(i.id, 14);
                          setFineMsg(`Renewed ${i.bookTitle} (+14 days)`);
                        }}
                      >
                        Renew
                      </Button>
                      {estFine > 0 && i.memberType === "student" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!!i.finePosted}
                          onClick={() => {
                            const ok = postLibraryFineAsFee(i.id);
                            setFineMsg(
                              ok
                                ? `Library fine posted as fee challan for ${i.memberName}.`
                                : "Could not post fine (student id / fine=0 / already posted).",
                            );
                          }}
                        >
                          Post fine
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--ims-text-muted)]">
                      {formatCurrency(i.fine)}
                    </span>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue book">
        <form className="space-y-3" onSubmit={submitIssue}>
          <SelectField
            label="Book"
            value={form.bookId}
            onChange={(v) => setForm({ ...form, bookId: v })}
          >
            {data.books
              .filter((b) => b.available > 0)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.accessionNo} — {b.title} ({b.available} avail)
                </option>
              ))}
          </SelectField>
          <SelectField
            label="Member type"
            value={form.memberType}
            onChange={(v) => {
              const memberType = v as "student" | "staff";
              const memberId =
                memberType === "staff"
                  ? data.staff.find((s) => s.status === "active")?.id ?? ""
                  : data.students.find((s) => s.status === "active")?.id ?? "";
              setForm({ ...form, memberType, memberId });
            }}
          >
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </SelectField>
          <SelectField
            label="Member"
            value={form.memberId}
            onChange={(v) => setForm({ ...form, memberId: v })}
            required
          >
            <option value="">Select member</option>
            {memberOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </SelectField>
          <Input
            label="Loan days"
            type="number"
            min={1}
            value={form.days}
            onChange={(e) => setForm({ ...form, days: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIssueOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Issue</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!returnId} onClose={() => setReturnId(null)} title="Return book">
        {returning ? (
          <div className="space-y-3">
            <p className="text-sm">
              <strong>{returning.bookTitle}</strong> · {returning.memberName}
            </p>
            <p className="text-sm text-[var(--ims-text-muted)]">
              Due {formatDate(returning.dueDate)}
              {previewDays > 0 ? ` · ${previewDays} day(s) overdue` : ""}
            </p>
            <p className="text-sm font-medium">
              Fine on return: {formatCurrency(previewFine)}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setReturnId(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  returnBook(returning.id);
                  setReturnId(null);
                  setFineMsg(`Returned ${returning.bookTitle}`);
                }}
              >
                Confirm return
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </PortalShell>
  );
}
