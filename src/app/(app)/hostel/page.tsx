"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import { useData } from "@/components/providers/DataProvider";
import { formatCurrency, formatDate, labelize } from "@/lib/utils";
import type { HostelRoom } from "@/types";

export default function HostelPage() {
  const {
    data,
    addHostelRoom,
    updateHostelRoom,
    allotHostel,
    vacateHostel,
    updateAllotmentMessFee,
    collectMessFee,
    generateMessFees,
    addHostelVisitor,
    checkoutHostelVisitor,
  } = useData();
  const [roomOpen, setRoomOpen] = useState(false);
  const [allotOpen, setAllotOpen] = useState(false);
  const [visitorOpen, setVisitorOpen] = useState(false);
  const [messOpen, setMessOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [visitorForm, setVisitorForm] = useState({
    visitorName: "",
    studentId: "",
    relation: "Parent",
    notes: "",
  });
  const [roomForm, setRoomForm] = useState<{
    block: string;
    roomNo: string;
    capacity: string;
    type: "boys" | "girls" | "staff";
  }>({
    block: "A",
    roomNo: "",
    capacity: "4",
    type: "boys",
  });
  const [allotForm, setAllotForm] = useState({
    studentId: "",
    roomId: "",
    messFee: "8000",
  });
  const [messForm, setMessForm] = useState({
    month: new Date().toLocaleString("en-PK", {
      month: "long",
      year: "numeric",
    }),
    dueDate: (() => {
      const d = new Date();
      d.setDate(10);
      return d.toISOString().slice(0, 10);
    })(),
    roomId: "",
  });

  const activeAllotments = useMemo(
    () => data.hostelAllotments.filter((a) => a.status === "active"),
    [data.hostelAllotments],
  );
  const messTotal = activeAllotments.reduce((s, a) => s + (a.messFee ?? 0), 0);
  const boardedIds = useMemo(
    () => new Set(activeAllotments.map((a) => a.studentId)),
    [activeAllotments],
  );
  const freeStudents = useMemo(
    () =>
      data.students.filter(
        (s) => s.status === "active" && !boardedIds.has(s.id),
      ),
    [data.students, boardedIds],
  );
  const openRooms = useMemo(
    () =>
      data.hostelRooms.filter(
        (r) => r.status !== "maintenance" && r.occupied < r.capacity,
      ),
    [data.hostelRooms],
  );
  const boarderStudents = useMemo(
    () => data.students.filter((s) => boardedIds.has(s.id)),
    [data.students, boardedIds],
  );

  function previewMessCount() {
    let n = 0;
    for (const a of activeAllotments) {
      if (messForm.roomId && a.roomId !== messForm.roomId) continue;
      if ((a.messFee ?? 0) <= 0) continue;
      const exists = data.fees.some(
        (f) =>
          f.studentId === a.studentId &&
          f.month === messForm.month &&
          f.feeHead === "Hostel Mess Fee",
      );
      if (!exists) n += 1;
    }
    return n;
  }

  function openAllot() {
    setAllotForm({
      studentId: freeStudents[0]?.id ?? "",
      roomId: openRooms[0]?.id ?? "",
      messFee: "8000",
    });
    setAllotOpen(true);
  }

  function openVisitor() {
    setVisitorForm({
      visitorName: "",
      studentId: boarderStudents[0]?.id ?? "",
      relation: "Parent",
      notes: "",
    });
    setVisitorOpen(true);
  }

  function toggleMaintenance(room: HostelRoom) {
    if (room.status === "maintenance") {
      updateHostelRoom(room.id, {
        status: room.occupied >= room.capacity ? "full" : "available",
      });
    } else {
      updateHostelRoom(room.id, { status: "maintenance" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Hostel"
        subtitle="Rooms · allotment · monthly mess batch · visitors"
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => setMessOpen(true)}>
              Bill mess (month)
            </Button>
            <Button size="sm" variant="secondary" onClick={openVisitor}>
              Log visitor
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setRoomOpen(true)}>
              <Plus className="h-4 w-4" /> Add room
            </Button>
            <Button
              size="sm"
              onClick={openAllot}
              disabled={!freeStudents.length || !openRooms.length}
            >
              Allot room
            </Button>
          </>
        }
      />

      {msg ? (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      ) : null}

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Rooms" value={String(data.hostelRooms.length)} />
        <StatCard label="Active boarders" value={String(activeAllotments.length)} />
        <StatCard label="Mess fee / month" value={formatCurrency(messTotal)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <Table headers={["Room", "Type", "Occupancy", "Status", "Actions"]}>
            {data.hostelRooms.map((r) => (
              <tr key={r.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td className="font-medium">
                  {r.block}-{r.roomNo}
                </Td>
                <Td className="capitalize">{r.type}</Td>
                <Td>
                  {r.occupied}/{r.capacity}
                </Td>
                <Td>
                  <Badge
                    status={
                      r.status === "available"
                        ? "paid"
                        : r.status === "full"
                          ? "pending"
                          : "overdue"
                    }
                  >
                    {labelize(r.status)}
                  </Badge>
                </Td>
                <Td>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleMaintenance(r)}
                  >
                    {r.status === "maintenance" ? "Reopen" : "Maintenance"}
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <Table
            headers={[
              "Student",
              "Room",
              "Mess fee",
              "Allotted",
              "Status",
              "Actions",
            ]}
          >
            {data.hostelAllotments.map((a) => (
              <tr key={a.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td className="font-medium">{a.studentName}</Td>
                <Td>{a.roomLabel}</Td>
                <Td>
                  {a.status === "active" ? (
                    <input
                      type="number"
                      min={0}
                      className="h-8 w-24 rounded border border-[var(--ims-border)] px-2 text-sm"
                      defaultValue={a.messFee ?? 0}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== (a.messFee ?? 0)) {
                          updateAllotmentMessFee(a.id, v);
                        }
                      }}
                    />
                  ) : (
                    formatCurrency(a.messFee ?? 0)
                  )}
                </Td>
                <Td>{formatDate(a.allotDate)}</Td>
                <Td>
                  <Badge status={a.status === "active" ? "paid" : "inactive"}>
                    {labelize(a.status)}
                  </Badge>
                </Td>
                <Td>
                  {a.status === "active" ? (
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const month = new Date().toLocaleString("en-PK", {
                            month: "long",
                            year: "numeric",
                          });
                          const ok = collectMessFee(a.id, undefined, month);
                          setMsg(
                            ok
                              ? `Mess challan created for ${a.studentName} (${month}).`
                              : `No challan — already billed for ${month} or fee is 0.`,
                          );
                        }}
                      >
                        Bill mess
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (confirm(`Vacate ${a.studentName}?`)) {
                            vacateHostel(a.id);
                            setMsg(`${a.studentName} vacated ${a.roomLabel}.`);
                          }
                        }}
                      >
                        Vacate
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
      </div>

      <Card className="mt-6">
        <p className="border-b border-[var(--ims-border)] px-4 py-3 text-sm font-medium">
          Visitor log
        </p>
        <Table headers={["Visitor", "Student", "Relation", "In", "Out", ""]}>
          {data.hostelVisitors.map((v) => (
            <tr key={v.id}>
              <Td className="font-medium">{v.visitorName}</Td>
              <Td>{v.studentName}</Td>
              <Td>{v.relation}</Td>
              <Td className="text-xs">
                {v.inTime.slice(0, 16).replace("T", " ")}
              </Td>
              <Td className="text-xs">
                {v.outTime ? v.outTime.slice(0, 16).replace("T", " ") : "—"}
              </Td>
              <Td>
                {!v.outTime ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => checkoutHostelVisitor(v.id)}
                  >
                    Check out
                  </Button>
                ) : (
                  "—"
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal open={roomOpen} onClose={() => setRoomOpen(false)} title="Add hostel room">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            addHostelRoom({
              block: roomForm.block,
              roomNo: roomForm.roomNo,
              capacity: Number(roomForm.capacity),
              type: roomForm.type,
            });
            setRoomOpen(false);
          }}
        >
          <Input
            label="Block"
            required
            value={roomForm.block}
            onChange={(e) => setRoomForm({ ...roomForm, block: e.target.value })}
          />
          <Input
            label="Room no."
            required
            value={roomForm.roomNo}
            onChange={(e) => setRoomForm({ ...roomForm, roomNo: e.target.value })}
          />
          <Input
            label="Capacity"
            type="number"
            required
            value={roomForm.capacity}
            onChange={(e) =>
              setRoomForm({ ...roomForm, capacity: e.target.value })
            }
          />
          <SelectField
            label="Type"
            value={roomForm.type}
            onChange={(v) =>
              setRoomForm({
                ...roomForm,
                type: v as "boys" | "girls" | "staff",
              })
            }
          >
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
            <option value="staff">Staff</option>
          </SelectField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRoomOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <Modal open={allotOpen} onClose={() => setAllotOpen(false)} title="Allot hostel room">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!allotForm.studentId || !allotForm.roomId) return;
            const ok = allotHostel(
              allotForm.studentId,
              allotForm.roomId,
              Number(allotForm.messFee) || 8000,
            );
            setAllotOpen(false);
            setMsg(
              ok
                ? "Student allotted to hostel room."
                : "Could not allot — room full/maintenance or student already boarded.",
            );
          }}
        >
          <SelectField
            label="Student (not yet boarded)"
            value={allotForm.studentId}
            onChange={(v) => setAllotForm({ ...allotForm, studentId: v })}
          >
            {freeStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName} — {s.className}-{s.section}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Room"
            value={allotForm.roomId}
            onChange={(v) => setAllotForm({ ...allotForm, roomId: v })}
          >
            {openRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.block}-{r.roomNo} ({r.occupied}/{r.capacity}) · {r.type}
              </option>
            ))}
          </SelectField>
          <Input
            label="Monthly mess fee"
            type="number"
            value={allotForm.messFee}
            onChange={(e) => setAllotForm({ ...allotForm, messFee: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAllotOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!freeStudents.length || !openRooms.length}
            >
              Allot
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={messOpen} onClose={() => setMessOpen(false)} title="Generate monthly mess fees">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            const n = generateMessFees(messForm.month, messForm.dueDate, {
              roomId: messForm.roomId || undefined,
            });
            setMessOpen(false);
            setMsg(
              n
                ? `Created ${n} mess fee challan(s) for ${messForm.month}.`
                : "No new challans — already billed this month or no active boarders.",
            );
          }}
        >
          <Input
            label="Fee month label"
            required
            value={messForm.month}
            onChange={(e) => setMessForm({ ...messForm, month: e.target.value })}
          />
          <Input
            label="Due date"
            type="date"
            required
            value={messForm.dueDate}
            onChange={(e) => setMessForm({ ...messForm, dueDate: e.target.value })}
          />
          <SelectField
            label="Room scope"
            value={messForm.roomId}
            onChange={(v) => setMessForm({ ...messForm, roomId: v })}
          >
            <option value="">All rooms</option>
            {data.hostelRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.block}-{r.roomNo}
              </option>
            ))}
          </SelectField>
          <p className="rounded-md border border-[var(--ims-border)] bg-[var(--ims-muted)]/40 px-3 py-2 text-xs text-[var(--ims-text-muted)]">
            Preview:{" "}
            <span className="font-semibold text-[var(--ims-text)]">
              {previewMessCount()}
            </span>{" "}
            new challan(s). Duplicates for the same month are skipped.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setMessOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Generate</Button>
          </div>
        </form>
      </Modal>

      <Modal open={visitorOpen} onClose={() => setVisitorOpen(false)} title="Log hostel visitor">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            const st = data.students.find((s) => s.id === visitorForm.studentId);
            if (!st) return;
            addHostelVisitor({
              visitorName: visitorForm.visitorName,
              studentId: st.id,
              studentName: `${st.firstName} ${st.lastName}`,
              relation: visitorForm.relation,
              inTime: new Date().toISOString(),
              notes: visitorForm.notes || undefined,
            });
            setVisitorOpen(false);
            setMsg(`Visitor logged for ${st.firstName} ${st.lastName}.`);
          }}
        >
          <Input
            label="Visitor name"
            required
            value={visitorForm.visitorName}
            onChange={(e) =>
              setVisitorForm({ ...visitorForm, visitorName: e.target.value })
            }
          />
          <SelectField
            label="Boarder student"
            value={visitorForm.studentId}
            onChange={(v) => setVisitorForm({ ...visitorForm, studentId: v })}
          >
            {boarderStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </SelectField>
          {!boarderStudents.length ? (
            <p className="text-xs text-amber-700">No active boarders to visit.</p>
          ) : null}
          <Input
            label="Relation"
            value={visitorForm.relation}
            onChange={(e) =>
              setVisitorForm({ ...visitorForm, relation: e.target.value })
            }
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setVisitorOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!boarderStudents.length}>
              Log in
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
