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
import { formatCurrency, labelize } from "@/lib/utils";
import type { TransportRoute } from "@/types";

type Tab = "routes" | "assignments";

type RouteForm = {
  name: string;
  vehicleNo: string;
  driver: string;
  driverPhone: string;
  stops: string;
  fee: string;
  status: TransportRoute["status"];
};

const emptyRouteForm = (): RouteForm => ({
  name: "",
  vehicleNo: "",
  driver: "",
  driverPhone: "",
  stops: "",
  fee: "4000",
  status: "active",
});

export default function TransportPage() {
  const {
    data,
    addRoute,
    updateRoute,
    deleteRoute,
    addRouteAssignment,
    removeRouteAssignment,
    generateTransportFee,
  } = useData();
  const [tab, setTab] = useState<Tab>("routes");
  const [feeMsg, setFeeMsg] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TransportRoute | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);
  const [routeFilter, setRouteFilter] = useState("");
  const [form, setForm] = useState<RouteForm>(emptyRouteForm);
  const [assignForm, setAssignForm] = useState({
    routeId: data.routes.find((r) => r.status === "active")?.id ?? "",
    studentId: "",
  });
  const [feeForm, setFeeForm] = useState({
    month: new Date().toLocaleString("en-PK", {
      month: "long",
      year: "numeric",
    }),
    dueDate: (() => {
      const d = new Date();
      d.setDate(10);
      return d.toISOString().slice(0, 10);
    })(),
    routeId: "",
  });

  const assignedStudentIds = useMemo(
    () => new Set(data.routeAssignments.map((a) => a.studentId)),
    [data.routeAssignments],
  );

  const availableStudents = useMemo(
    () =>
      data.students.filter(
        (s) => s.status === "active" && !assignedStudentIds.has(s.id),
      ),
    [data.students, assignedStudentIds],
  );

  const activeRoutes = useMemo(
    () => data.routes.filter((r) => r.status === "active"),
    [data.routes],
  );

  const filteredAssignments = useMemo(() => {
    if (!routeFilter) return data.routeAssignments;
    return data.routeAssignments.filter((a) => a.routeId === routeFilter);
  }, [data.routeAssignments, routeFilter]);

  const routeName = (routeId: string) =>
    data.routes.find((r) => r.id === routeId)?.name ?? routeId;

  const studentMeta = (studentId: string) => {
    const s = data.students.find((x) => x.id === studentId);
    if (!s) return "";
    return `${s.className}-${s.section}`;
  };

  function openCreate() {
    setEditing(null);
    setForm(emptyRouteForm());
    setOpen(true);
  }

  function openEdit(route: TransportRoute) {
    setEditing(route);
    setForm({
      name: route.name,
      vehicleNo: route.vehicleNo,
      driver: route.driver,
      driverPhone: route.driverPhone,
      stops: route.stops.join(", "),
      fee: String(route.fee),
      status: route.status,
    });
    setOpen(true);
  }

  function openAssign() {
    setAssignForm({
      routeId: activeRoutes[0]?.id ?? "",
      studentId: availableStudents[0]?.id ?? "",
    });
    setAssignOpen(true);
  }

  function previewFeeCount() {
    let n = 0;
    for (const a of data.routeAssignments) {
      if (feeForm.routeId && a.routeId !== feeForm.routeId) continue;
      const route = data.routes.find((r) => r.id === a.routeId);
      const student = data.students.find((s) => s.id === a.studentId);
      if (!route || route.status !== "active" || route.fee <= 0) continue;
      if (!student || student.status !== "active") continue;
      const exists = data.fees.some(
        (f) =>
          f.studentId === student.id &&
          f.month === feeForm.month &&
          f.feeHead === "Transport",
      );
      if (!exists) n += 1;
    }
    return n;
  }

  return (
    <div>
      <PageHeader
        title="Transport"
        subtitle="Edit routes · assign riders · monthly challans (active routes only)"
        actions={
          tab === "routes" ? (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setFeeOpen(true)}>
                Generate month fees
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add route
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={openAssign}
              disabled={!activeRoutes.length || !availableStudents.length}
            >
              <Plus className="h-4 w-4" /> Assign student
            </Button>
          )
        }
      />

      {feeMsg ? (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feeMsg}
        </p>
      ) : null}

      <div className="mb-4 flex gap-2">
        <Button
          size="sm"
          variant={tab === "routes" ? "primary" : "secondary"}
          onClick={() => setTab("routes")}
        >
          Routes
        </Button>
        <Button
          size="sm"
          variant={tab === "assignments" ? "primary" : "secondary"}
          onClick={() => setTab("assignments")}
        >
          Assign students
        </Button>
      </div>

      {tab === "routes" ? (
        <Card>
          <Table
            headers={[
              "Route",
              "Vehicle",
              "Driver",
              "Stops",
              "Students",
              "Fee",
              "Status",
              "Actions",
            ]}
          >
            {data.routes.map((r) => (
              <tr key={r.id} className="hover:bg-[var(--ims-muted)]/40">
                <Td className="font-medium">{r.name}</Td>
                <Td>{r.vehicleNo}</Td>
                <Td>
                  <div>
                    <p>{r.driver}</p>
                    <p className="text-xs text-[var(--ims-text-muted)]">
                      {r.driverPhone}
                    </p>
                  </div>
                </Td>
                <Td className="text-xs">{r.stops.join(" → ")}</Td>
                <Td className="font-semibold">{r.studentsCount}</Td>
                <Td>{formatCurrency(r.fee)}</Td>
                <Td>
                  <Badge status={r.status === "active" ? "active" : "inactive"}>
                    {labelize(r.status)}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 text-rose-600"
                      onClick={() => {
                        if (confirm("Delete route and its assignments?")) {
                          deleteRoute(r.id);
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
          <div className="mb-3 max-w-xs">
            <SelectField
              label="Filter by route"
              value={routeFilter}
              onChange={setRouteFilter}
            >
              <option value="">All routes</option>
              {data.routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.studentsCount})
                </option>
              ))}
            </SelectField>
          </div>
          <Card>
            <Table headers={["Student", "Class", "Route", "Actions"]}>
              {filteredAssignments.map((a) => (
                <tr key={a.id} className="hover:bg-[var(--ims-muted)]/40">
                  <Td className="font-medium">{a.studentName}</Td>
                  <Td className="text-xs">{studentMeta(a.studentId) || "—"}</Td>
                  <Td>{routeName(a.routeId)}</Td>
                  <Td>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => removeRouteAssignment(a.id)}
                    >
                      Remove
                    </Button>
                  </Td>
                </tr>
              ))}
            </Table>
            {!filteredAssignments.length ? (
              <p className="p-4 text-sm text-[var(--ims-text-muted)]">
                No students assigned{routeFilter ? " on this route" : " yet"}.
              </p>
            ) : null}
          </Card>
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit transport route" : "Add transport route"}
      >
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            const payload = {
              name: form.name,
              vehicleNo: form.vehicleNo,
              driver: form.driver,
              driverPhone: form.driverPhone,
              stops: form.stops
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              fee: Number(form.fee),
              status: form.status,
            };
            if (editing) {
              updateRoute(editing.id, payload);
            } else {
              addRoute({
                ...payload,
                studentsCount: 0,
              });
            }
            setOpen(false);
            setEditing(null);
            setForm(emptyRouteForm());
          }}
        >
          <Input
            label="Route name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Vehicle no."
            required
            value={form.vehicleNo}
            onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })}
          />
          <Input
            label="Driver"
            required
            value={form.driver}
            onChange={(e) => setForm({ ...form, driver: e.target.value })}
          />
          <Input
            label="Driver phone"
            required
            value={form.driverPhone}
            onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
          />
          <Input
            label="Stops (comma separated)"
            required
            value={form.stops}
            onChange={(e) => setForm({ ...form, stops: e.target.value })}
          />
          <Input
            label="Monthly fee"
            type="number"
            min={0}
            value={form.fee}
            onChange={(e) => setForm({ ...form, fee: e.target.value })}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(v) =>
              setForm({ ...form, status: v as TransportRoute["status"] })
            }
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
          <p className="text-xs text-[var(--ims-text-muted)]">
            Inactive routes keep riders but are skipped by fee generation and new
            assignments.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save changes" : "Save"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign student to route">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!assignForm.routeId || !assignForm.studentId) return;
            addRouteAssignment(assignForm.routeId, assignForm.studentId);
            setAssignOpen(false);
            setTab("assignments");
          }}
        >
          <SelectField
            label="Route (active only)"
            value={assignForm.routeId}
            onChange={(v) => setAssignForm({ ...assignForm, routeId: v })}
            required
          >
            {activeRoutes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {formatCurrency(r.fee)} · {r.studentsCount} riders
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Student"
            value={assignForm.studentId}
            onChange={(v) => setAssignForm({ ...assignForm, studentId: v })}
            required
          >
            {availableStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName} — {s.className}-{s.section}
              </option>
            ))}
          </SelectField>
          {!availableStudents.length ? (
            <p className="text-xs text-amber-700">
              All active students are already assigned to a route.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAssignOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!availableStudents.length || !activeRoutes.length}>
              Assign
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={feeOpen} onClose={() => setFeeOpen(false)} title="Generate transport fees">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            const n = generateTransportFee(feeForm.month, feeForm.dueDate, {
              routeId: feeForm.routeId || undefined,
            });
            setFeeOpen(false);
            setFeeMsg(
              n
                ? `Created ${n} transport fee challan(s) for ${feeForm.month}${
                    feeForm.routeId
                      ? ` · ${routeName(feeForm.routeId)}`
                      : ""
                  }.`
                : "No new challans — already generated, inactive route, or no assignments.",
            );
          }}
        >
          <Input
            label="Fee month label"
            required
            value={feeForm.month}
            onChange={(e) => setFeeForm({ ...feeForm, month: e.target.value })}
          />
          <Input
            label="Due date"
            type="date"
            required
            value={feeForm.dueDate}
            onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })}
          />
          <SelectField
            label="Route scope"
            value={feeForm.routeId}
            onChange={(v) => setFeeForm({ ...feeForm, routeId: v })}
          >
            <option value="">All active routes</option>
            {activeRoutes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.studentsCount} riders · {formatCurrency(r.fee)})
              </option>
            ))}
          </SelectField>
          <p className="rounded-md border border-[var(--ims-border)] bg-[var(--ims-muted)]/40 px-3 py-2 text-xs text-[var(--ims-text-muted)]">
            Preview:{" "}
            <span className="font-semibold text-[var(--ims-text)]">
              {previewFeeCount()}
            </span>{" "}
            new challan(s). Existing Transport challans for this month are skipped.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFeeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Generate</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
