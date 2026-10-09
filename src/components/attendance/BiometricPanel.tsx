"use client";

import { useMemo, useState } from "react";
import { Fingerprint, Upload } from "lucide-react";
import { useData } from "@/components/providers/DataProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table, Td } from "@/components/ui/Table";
import { Modal, SelectField } from "@/components/ui/Modal";

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      q = !q;
      continue;
    }
    if (ch === "," && !q) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function BiometricPanel() {
  const { data, updateStudent } = useData();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [biometricId, setBiometricId] = useState("");
  const [rfidTag, setRfidTag] = useState("");

  const mapped = useMemo(
    () => data.students.filter((s) => s.biometricId || s.rfidTag),
    [data.students],
  );

  async function importFile(file: File, mode: "mapping" | "logs") {
    setBusy(true);
    setMsg("");
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) {
        setMsg("CSV empty or invalid — need header + rows");
        setBusy(false);
        return;
      }
      const res = await fetch("/api/attendance/biometric/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, rows, notifyAbsent: true }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) setMsg(json.error ?? "Import failed");
      else {
        setMsg(json.message ?? "Import done — refresh if list looks stale");
        // Soft reload school data
        window.location.reload();
      }
    } catch {
      setMsg("Could not read / upload CSV");
    }
    setBusy(false);
  }

  function saveMapping() {
    if (!studentId) return;
    updateStudent(studentId, {
      biometricId: biometricId.trim() || undefined,
      rfidTag: rfidTag.trim() || undefined,
    });
    setMsg("Device ID mapped on student");
    setMapOpen(false);
    setBiometricId("");
    setRfidTag("");
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--ims-text)]">
            <Fingerprint className="h-4 w-4" />
            ZKTeco / biometric devices
          </h2>
          <p className="mt-1 text-xs text-[var(--ims-text-muted)]">
            Map device User IDs to students, import punch CSV, or POST live punches to{" "}
            <code className="rounded bg-[var(--ims-muted)] px-1">/api/attendance/device</code> with{" "}
            <code className="rounded bg-[var(--ims-muted)] px-1">x-device-key</code>.
          </p>
        </div>
        <Button size="sm" onClick={() => setMapOpen(true)}>
          Map student ID
        </Button>
      </div>

      {msg ? <p className="text-sm text-emerald-700 break-words">{msg}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-[var(--ims-border)] p-4 text-sm hover:bg-[var(--ims-muted)]/30">
          <span className="font-medium">
            <Upload className="mr-1 inline h-4 w-4" />
            Import mapping CSV
          </span>
          <span className="text-xs text-[var(--ims-text-muted)]">
            Headers: admissionNo, biometricId, rfidTag
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="text-xs"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f, "mapping");
              e.target.value = "";
            }}
          />
        </label>
        <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-[var(--ims-border)] p-4 text-sm hover:bg-[var(--ims-muted)]/30">
          <span className="font-medium">
            <Upload className="mr-1 inline h-4 w-4" />
            Import ZKTeco punch CSV
          </span>
          <span className="text-xs text-[var(--ims-text-muted)]">
            Headers: User ID (or biometricId), DateTime, Status — absent alerts auto-send
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="text-xs"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f, "logs");
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--ims-border)]">
        <Table headers={["Student", "Admission", "Biometric ID", "RFID / Card"]}>
          {mapped.slice(0, 50).map((s) => (
            <tr key={s.id}>
              <Td className="font-medium">
                {s.firstName} {s.lastName}
              </Td>
              <Td>{s.admissionNo}</Td>
              <Td>{s.biometricId ?? "—"}</Td>
              <Td>{s.rfidTag ?? "—"}</Td>
            </tr>
          ))}
        </Table>
        {!mapped.length ? (
          <p className="p-4 text-center text-xs text-[var(--ims-text-muted)]">
            No device IDs mapped yet
          </p>
        ) : null}
      </div>

      <Modal open={mapOpen} onClose={() => setMapOpen(false)} title="Map biometric / RFID">
        <div className="space-y-3">
          <SelectField
            label="Student"
            value={studentId}
            onChange={(v) => {
              setStudentId(v);
              const s = data.students.find((x) => x.id === v);
              setBiometricId(s?.biometricId ?? "");
              setRfidTag(s?.rfidTag ?? "");
            }}
          >
            <option value="">Select…</option>
            {data.students
              .filter((s) => s.status === "active")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.admissionNo})
                </option>
              ))}
          </SelectField>
          <Input
            label="ZKTeco User ID / biometricId"
            value={biometricId}
            onChange={(e) => setBiometricId(e.target.value)}
          />
          <Input
            label="RFID / Card No"
            value={rfidTag}
            onChange={(e) => setRfidTag(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMapOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveMapping} disabled={!studentId}>
              Save mapping
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
