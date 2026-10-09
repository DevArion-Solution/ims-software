"use client";

import { useRef, useState } from "react";
import { FileUp, Trash2, Eye, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ProofDocument } from "@/types";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB (server also enforces)

export const STUDENT_DOC_LABELS = [
  "B-Form / Birth Certificate",
  "Student CNIC / B-Form copy",
  "Father / Guardian CNIC",
  "Mother CNIC",
  "Previous school leaving certificate",
  "Character certificate",
  "Passport-size photos",
  "Fee deposit slip",
  "Domicile",
  "Other proof",
];

export const STAFF_DOC_LABELS = [
  "CNIC front",
  "CNIC back",
  "CV / Resume",
  "Degree / Certificate",
  "Experience letter",
  "Police verification",
  "Photo",
  "Other proof",
];

function uid() {
  return `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function DocumentUpload({
  documents,
  onChange,
  labels = STUDENT_DOC_LABELS,
  title = "Proof documents",
  hint = "Upload scanned CNIC, B-Form, certificates, photos (PDF / JPG / PNG). Max 5MB each.",
  tenantId,
}: {
  documents: ProofDocument[];
  onChange: (docs: ProofDocument[]) => void;
  labels?: string[];
  title?: string;
  hint?: string;
  tenantId?: string;
}) {
  const [label, setLabel] = useState(labels[0] ?? "Other proof");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | null) {
    setError("");
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(`File too large (${Math.round(file.size / 1024)}KB). Max ${Math.round(MAX_BYTES / 1024)}KB.`);
      return;
    }
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "image/jpg",
    ];
    if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|webp)$/i)) {
      setError("Only PDF, JPG, PNG or WEBP allowed.");
      return;
    }
    setBusy(true);
    try {
      // Prefer server file storage
      const form = new FormData();
      form.append("file", file);
      form.append("label", label);
      if (tenantId) form.append("tenantId", tenantId);

      const res = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: form,
      });

      if (res.ok) {
        const json = (await res.json()) as { document: ProofDocument };
        onChange([...documents, json.document]);
      } else {
        // Fallback to data URL for offline/demo
        const dataUrl = await readFileAsDataUrl(file);
        const doc: ProofDocument = {
          id: uid(),
          label,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
          uploadedAt: new Date().toISOString(),
        };
        onChange([...documents, doc]);
      }
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setError("Could not upload file. Try another file.");
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    onChange(documents.filter((d) => d.id !== id));
  }

  return (
    <div className="rounded-lg border border-[var(--ims-border)] bg-[var(--ims-muted)]/30 p-4">
      <div className="mb-3 flex items-start gap-2">
        <Paperclip className="mt-0.5 h-4 w-4 text-[var(--ims-primary)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--ims-text)]">{title}</p>
          <p className="mt-0.5 text-xs text-[var(--ims-text-muted)]">{hint}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Document type</span>
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-10 rounded-md border border-[var(--ims-border)] bg-white px-3 text-sm"
          >
            {labels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <FileUp className="h-4 w-4" />
            {busy ? "Uploading…" : "Choose file"}
          </Button>
        </div>
      </div>

      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}

      {documents.length ? (
        <ul className="mt-4 space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-md border border-[var(--ims-border)] bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{doc.label}</p>
                <p className="truncate text-xs text-[var(--ims-text-muted)]">
                  {doc.fileName} · {Math.max(1, Math.round(doc.size / 1024))} KB
                </p>
              </div>
              <a
                href={doc.dataUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-[var(--ims-primary)] hover:bg-[var(--ims-primary-soft)]"
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="px-2 text-rose-600"
                onClick={() => remove(doc.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-[var(--ims-text-muted)]">
          No proofs attached yet. Select type → Choose file for each required document.
        </p>
      )}
    </div>
  );
}

export function DocumentsList({
  documents,
  empty = "No documents uploaded",
}: {
  documents?: ProofDocument[];
  empty?: string;
}) {
  if (!documents?.length) {
    return <p className="text-sm text-[var(--ims-text-muted)]">{empty}</p>;
  }
  return (
    <ul className="space-y-2">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center justify-between gap-3 rounded-md border border-[var(--ims-border)] px-3 py-2 text-sm"
        >
          <div className="min-w-0">
            <p className="font-medium">{doc.label}</p>
            <p className="truncate text-xs text-[var(--ims-text-muted)]">{doc.fileName}</p>
          </div>
          <a
            href={doc.dataUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs font-medium text-[var(--ims-primary)]"
          >
            Open
          </a>
        </li>
      ))}
    </ul>
  );
}
