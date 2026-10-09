import { describe, expect, it } from "vitest";
import {
  normalizePurchaseOrder,
  purchaseOrderLines,
  purchaseOrderSummary,
  purchaseOrderTotal,
} from "@/lib/school/purchase-orders";
import type { PurchaseOrder } from "@/types";

describe("purchase orders", () => {
  it("normalizes legacy single-line POs", () => {
    const po = normalizePurchaseOrder({
      id: "po1",
      poNo: "PO-1",
      vendor: "Vendor",
      itemName: "Paper",
      quantity: 10,
      unitCost: 100,
      total: 0,
      status: "ordered",
      date: "2026-10-01",
      campusId: "camp1",
    });
    expect(purchaseOrderLines(po)).toHaveLength(1);
    expect(purchaseOrderTotal(po)).toBe(1000);
    expect(purchaseOrderSummary(po)).toBe("Paper");
  });

  it("sums multi-line totals", () => {
    const po: PurchaseOrder = {
      id: "po2",
      poNo: "PO-2",
      vendor: "Vendor",
      itemName: "A",
      quantity: 1,
      unitCost: 1,
      total: 0,
      status: "ordered",
      date: "2026-10-01",
      campusId: "camp1",
      lines: [
        { id: "l1", itemName: "A", quantity: 2, unitCost: 50 },
        { id: "l2", itemName: "B", quantity: 3, unitCost: 10 },
      ],
    };
    expect(purchaseOrderTotal(po)).toBe(130);
    expect(purchaseOrderSummary(po)).toContain("2 lines");
  });
});
