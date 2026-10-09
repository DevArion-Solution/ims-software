"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { PortalShell, LIBRARIAN_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export default function LibrarianCatalogPage() {
  const { data, addBook } = useData();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    accessionNo: "",
    title: "",
    author: "",
    category: "General",
    copies: "1",
    shelf: "",
  });

  const rows = data.books.filter((b) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return (
      b.title.toLowerCase().includes(term) ||
      b.author.toLowerCase().includes(term) ||
      b.accessionNo.toLowerCase().includes(term) ||
      b.category.toLowerCase().includes(term)
    );
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    addBook({
      accessionNo: form.accessionNo,
      title: form.title,
      author: form.author,
      category: form.category,
      copies: Number(form.copies) || 1,
      shelf: form.shelf || undefined,
    });
    setOpen(false);
    setForm({
      accessionNo: "",
      title: "",
      author: "",
      category: "General",
      copies: "1",
      shelf: "",
    });
  }

  return (
    <PortalShell title="Librarian Portal" subtitle="Catalog & circulation" nav={LIBRARIAN_NAV} accent="accent">
      <PageHeader
        title="Catalog"
        subtitle="Book titles and availability"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search catalog…"
              className="h-9 rounded-md border border-[var(--ims-border)] bg-white px-3 text-sm"
            />
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add book
            </Button>
          </div>
        }
      />
      <Card>
        <Table headers={["Accession", "Title", "Author", "Category", "Available", "Shelf"]}>
          {rows.map((b) => (
            <tr key={b.id}>
              <Td className="font-medium text-[var(--ims-primary)]">{b.accessionNo}</Td>
              <Td>{b.title}</Td>
              <Td>{b.author}</Td>
              <Td>{b.category}</Td>
              <Td>
                {b.available}/{b.copies}
              </Td>
              <Td>{b.shelf ?? "—"}</Td>
            </tr>
          ))}
        </Table>
        {!rows.length ? (
          <p className="p-8 text-center text-sm text-[var(--ims-text-muted)]">No books match</p>
        ) : null}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add book">
        <form className="space-y-3" onSubmit={submit}>
          <Input
            label="Accession no"
            required
            value={form.accessionNo}
            onChange={(e) => setForm({ ...form, accessionNo: e.target.value })}
          />
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Author"
            required
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
          />
          <Input
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <Input
            label="Copies"
            type="number"
            min={1}
            value={form.copies}
            onChange={(e) => setForm({ ...form, copies: e.target.value })}
          />
          <Input
            label="Shelf"
            value={form.shelf}
            onChange={(e) => setForm({ ...form, shelf: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </PortalShell>
  );
}
