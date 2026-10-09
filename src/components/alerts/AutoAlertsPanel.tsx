"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Mail, MessageCircle } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function AutoAlertsPanel() {
  const { session } = useAuth();
  const { data, updateAlertSettings } = useData();
  const s = data.alertSettings;
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [daysText, setDaysText] = useState(s.feeReminderDaysOfMonth.join(", "));
  const [gmailUser, setGmailUser] = useState(s.gmailUser ?? "");
  const [gmailPass, setGmailPass] = useState(s.gmailAppPassword ?? "");
  const [gmailFrom, setGmailFrom] = useState(
    s.gmailFromName ?? data.institute.name ?? "",
  );
  const [testTo, setTestTo] = useState(s.gmailUser ?? "");
  const [gmailMsg, setGmailMsg] = useState("");
  const [gmailBusy, setGmailBusy] = useState(false);

  useEffect(() => {
    setGmailUser(s.gmailUser ?? "");
    setGmailPass(s.gmailAppPassword ?? "");
    setGmailFrom(s.gmailFromName ?? data.institute.name ?? "");
    if (!testTo) setTestTo(s.gmailUser ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.gmailUser, s.gmailAppPassword, s.gmailFromName, data.institute.name]);

  // Auto schedule: once per browser day when admin/accountant opens app
  useEffect(() => {
    const portal = session?.portal;
    if (portal !== "admin" && portal !== "accountant") return;
    if (!s.feeReminderEnabled) return;
    const today = new Date().toISOString().slice(0, 10);
    const day = new Date().getUTCDate();
    if (!s.feeReminderDaysOfMonth.includes(day)) return;
    if (s.lastFeeReminderAt === today) return;
    const key = `ims.feeReminder.auto.${today}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;
    sessionStorage?.setItem(key, "1");
    void fetch("/api/notify/fee-reminders", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then((j: { message?: string; skipped?: boolean }) => {
        if (!j.skipped && j.message) setMsg(`Auto: ${j.message}`);
        updateAlertSettings({ lastFeeReminderAt: today });
      })
      .catch(() => {
        /* ignore */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for schedule
  }, [session?.portal]);

  async function runFeeReminders(force: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/notify/fee-reminders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) setMsg(json.error ?? "Failed");
      else {
        setMsg(json.message ?? "Done");
        if (force || !json.message?.includes("Already")) {
          updateAlertSettings({
            lastFeeReminderAt: new Date().toISOString().slice(0, 10),
          });
        }
      }
    } catch {
      setMsg("Network error");
    }
    setBusy(false);
  }

  function toggleChannel(
    key: "absenceChannels" | "feeReminderChannels",
    channel: "whatsapp" | "sms" | "email",
  ) {
    const cur = s[key];
    const next = cur.includes(channel)
      ? cur.filter((c) => c !== channel)
      : [...cur, channel];
    updateAlertSettings({ [key]: next.length ? next : cur });
  }

  function saveGmailLocal() {
    updateAlertSettings({
      gmailUser: gmailUser.trim(),
      gmailAppPassword: gmailPass.replace(/\s/g, ""),
      gmailFromName: gmailFrom.trim() || undefined,
    });
    setGmailMsg("Gmail saved for this school. Use Test send to verify.");
  }

  async function testAndSaveGmail() {
    setGmailBusy(true);
    setGmailMsg("");
    try {
      const res = await fetch("/api/notify/test-email", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gmailUser: gmailUser.trim(),
          gmailAppPassword: gmailPass,
          gmailFromName: gmailFrom.trim() || undefined,
          to: (testTo || gmailUser).trim(),
          save: true,
        }),
      });
      const json = (await res.json()) as {
        message?: string;
        error?: string;
        ok?: boolean;
        gmailVerifiedAt?: string;
      };
      if (!res.ok) {
        setGmailMsg(json.error ?? "Failed");
      } else {
        updateAlertSettings({
          gmailUser: gmailUser.trim(),
          gmailAppPassword: gmailPass.replace(/\s/g, ""),
          gmailFromName: gmailFrom.trim() || undefined,
          gmailVerifiedAt: json.ok ? new Date().toISOString() : s.gmailVerifiedAt,
        });
        setGmailMsg(json.message ?? "Done");
      }
    } catch {
      setGmailMsg("Network error");
    }
    setGmailBusy(false);
  }

  const gmailReady = Boolean(
    s.gmailUser?.includes("@") && (s.gmailAppPassword?.replace(/\s/g, "").length ?? 0) >= 8,
  );

  return (
    <Card className="space-y-5 p-5">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="h-4 w-4" />
          Auto alerts (WhatsApp / SMS / Gmail)
        </h2>
        <p className="mt-1 text-xs text-[var(--ims-text-muted)]">
          School Gmail se parents ko absence + fee alerts jate hain. App Password use karein
          (normal password nahi). WhatsApp abhi skip — baad mein enable hoga.
        </p>
      </div>

      {msg ? <p className="text-sm text-emerald-700 break-words">{msg}</p> : null}

      <section className="space-y-3 rounded-xl border border-[var(--ims-border)] bg-[var(--ims-muted)]/30 p-4">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Mail className="h-4 w-4" />
          School Gmail (easy setup)
          {gmailReady ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
              Not set
            </span>
          )}
        </h3>
        <ol className="list-decimal space-y-1 pl-4 text-xs text-[var(--ims-text-muted)]">
          <li>Google Account → Security → 2-Step Verification ON</li>
          <li>App passwords → Mail → copy 16-character password</li>
          <li>Neeche Gmail + App Password paste karein → Test send</li>
        </ol>
        <Input
          label="School Gmail"
          type="email"
          placeholder="school@gmail.com"
          value={gmailUser}
          onChange={(e) => setGmailUser(e.target.value)}
          autoComplete="off"
        />
        <Input
          label="App Password (16 characters)"
          type="password"
          placeholder="xxxx xxxx xxxx xxxx"
          value={gmailPass}
          onChange={(e) => setGmailPass(e.target.value)}
          autoComplete="new-password"
        />
        <Input
          label="From name (optional)"
          placeholder={data.institute.name || "School name"}
          value={gmailFrom}
          onChange={(e) => setGmailFrom(e.target.value)}
        />
        <Input
          label="Send test to"
          type="email"
          placeholder="your@email.com"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
        />
        {s.gmailVerifiedAt ? (
          <p className="text-xs text-emerald-700">
            Last verified: {new Date(s.gmailVerifiedAt).toLocaleString()}
          </p>
        ) : null}
        {gmailMsg ? (
          <p
            className={`text-sm break-words ${
              gmailMsg.toLowerCase().includes("fail") ||
              gmailMsg.toLowerCase().includes("error") ||
              gmailMsg.toLowerCase().includes("enter")
                ? "text-rose-700"
                : "text-emerald-700"
            }`}
          >
            {gmailMsg}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={gmailBusy} onClick={() => void testAndSaveGmail()}>
            Save &amp; test send
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={gmailBusy}
            onClick={saveGmailLocal}
          >
            Save only
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--ims-border)] p-4">
        <h3 className="text-sm font-medium">Absence → parent (same day)</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.absenceAutoNotify}
            onChange={(e) => updateAlertSettings({ absenceAutoNotify: e.target.checked })}
          />
          Auto-notify when marked absent
        </label>
        <div className="flex flex-wrap gap-3 text-sm">
          {(["sms", "email"] as const).map((ch) => (
            <label key={ch} className="flex items-center gap-1.5 capitalize">
              <input
                type="checkbox"
                checked={s.absenceChannels.includes(ch)}
                onChange={() => toggleChannel("absenceChannels", ch)}
              />
              {ch === "email" ? (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> Gmail / email
                </span>
              ) : (
                "SMS"
              )}
            </label>
          ))}
          <span className="inline-flex items-center gap-1 text-xs text-[var(--ims-text-muted)]">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp — later
          </span>
        </div>
        <label className="block text-sm">
          Language
          <select
            className="mt-1 w-full rounded-md border border-[var(--ims-border)] px-3 py-2"
            value={s.absenceLocale}
            onChange={(e) =>
              updateAlertSettings({
                absenceLocale: e.target.value as "en" | "ur" | "both",
              })
            }
          >
            <option value="both">Urdu + English</option>
            <option value="ur">Urdu only</option>
            <option value="en">English only</option>
          </select>
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-[var(--ims-border)] p-4">
        <h3 className="text-sm font-medium">Fee defaulters reminder</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={s.feeReminderEnabled}
            onChange={(e) => updateAlertSettings({ feeReminderEnabled: e.target.checked })}
          />
          Enable scheduled fee reminders
        </label>
        <div className="flex flex-wrap gap-3 text-sm">
          {(["sms", "email"] as const).map((ch) => (
            <label key={ch} className="flex items-center gap-1.5 capitalize">
              <input
                type="checkbox"
                checked={s.feeReminderChannels.includes(ch)}
                onChange={() => toggleChannel("feeReminderChannels", ch)}
              />
              {ch === "email" ? "Gmail / email" : ch}
            </label>
          ))}
          <span className="text-xs text-[var(--ims-text-muted)]">WhatsApp — later</span>
        </div>
        <label className="block text-sm">
          Language
          <select
            className="mt-1 w-full rounded-md border border-[var(--ims-border)] px-3 py-2"
            value={s.feeReminderLocale}
            onChange={(e) =>
              updateAlertSettings({
                feeReminderLocale: e.target.value as "en" | "ur" | "both",
              })
            }
          >
            <option value="both">Urdu + English</option>
            <option value="ur">Urdu only</option>
            <option value="en">English only</option>
          </select>
        </label>
        <Input
          label="Days of month (comma-separated)"
          value={daysText}
          onChange={(e) => setDaysText(e.target.value)}
          onBlur={() => {
            const days = daysText
              .split(/[,\s]+/)
              .map((n) => Number(n))
              .filter((n) => n >= 1 && n <= 31);
            if (days.length) updateAlertSettings({ feeReminderDaysOfMonth: days });
          }}
        />
        <p className="text-xs text-[var(--ims-text-muted)]">
          Last auto run: {s.lastFeeReminderAt ?? "never"} · Default schedule: 1st, 5th, 10th
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => void runFeeReminders(true)}>
            Send fee reminders now
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void runFeeReminders(false)}
          >
            Run if scheduled today
          </Button>
        </div>
      </section>
    </Card>
  );
}
