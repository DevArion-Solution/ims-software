"use client";

import { FormEvent, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField } from "@/components/ui/Modal";
import { useData } from "@/components/providers/DataProvider";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import { daysOverdue, libraryOverdueFine } from "@/lib/calc";
import type { Book } from "@/types";

export default function LibraryPage() {
  const {
    data,
    addBook,
    updateBook,
    deleteBook,
    issueBook,
    renewBook,
    returnBook,
    previewLibraryFine,
    postLibraryFineAsFee,
  } = useData();
  const [tab, setTab] = useState<"books" | "issues">("books");
  const [fineMsg, setFineMsg] = useState("");
  const [bookOpen, setBookOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [returnId, setReturnId] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState({
    accessionNo: "",
    title: "",
    author: "",
    category: "General",
    copies: "1",
    shelf: "",
  });
  const [issueForm, setIssueForm] = useState({
    bookId: data.books.find((b) => b.available > 0)?.id ?? data.books[0]?.id ?? "",
    memberType: "student" as "student" | "staff",
    memberId: "",
    days: "14",
  });

  const returning = data.bookIssues.find((i) => i.id === returnId);
  const previewFine = returnId ? previewLibraryFine(returnId) : 0;
  const previewDays = returning ? daysOverdue(returning.dueDate) : 0;

  const memberOptions = useMemo(() => {
    if (issueForm.memberType === "staff") {
      return data.staff
        .filter((s) => s.status === "active")
        .map((s) => ({
          id: s.id,
          label: `${s.name} · ${s.employeeNo}`,
        }));
    }
    return data.students
      .filter((s) => s.status === "active")
      .map((s) => ({
        id: s.id,
        label: `${s.firstName} ${s.lastName} · ${s.className}-${s.section}`,
      }));
  }, [data.staff, data.students, issueForm.memberType]);

  function openAddBook() {
    setEditingBook(null);
    setBookForm({
      accessionNo: "",
      title: "",
      author: "",
      category: "General",
      copies: "1",
      shelf: "",
    });
    setBookOpen(true);
  }

  function openEditBook(book: Book) {
    setEditingBook(book);
    setBookForm({
      accessionNo: book.accessionNo,
      title: book.title,
      author: book.author,
      category: book.category,
      copies: String(book.copies),
      shelf: book.shelf ?? "",
    });
    setBookOpen(true);
  }

  function openIssue() {
    setIssueForm({
      bookId: data.books.find((b) => b.available > 0)?.id ?? "",
      memberType: "student",
      memberId: data.students.find((s) => s.status === "active")?.id ?? "",
      days: "14",
    });
    setIssueOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Library"
        subtitle="Catalog · student/staff issue · renew · fine→fee by member id"
        actions={
          tab === "books" ? (
            <Button size="sm" onClick={openAddBook}>
              <Plus className="h-4 w-4" /> Add book
            </Button>
          ) : (
            <Button size="sm" onClick={openIssue}>
              <Plus className="h-4 w-4" /> Issue book
            </Button>
          )
        }
      />

      <div className="mb-4 flex gap-2">
        <Button
          size="sm"
          variant={tab === "books" ? "primary" : "secondary"}
          onClick={() => setTab("books")}
        >
          Catalog
        </Button>
        <Button
          size="sm"
          variant={tab === "issues" ? "primary" : "secondary"}
          onClick={() => setTab("issues")}
        >
          Issues
        </Button>
      </div>

      {tab === "books" ? (
        <Card>
          <Table
            headers={[
              "Accession",
              "Title",
              "Author",
              "Category",
              "Available",
              "Shelf",
              "Actions",
            ]}
          >
            {data.books.map((b) => (
              <tr key={b.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td className="font-medium text-[var(--ims-primary)]">
                  {b.accessionNo}
                </Td>
                <Td>{b.title}</Td>
                <Td>{b.author}</Td>
                <Td>{b.category}</Td>
                <Td>
                  {b.available}/{b.copies}
                </Td>
                <Td>{b.shelf ?? "—"}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      onClick={() => openEditBook(b)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 text-rose-600"
                      onClick={() => {
                        if (!confirm("Delete book?")) return;
                        const ok = deleteBook(b.id);
                        if (!ok) {
                          alert("Cannot delete — open issues still linked to this title.");
                        }
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
        <>
          {fineMsg ? (
            <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {fineMsg}
            </p>
          ) : null}
          <Card>
            <Table
              headers={[
                "Book",
                "Member",
                "Type",
                "Issued",
                "Due",
                "Renews",
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
                  <tr key={i.id} className="hover:bg-[var(--ims-muted)]/40">
                    <Td className="font-medium">{i.bookTitle}</Td>
                    <Td>
                      <div>
                        <p>{i.memberName}</p>
                        {i.memberId ? (
                          <p className="text-xs text-[var(--ims-text-muted)]">
                            ID: {i.memberId}
                          </p>
                        ) : null}
                      </div>
                    </Td>
                    <Td className="capitalize">{i.memberType}</Td>
                    <Td>{formatDate(i.issueDate)}</Td>
                    <Td>{formatDate(i.dueDate)}</Td>
                    <Td>{i.renewedCount ?? 0}</Td>
                    <Td>
                      {i.status !== "returned" ? (
                        <span className={estFine > 0 ? "font-medium text-rose-700" : ""}>
                          {formatCurrency(estFine)}
                          {overdueDays > 0 ? (
                            <span className="ml-1 text-xs text-[var(--ims-text-muted)]">
                              ({overdueDays}d)
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        formatCurrency(i.fine)
                      )}
                    </Td>
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
                      {i.finePosted ? (
                        <span className="ml-1 text-xs text-emerald-700">fee posted</span>
                      ) : null}
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
                              const ok = renewBook(i.id, 14);
                              setFineMsg(
                                ok
                                  ? `Renewed ${i.bookTitle} for ${i.memberName} (+14 days).`
                                  : "Could not renew.",
                              );
                            }}
                          >
                            Renew +14d
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
                                    : "Could not post fine (no student id / fine=0 / already posted).",
                                );
                              }}
                            >
                              Post fine→fee
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          </Card>
        </>
      )}

      <Modal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title={editingBook ? "Edit book" : "Add book"}
      >
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            const payload = {
              accessionNo: bookForm.accessionNo,
              title: bookForm.title,
              author: bookForm.author,
              category: bookForm.category,
              copies: Number(bookForm.copies),
              shelf: bookForm.shelf || undefined,
            };
            if (editingBook) {
              const ok = updateBook(editingBook.id, payload);
              if (!ok) {
                alert("Could not update — copies cannot be below currently issued count.");
                return;
              }
            } else {
              addBook(payload);
            }
            setBookOpen(false);
          }}
        >
          <Input
            label="Accession no."
            required
            value={bookForm.accessionNo}
            onChange={(e) => setBookForm({ ...bookForm, accessionNo: e.target.value })}
          />
          <Input
            label="Title"
            required
            value={bookForm.title}
            onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
          />
          <Input
            label="Author"
            required
            value={bookForm.author}
            onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
          />
          <Input
            label="Category"
            value={bookForm.category}
            onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
          />
          <Input
            label="Copies"
            type="number"
            min={1}
            value={bookForm.copies}
            onChange={(e) => setBookForm({ ...bookForm, copies: e.target.value })}
          />
          <Input
            label="Shelf"
            value={bookForm.shelf}
            onChange={(e) => setBookForm({ ...bookForm, shelf: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setBookOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingBook ? "Save" : "Add"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue book">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!issueForm.bookId || !issueForm.memberId) return;
            const ok = issueBook({
              bookId: issueForm.bookId,
              memberType: issueForm.memberType,
              memberId: issueForm.memberId,
              days: Number(issueForm.days) || 14,
            });
            if (!ok) {
              alert("Could not issue — check stock and member.");
              return;
            }
            setIssueOpen(false);
            setTab("issues");
          }}
        >
          <SelectField
            label="Book"
            value={issueForm.bookId}
            onChange={(v) => setIssueForm({ ...issueForm, bookId: v })}
          >
            {data.books
              .filter((b) => b.available > 0)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.available} left)
                </option>
              ))}
          </SelectField>
          <SelectField
            label="Member type"
            value={issueForm.memberType}
            onChange={(v) => {
              const memberType = v as "student" | "staff";
              const first =
                memberType === "staff"
                  ? data.staff.find((s) => s.status === "active")?.id ?? ""
                  : data.students.find((s) => s.status === "active")?.id ?? "";
              setIssueForm({ ...issueForm, memberType, memberId: first });
            }}
          >
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </SelectField>
          <SelectField
            label="Member"
            value={issueForm.memberId}
            onChange={(v) => setIssueForm({ ...issueForm, memberId: v })}
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
            value={issueForm.days}
            onChange={(e) => setIssueForm({ ...issueForm, days: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIssueOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Issue</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!returnId} onClose={() => setReturnId(null)} title="Confirm book return">
        {returning ? (
          <div className="space-y-3">
            <div className="rounded-md bg-[var(--ims-muted)]/50 p-3 text-sm">
              <p className="font-medium">{returning.bookTitle}</p>
              <p className="text-xs text-[var(--ims-text-muted)]">
                {returning.memberName}
                {returning.memberId ? ` · ${returning.memberId}` : ""} · due{" "}
                {formatDate(returning.dueDate)}
              </p>
              <p className="mt-2 text-xs text-[var(--ims-text-muted)]">
                Overdue days:{" "}
                <span className="font-medium text-[var(--ims-text)]">{previewDays}</span>
              </p>
              <p className="mt-1 text-sm">
                Fine on return:{" "}
                <span
                  className={
                    previewFine > 0 ? "font-semibold text-rose-700" : "font-semibold"
                  }
                >
                  {formatCurrency(previewFine)}
                </span>
                <span className="ml-1 text-xs text-[var(--ims-text-muted)]">
                  (Rs 10 × max(0, days overdue))
                </span>
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setReturnId(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  returnBook(returning.id);
                  setReturnId(null);
                }}
              >
                Confirm return
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
