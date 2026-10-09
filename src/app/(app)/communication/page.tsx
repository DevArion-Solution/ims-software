"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { Modal, SelectField, TextArea } from "@/components/ui/Modal";
import { AutoAlertsPanel } from "@/components/alerts/AutoAlertsPanel";
import { useData } from "@/components/providers/DataProvider";
import { formatDate, labelize } from "@/lib/utils";
import {
  previewNoticeAudienceLabel,
  resolveNoticeRecipients,
} from "@/lib/school/notice-recipients";
import type { Notice, NoticeFeeFilter } from "@/types";

const TEMPLATES: Array<{
  label: string;
  title: string;
  body: string;
  audience: Notice["audience"];
  channel: Notice["channel"];
  feeFilter?: NoticeFeeFilter;
}> = [
  {
    label: "Fee reminder",
    title: "Fee Challan Reminder",
    body: "Please clear pending fee challans before the 10th to avoid late fee charges.",
    audience: "parents",
    channel: "whatsapp",
    feeFilter: "pending",
  },
  {
    label: "Overdue fees",
    title: "Overdue Fee Notice",
    body: "Your ward has overdue fee challans. Please clear dues at the accounts desk or via the Parent Portal.",
    audience: "parents",
    channel: "sms",
    feeFilter: "overdue",
  },
  {
    label: "PTM",
    title: "Parent-Teacher Meeting",
    body: "PTM is scheduled this Saturday at 9am in the main auditorium. Your presence is requested.",
    audience: "parents",
    channel: "sms",
  },
  {
    label: "Holiday",
    title: "Holiday Notice",
    body: "The institute will remain closed on the announced public holiday. Classes resume the next working day.",
    audience: "all",
    channel: "notice_board",
  },
  {
    label: "Exam schedule",
    title: "Examination Schedule",
    body: "Term examinations begin next week. Please collect the detailed date sheet from the class teacher.",
    audience: "students",
    channel: "notice_board",
  },
  {
    label: "Staff meeting",
    title: "Staff Meeting",
    body: "All teaching staff are requested to attend a coordination meeting tomorrow at 2pm in the conference room.",
    audience: "staff",
    channel: "email",
  },
];

type NoticeForm = {
  title: string;
  body: string;
  audience: Notice["audience"];
  channel: Notice["channel"];
  className: string;
  section: string;
  feeFilter: NoticeFeeFilter;
};

const emptyForm = (): NoticeForm => ({
  title: "",
  body: "",
  audience: "all",
  channel: "notice_board",
  className: "",
  section: "",
  feeFilter: "all",
});

export default function CommunicationPage() {
  const { data, addNotice, sendNotice, deleteNotice } = useData();
  const [tab, setTab] = useState<"notices" | "alerts">("notices");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [form, setForm] = useState<NoticeForm>(emptyForm);

  const classOptions = useMemo(() => {
    const set = new Set(data.classes.map((c) => c.name));
    return [...set].sort();
  }, [data.classes]);

  const previewCount = useMemo(
    () =>
      resolveNoticeRecipients(data, {
        audience: form.audience,
        channel: form.channel,
        className: form.className || undefined,
        section: form.section || undefined,
        feeFilter: form.feeFilter,
      }).length,
    [data, form],
  );

  function applyTemplate(tpl: (typeof TEMPLATES)[number]) {
    setForm({
      title: tpl.title,
      body: tpl.body,
      audience: tpl.audience,
      channel: tpl.channel,
      className: "",
      section: "",
      feeFilter: tpl.feeFilter ?? "all",
    });
    setOpen(true);
  }

  async function handleSend(n: Notice) {
    if (sendingId) return;
    setSendingId(n.id);
    try {
      const recipients = resolveNoticeRecipients(data, n);
      if (!recipients.length) {
        setMsg("No recipients match this audience / filters.");
        return;
      }

      if (n.channel === "notice_board") {
        const nSent = sendNotice(n.id);
        setMsg(`Posted to notice board · ${nSent} log(s).`);
        return;
      }

      const cleaned = recipients
        .filter((r) => r.contact && r.contact !== "campus")
        .map((r) => ({ to: r.contact, name: r.name }));

      let gatewayResults:
        | Array<{
            to: string;
            ok: boolean;
            sandbox?: boolean;
            detail?: string;
            error?: string;
          }>
        | undefined;

      if (cleaned.length) {
        try {
          const res = await fetch("/api/notify/send", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              channel: n.channel,
              body: `${n.title}\n\n${n.body}`,
              subject: n.title,
              recipients: cleaned.slice(0, 200),
            }),
          });
          const json = (await res.json()) as {
            sent?: number;
            failed?: number;
            results?: Array<{
              to: string;
              ok: boolean;
              sandbox?: boolean;
              detail?: string;
              error?: string;
            }>;
            error?: string;
          };
          if (!res.ok) {
            setMsg(`Gateway error: ${json.error ?? res.statusText}`);
            return;
          }
          gatewayResults = json.results;
          const nSent = sendNotice(n.id, { results: gatewayResults });
          const sandbox = json.results?.some((r) => r.sandbox);
          setMsg(
            `Sent — ${nSent} delivery log(s) · gateway ${json.sent ?? 0} ok / ${json.failed ?? 0} fail${sandbox ? " (sandbox)" : ""} · ${previewNoticeAudienceLabel(n)}`,
          );
          return;
        } catch {
          const nSent = sendNotice(n.id);
          setMsg(
            `Gateway unreachable — logged ${nSent} recipient(s) locally for ${n.channel}.`,
          );
          return;
        }
      }

      const nSent = sendNotice(n.id);
      setMsg(`No valid contacts — ${nSent} log(s).`);
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Communication"
        subtitle="Notices · auto absence & fee alerts (WhatsApp / SMS / Gmail)"
        actions={
          tab === "notices" ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Create notice
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={tab === "notices" ? "primary" : "secondary"}
          onClick={() => setTab("notices")}
        >
          Notices
        </Button>
        <Button
          size="sm"
          variant={tab === "alerts" ? "primary" : "secondary"}
          onClick={() => setTab("alerts")}
        >
          Auto alerts
        </Button>
      </div>

      {tab === "alerts" ? <AutoAlertsPanel /> : null}

      {tab === "notices" ? (
      <>
      {msg ? (
        <p className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {msg}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {TEMPLATES.map((tpl) => (
          <Button
            key={tpl.label}
            size="sm"
            variant="secondary"
            onClick={() => applyTemplate(tpl)}
          >
            {tpl.label}
          </Button>
        ))}
      </div>

      <Card>
        <Table
          headers={[
            "Title",
            "Audience",
            "Target",
            "Channel",
            "Created",
            "Deliveries",
            "Status",
            "Actions",
          ]}
        >
          {data.notices.map((n) => (
            <tr key={n.id} className="hover:bg-[var(--ims-muted)]/40">
              <Td>
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="line-clamp-1 text-xs text-[var(--ims-text-muted)]">
                    {n.body}
                  </p>
                </div>
              </Td>
              <Td className="capitalize">{n.audience}</Td>
              <Td className="text-xs">
                {n.className
                  ? `${n.className}${n.section ? `-${n.section}` : ""}`
                  : "All classes"}
                {n.feeFilter && n.feeFilter !== "all" ? (
                  <span className="ml-1 text-amber-700">· {n.feeFilter}</span>
                ) : null}
              </Td>
              <Td className="capitalize">{labelize(n.channel)}</Td>
              <Td>{formatDate(n.createdOn)}</Td>
              <Td>{n.deliveryCount ?? "—"}</Td>
              <Td>
                <Badge status={n.status === "sent" ? "paid" : "pending"}>
                  {labelize(n.status)}
                </Badge>
              </Td>
              <Td>
                <div className="flex gap-1">
                  {n.status !== "sent" ? (
                    <Button
                      size="sm"
                      disabled={sendingId === n.id}
                      onClick={() => void handleSend(n)}
                    >
                      <Send className="h-3.5 w-3.5" />{" "}
                      {sendingId === n.id ? "Sending…" : "Send"}
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 text-rose-600"
                    onClick={() => {
                      if (confirm("Delete notice?")) deleteNotice(n.id);
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

      <Card className="mt-6">
        <p className="border-b border-[var(--ims-border)] px-4 py-3 text-sm font-medium">
          Delivery log (gateway sandbox / live)
        </p>
        <Table headers={["When", "Channel", "Recipient", "Contact", "Status", "Detail"]}>
          {data.deliveries.slice(0, 50).map((d) => (
            <tr key={d.id}>
              <Td className="whitespace-nowrap text-xs">
                {d.at.slice(0, 19).replace("T", " ")}
              </Td>
              <Td>{labelize(d.channel)}</Td>
              <Td>{d.recipientName}</Td>
              <Td className="text-xs">{d.recipientContact}</Td>
              <Td>
                <Badge
                  status={
                    d.status === "sent" || d.status === "board_only"
                      ? "paid"
                      : d.status === "failed"
                        ? "overdue"
                        : "pending"
                  }
                >
                  {labelize(d.status)}
                </Badge>
              </Td>
              <Td className="text-xs text-[var(--ims-text-muted)]">
                {d.detail ?? "—"}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      </>
      ) : null}

      <Modal open={open} onClose={() => setOpen(false)} title="Create notice" wide>
        <form
          className="space-y-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            addNotice({
              title: form.title,
              body: form.body,
              audience: form.audience,
              channel: form.channel,
              className: form.className || undefined,
              section: form.section || undefined,
              feeFilter: form.feeFilter === "all" ? undefined : form.feeFilter,
            });
            setOpen(false);
            setForm(emptyForm());
          }}
        >
          <div className="flex flex-wrap gap-1">
            {TEMPLATES.map((tpl) => (
              <Button
                key={tpl.label}
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setForm({
                    title: tpl.title,
                    body: tpl.body,
                    audience: tpl.audience,
                    channel: tpl.channel,
                    className: "",
                    section: "",
                    feeFilter: tpl.feeFilter ?? "all",
                  })
                }
              >
                {tpl.label}
              </Button>
            ))}
          </div>
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextArea
            label="Message"
            required
            value={form.body}
            onChange={(v) => setForm({ ...form, body: v })}
            rows={4}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Audience"
              value={form.audience}
              onChange={(v) =>
                setForm({ ...form, audience: v as Notice["audience"] })
              }
            >
              <option value="all">Parents (all students)</option>
              <option value="parents">Parents</option>
              <option value="students">Students</option>
              <option value="staff">Staff</option>
            </SelectField>
            <SelectField
              label="Channel"
              value={form.channel}
              onChange={(v) =>
                setForm({ ...form, channel: v as Notice["channel"] })
              }
            >
              <option value="notice_board">Notice board</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </SelectField>
            <SelectField
              label="Class filter"
              value={form.className}
              onChange={(v) => setForm({ ...form, className: v, section: "" })}
            >
              <option value="">All classes</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Section"
              value={form.section}
              onChange={(v) => setForm({ ...form, section: v })}
            >
              <option value="">All sections</option>
              {data.classes
                .filter((c) => !form.className || c.name === form.className)
                .map((c) => c.section)
                .filter((s, i, arr) => arr.indexOf(s) === i)
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </SelectField>
            <SelectField
              label="Fee filter"
              value={form.feeFilter}
              onChange={(v) =>
                setForm({ ...form, feeFilter: v as NoticeFeeFilter })
              }
            >
              <option value="all">All (no fee filter)</option>
              <option value="pending">Pending / partial balance</option>
              <option value="overdue">Overdue only</option>
            </SelectField>
          </div>
          <p className="rounded-md border border-[var(--ims-border)] bg-[var(--ims-muted)]/40 px-3 py-2 text-xs text-[var(--ims-text-muted)]">
            Preview:{" "}
            <span className="font-semibold text-[var(--ims-text)]">
              {previewCount}
            </span>{" "}
            recipient(s) · {previewNoticeAudienceLabel(form)}
            {form.channel !== "notice_board"
              ? " · Send will call /api/notify (sandbox until keys configured)"
              : ""}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save draft</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
