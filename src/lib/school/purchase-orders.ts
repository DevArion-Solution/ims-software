import { roundMoney } from "@/lib/calc";
import type { PurchaseOrder, PurchaseOrderLine } from "@/types";

export function purchaseOrderLines(po: PurchaseOrder): PurchaseOrderLine[] {
  if (po.lines?.length) return po.lines;
  return [
    {
      id: `${po.id}-legacy`,
      itemName: po.itemName || "Item",
      quantity: po.quantity || 0,
      unitCost: po.unitCost || 0,
      inventoryItemId: po.inventoryItemId,
    },
  ];
}

export function purchaseOrderTotal(po: PurchaseOrder): number {
  return roundMoney(
    purchaseOrderLines(po).reduce(
      (sum, line) => sum + line.quantity * line.unitCost,
      0,
    ),
  );
}

export function purchaseOrderSummary(po: PurchaseOrder): string {
  const lines = purchaseOrderLines(po);
  if (lines.length === 1) return lines[0]?.itemName ?? po.itemName;
  return `${lines.length} lines · ${lines.map((l) => l.itemName).join(", ")}`;
}

export function normalizePurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  const lines = purchaseOrderLines(po).map((l, idx) => ({
    ...l,
    id: l.id || `${po.id}-l${idx + 1}`,
    quantity: Math.max(0, Number(l.quantity) || 0),
    unitCost: Math.max(0, Number(l.unitCost) || 0),
  }));
  const first = lines[0];
  return {
    ...po,
    lines,
    itemName: first?.itemName ?? po.itemName,
    quantity: first?.quantity ?? po.quantity,
    unitCost: first?.unitCost ?? po.unitCost,
    inventoryItemId: first?.inventoryItemId ?? po.inventoryItemId,
    total: purchaseOrderTotal({ ...po, lines }),
  };
}
