import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 rounded-full bg-[var(--ims-muted)] p-3 text-[var(--ims-text-muted)]">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--ims-text)]">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-[var(--ims-text-muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
