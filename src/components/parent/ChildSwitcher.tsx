"use client";

import { useParentChild } from "@/components/providers/ParentChildProvider";

export function ChildSwitcher() {
  const { children, childId, setChildId } = useParentChild();
  if (children.length <= 1) return null;
  return (
    <select
      aria-label="Select child"
      value={childId ?? ""}
      onChange={(e) => setChildId(e.target.value)}
      className="h-9 rounded-md border border-[var(--ims-border)] bg-white px-2 text-sm"
    >
      {children.map((c) => (
        <option key={c.id} value={c.id}>
          {c.firstName} {c.lastName} ({c.className}-{c.section})
        </option>
      ))}
    </select>
  );
}
