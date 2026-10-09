"use client";

import { useEffect, useMemo, useState } from "react";
import { PortalShell, PARENT_NAV } from "@/components/layout/PortalShell";
import { useData } from "@/components/providers/DataProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { formatDate, labelize } from "@/lib/utils";

export default function ParentNoticesPage() {
  const { data } = useData();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ims.parent.notices.read");
      if (raw) setReadIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      // ignore
    }
  }, []);

  const notices = useMemo(
    () =>
      data.notices.filter(
        (n) =>
          n.status === "sent" &&
          (n.audience === "parents" || n.audience === "all"),
      ),
    [data.notices],
  );

  const visible = unreadOnly ? notices.filter((n) => !readIds.has(n.id)) : notices;

  function markRead(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        window.localStorage.setItem("ims.parent.notices.read", JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <PortalShell title="Parent Portal" subtitle="Your child's progress" nav={PARENT_NAV} accent="accent">
      <PageHeader
        title="Notices"
        subtitle="School announcements for parents"
        actions={
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
            Unread only
          </label>
        }
      />
      <div className="space-y-3">
        {visible.map((n) => {
          const unread = !readIds.has(n.id);
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => markRead(n.id)}
              className="block w-full text-left"
            >
              <Card className={`p-4 ${unread ? "border-[var(--ims-primary)]" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {unread ? <span className="mr-2 text-[var(--ims-primary)]">●</span> : null}
                      {n.title}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ims-text-muted)]">{n.body}</p>
                  </div>
                  <p className="text-xs text-[var(--ims-text-muted)]">
                    {labelize(n.channel)} · {formatDate(n.sentOn ?? n.createdOn)}
                  </p>
                </div>
              </Card>
            </button>
          );
        })}
        {!visible.length ? (
          <Card className="p-10 text-center text-sm text-[var(--ims-text-muted)]">
            No notices
          </Card>
        ) : null}
      </div>
    </PortalShell>
  );
}
