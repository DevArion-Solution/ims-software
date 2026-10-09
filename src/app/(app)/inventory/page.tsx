"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2, Minus } from "lucide-react";
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
import {
  purchaseOrderLines,
  purchaseOrderSummary,
  purchaseOrderTotal,
} from "@/lib/school/purchase-orders";

type PoLineForm = {
  key: string;
  itemName: string;
  quantity: string;
  unitCost: string;
  inventoryItemId: string;
};

export default function InventoryPage() {
  const {
    data,
    addInventoryItem,
    updateInventoryItem,
    adjustStock,
    deleteInventoryItem,
    addPurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder,
    deletePurchaseOrder,
  } = useData();
  const [open, setOpen] = useState(false);
  const [txnOpen, setTxnOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");
  const [txnMode, setTxnMode] = useState<"purchase" | "issue">("purchase");
  const [poVendor, setPoVendor] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poLines, setPoLines] = useState<PoLineForm[]>([
    {
      key: "1",
      itemName: "",
      quantity: "10",
      unitCost: "100",
      inventoryItemId: "",
    },
  ]);
  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "Stationery",
    quantity: "0",
    unit: "pcs",
    minStock: "10",
    location: "Store Room 1",
    unitCost: "0",
    preferredVendor: "",
  });
  const [txnForm, setTxnForm] = useState({
    itemId: data.inventory[0]?.id ?? "",
    qty: "1",
    note: "",
  });

  const stockValue = useMemo(
    () =>
      data.inventory.reduce(
        (sum, item) => sum + item.quantity * (item.unitCost ?? 0),
        0,
      ),
    [data.inventory],
  );
  const lowCount = data.inventory.filter((i) => i.status !== "in_stock").length;
  const vendors = useMemo(() => {
    const set = new Set<string>();
    for (const po of data.purchaseOrders) if (po.vendor) set.add(po.vendor);
    for (const item of data.inventory) {
      if (item.preferredVendor) set.add(item.preferredVendor);
    }
    return [...set].sort();
  }, [data.inventory, data.purchaseOrders]);

  const visibleItems = useMemo(() => {
    if (stockFilter === "low") {
      return data.inventory.filter((i) => i.status !== "in_stock");
    }
    return data.inventory;
  }, [data.inventory, stockFilter]);

  const poPreviewTotal = useMemo(
    () =>
      poLines.reduce(
        (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0),
        0,
      ),
    [poLines],
  );

  function openPo() {
    setPoVendor(vendors[0] ?? "");
    setPoNotes("");
    setPoLines([
      {
        key: String(Date.now()),
        itemName: "",
        quantity: "10",
        unitCost: "100",
        inventoryItemId: "",
      },
    ]);
    setPoOpen(true);
  }

  function linkLineToItem(key: string, inventoryItemId: string) {
    const item = data.inventory.find((i) => i.id === inventoryItemId);
    setPoLines((prev) =>
      prev.map((l) =>
        l.key === key
          ? {
              ...l,
              inventoryItemId,
              itemName: item?.name ?? l.itemName,
              unitCost:
                item?.unitCost !== undefined ? String(item.unitCost) : l.unitCost,
            }
          : l,
      ),
    );
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Multi-line POs · vendors · low-stock alerts · purchase/issue"
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={openPo}>
              New PO
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setTxnMode("purchase");
                setTxnForm({
                  itemId: data.inventory[0]?.id ?? "",
                  qty: "1",
                  note: "Purchase",
                });
                setTxnOpen(true);
              }}
            >
              Purchase
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setTxnMode("issue");
                setTxnForm({
                  itemId: data.inventory[0]?.id ?? "",
                  qty: "1",
                  note: "Issue",
                });
                setTxnOpen(true);
              }}
            >
              Issue
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Add item
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
        <StatCard label="SKUs" value={String(data.inventory.length)} />
        <StatCard
          label="Stock value"
          value={formatCurrency(stockValue)}
          tone="success"
        />
        <StatCard label="Low / out" value={String(lowCount)} tone="warning" />
      </div>

      <div className="mb-3 flex gap-2">
        <Button
          size="sm"
          variant={stockFilter === "all" ? "primary" : "secondary"}
          onClick={() => setStockFilter("all")}
        >
          All stock
        </Button>
        <Button
          size="sm"
          variant={stockFilter === "low" ? "primary" : "secondary"}
          onClick={() => setStockFilter("low")}
        >
          Low / out only
        </Button>
      </div>

      <Card>
        <Table
          headers={[
            "SKU",
            "Item",
            "Vendor",
            "Qty",
            "Unit cost",
            "Value",
            "Min",
            "Status",
            "Actions",
          ]}
        >
          {visibleItems.map((item) => (
            <tr key={item.id} className="hover:bg-[var(--ims-muted)]/40">
              <Td className="font-medium text-[var(--ims-primary)]">{item.sku}</Td>
              <Td>
                <div>
                  <p>{item.name}</p>
                  <p className="text-xs text-[var(--ims-text-muted)]">
                    {item.category} · {item.location}
                  </p>
                </div>
              </Td>
              <Td className="text-xs">{item.preferredVendor ?? "—"}</Td>
              <Td>
                {item.quantity} {item.unit}
              </Td>
              <Td>{formatCurrency(item.unitCost ?? 0)}</Td>
              <Td>{formatCurrency(item.quantity * (item.unitCost ?? 0))}</Td>
              <Td>
                <input
                  type="number"
                  min={0}
                  className="h-8 w-16 rounded border border-[var(--ims-border)] px-2 text-xs"
                  defaultValue={item.minStock}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v !== item.minStock) {
                      updateInventoryItem(item.id, { minStock: Math.max(0, v) });
                    }
                  }}
                />
              </Td>
              <Td>
                <Badge
                  status={
                    item.status === "in_stock"
                      ? "paid"
                      : item.status === "low"
                        ? "pending"
                        : "overdue"
                  }
                >
                  {labelize(item.status)}
                </Badge>
              </Td>
              <Td>
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="px-2"
                    onClick={() => {
                      const ok = adjustStock(item.id, -1, "Quick issue");
                      if (!ok) setMsg(`Cannot issue — ${item.name} is out of stock.`);
                    }}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="px-2"
                    onClick={() => adjustStock(item.id, 1, "Quick purchase")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 text-rose-600"
                    onClick={() => {
                      if (confirm("Delete item?")) deleteInventoryItem(item.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
        {!visibleItems.length ? (
          <p className="p-4 text-sm text-[var(--ims-text-muted)]">No items in this filter.</p>
        ) : null}
      </Card>

      {data.inventoryTxns.length > 0 ? (
        <Card className="mt-6">
          <Table headers={["Date", "Item", "Delta", "Note"]}>
            {data.inventoryTxns.slice(0, 25).map((txn) => {
              const item = data.inventory.find((i) => i.id === txn.itemId);
              return (
                <tr key={txn.id}>
                  <Td>{formatDate(txn.date)}</Td>
                  <Td>{item?.name ?? txn.itemId}</Td>
                  <Td className={txn.delta >= 0 ? "text-emerald-700" : "text-rose-700"}>
                    {txn.delta >= 0 ? `+${txn.delta}` : txn.delta}
                  </Td>
                  <Td>{txn.note}</Td>
                </tr>
              );
            })}
          </Table>
        </Card>
      ) : null}

      <Card className="mt-6">
        <p className="border-b border-[var(--ims-border)] px-4 py-3 text-sm font-medium">
          Purchase orders
        </p>
        <Table headers={["PO", "Vendor", "Items", "Total", "Status", ""]}>
          {data.purchaseOrders.map((po) => (
            <tr key={po.id}>
              <Td className="font-medium">{po.poNo}</Td>
              <Td>{po.vendor}</Td>
              <Td className="text-xs">
                <div>{purchaseOrderSummary(po)}</div>
                <div className="text-[var(--ims-text-muted)]">
                  {purchaseOrderLines(po)
                    .map((l) => `${l.quantity}× ${formatCurrency(l.unitCost)}`)
                    .join(" · ")}
                </div>
              </Td>
              <Td>{formatCurrency(purchaseOrderTotal(po))}</Td>
              <Td>
                <Badge
                  status={
                    po.status === "received"
                      ? "paid"
                      : po.status === "cancelled"
                        ? "overdue"
                        : "pending"
                  }
                >
                  {labelize(po.status)}
                </Badge>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {po.status === "ordered" || po.status === "draft" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          const ok = receivePurchaseOrder(po.id);
                          setMsg(
                            ok
                              ? `Received ${po.poNo} — stock updated for ${purchaseOrderLines(po).length} line(s).`
                              : "Could not receive PO.",
                          );
                        }}
                      >
                        Receive
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          cancelPurchaseOrder(po.id);
                          setMsg(`Cancelled ${po.poNo}.`);
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : null}
                  {po.status !== "received" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600"
                      onClick={() => deletePurchaseOrder(po.id)}
                    >
                      Del
                    </Button>
                  ) : null}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add inventory item">
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            addInventoryItem({
              sku: form.sku,
              name: form.name,
              category: form.category,
              quantity: Number(form.quantity),
              unit: form.unit,
              minStock: Number(form.minStock),
              location: form.location,
              unitCost: Number(form.unitCost) || 0,
              preferredVendor: form.preferredVendor || undefined,
            });
            setOpen(false);
          }}
        >
          <Input
            label="SKU"
            required
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <Input
            label="Preferred vendor"
            value={form.preferredVendor}
            onChange={(e) => setForm({ ...form, preferredVendor: e.target.value })}
            list="vendor-list"
          />
          <Input
            label="Quantity"
            type="number"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
          <Input
            label="Unit"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <Input
            label="Unit cost"
            type="number"
            value={form.unitCost}
            onChange={(e) => setForm({ ...form, unitCost: e.target.value })}
          />
          <Input
            label="Min stock"
            type="number"
            value={form.minStock}
            onChange={(e) => setForm({ ...form, minStock: e.target.value })}
          />
          <Input
            label="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={txnOpen}
        onClose={() => setTxnOpen(false)}
        title={txnMode === "purchase" ? "Purchase stock" : "Issue stock"}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const qty = Math.abs(Number(txnForm.qty) || 0);
            if (!qty || !txnForm.itemId) return;
            const ok = adjustStock(
              txnForm.itemId,
              txnMode === "purchase" ? qty : -qty,
              txnForm.note || (txnMode === "purchase" ? "Purchase" : "Issue"),
            );
            setTxnOpen(false);
            if (!ok) setMsg("Stock adjustment failed (insufficient quantity).");
          }}
        >
          <SelectField
            label="Item"
            value={txnForm.itemId}
            onChange={(v) => setTxnForm({ ...txnForm, itemId: v })}
          >
            {data.inventory.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.quantity} {i.unit})
              </option>
            ))}
          </SelectField>
          <Input
            label="Quantity"
            type="number"
            min={1}
            required
            value={txnForm.qty}
            onChange={(e) => setTxnForm({ ...txnForm, qty: e.target.value })}
          />
          <Input
            label="Note"
            value={txnForm.note}
            onChange={(e) => setTxnForm({ ...txnForm, note: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setTxnOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {txnMode === "purchase" ? "Add stock" : "Issue stock"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={poOpen} onClose={() => setPoOpen(false)} title="New purchase order" wide>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const lines = poLines
              .filter((l) => l.itemName.trim() && Number(l.quantity) > 0)
              .map((l) => ({
                itemName: l.itemName.trim(),
                quantity: Number(l.quantity) || 1,
                unitCost: Number(l.unitCost) || 0,
                inventoryItemId: l.inventoryItemId || undefined,
              }));
            if (!poVendor.trim() || !lines.length) {
              setMsg("Vendor and at least one line are required.");
              return;
            }
            addPurchaseOrder({
              vendor: poVendor.trim(),
              lines,
              status: "ordered",
              date: new Date().toISOString().slice(0, 10),
              campusId: data.institute.campuses[0]?.id ?? "camp1",
              notes: poNotes || undefined,
            });
            setPoOpen(false);
            setMsg(`PO created with ${lines.length} line(s).`);
          }}
        >
          <Input
            label="Vendor"
            required
            value={poVendor}
            onChange={(e) => setPoVendor(e.target.value)}
            list="vendor-list"
          />
          <datalist id="vendor-list">
            {vendors.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>

          <div className="space-y-2 rounded-md border border-[var(--ims-border)] p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Lines</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setPoLines((prev) => [
                    ...prev,
                    {
                      key: String(Date.now()),
                      itemName: "",
                      quantity: "1",
                      unitCost: "0",
                      inventoryItemId: "",
                    },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add line
              </Button>
            </div>
            {poLines.map((line, idx) => (
              <div
                key={line.key}
                className="grid gap-2 rounded border border-[var(--ims-border)]/70 p-2 sm:grid-cols-2"
              >
                <SelectField
                  label={`Link stock (line ${idx + 1})`}
                  value={line.inventoryItemId}
                  onChange={(v) => linkLineToItem(line.key, v)}
                >
                  <option value="">New item on receive</option>
                  {data.inventory.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </SelectField>
                <Input
                  label="Item name"
                  required
                  value={line.itemName}
                  onChange={(e) =>
                    setPoLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key ? { ...l, itemName: e.target.value } : l,
                      ),
                    )
                  }
                />
                <Input
                  label="Qty"
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    setPoLines((prev) =>
                      prev.map((l) =>
                        l.key === line.key ? { ...l, quantity: e.target.value } : l,
                      ),
                    )
                  }
                />
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="Unit cost"
                      type="number"
                      min={0}
                      value={line.unitCost}
                      onChange={(e) =>
                        setPoLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? { ...l, unitCost: e.target.value }
                              : l,
                          ),
                        )
                      }
                    />
                  </div>
                  {poLines.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-rose-600"
                      onClick={() =>
                        setPoLines((prev) => prev.filter((l) => l.key !== line.key))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            <p className="text-xs text-[var(--ims-text-muted)]">
              PO total preview:{" "}
              <span className="font-semibold text-[var(--ims-text)]">
                {formatCurrency(poPreviewTotal)}
              </span>
            </p>
          </div>

          <Input
            label="Notes"
            value={poNotes}
            onChange={(e) => setPoNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPoOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create PO</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
