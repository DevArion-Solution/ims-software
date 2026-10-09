"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2 } from "lucide-react";
import { usePlatform } from "@/components/providers/PlatformProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SelectField, TextArea } from "@/components/ui/Modal";
import { labelize } from "@/lib/utils";
import type { InstituteType } from "@/types";

const TYPES: InstituteType[] = [
  "school",
  "college",
  "university",
  "academy",
  "coaching",
  "madrasa",
  "vocational",
];

export default function RegisterSchoolPage() {
  const router = useRouter();
  const { data, submitRegistration } = usePlatform();
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    instituteName: "",
    instituteType: "school" as InstituteType,
    city: "",
    address: "",
    phone: "",
    email: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    requestedPlanId: data.settings.defaultPlanId,
    expectedStudents: 200,
    message: "",
  });

  if (!data.settings.allowSelfRegistration) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--sa-bg)] px-4">
        <div className="max-w-md rounded-2xl border border-[var(--sa-border)] bg-white p-8 text-center shadow-[var(--sa-shadow)]">
          <Building2 className="mx-auto h-10 w-10 text-[var(--sa-muted)]" />
          <h1 className="mt-4 text-xl font-semibold">Registration closed</h1>
          <p className="mt-2 text-sm text-[var(--sa-muted)]">
            Self-registration is disabled. Contact {data.settings.supportEmail}.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-[var(--sa-cyan)]">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submitRegistration(form);
    setDone(true);
  }

  return (
    <div
      className="min-h-screen px-4 py-10"
      style={{ background: "var(--sa-glow)" }}
    >
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="rounded-3xl bg-[var(--sa-ink)] p-8 text-white shadow-[var(--sa-shadow)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sa-gold)]">
            {data.settings.platformName}
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight">
            Register your institute
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Submit your school details. Super Admin reviews the request, assigns a plan,
            sets student limits, and unlocks modules before your team goes live.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            <li>• Multi-portal access for admin, teachers, parents & students</li>
            <li>• Fee challans, attendance, exams and campus services</li>
            <li>• {data.settings.defaultTrialDays}-day trial on approval</li>
          </ul>
          <Link href="/login" className="mt-10 inline-block text-sm text-[var(--sa-gold)]">
            Already have an account? Sign in →
          </Link>
        </div>

        <div className="rounded-3xl border border-[var(--sa-border)] bg-white p-6 shadow-[var(--sa-shadow)] sm:p-8">
          {done ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="mt-4 text-xl font-semibold text-[var(--sa-text)]">
                Application submitted
              </h2>
              <p className="mt-2 text-sm text-[var(--sa-muted)]">
                {data.settings.requireApproval
                  ? "Super Admin will review and email your admin credentials."
                  : "Your school is being provisioned."}
              </p>
              <Button className="mt-6" onClick={() => router.push("/login")}>
                Go to login
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Institute name"
                  required
                  value={form.instituteName}
                  onChange={(e) => setForm({ ...form, instituteName: e.target.value })}
                />
              </div>
              <SelectField
                label="Institute type"
                value={form.instituteType}
                onChange={(v) => setForm({ ...form, instituteType: v as InstituteType })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {labelize(t)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Requested plan"
                value={form.requestedPlanId}
                onChange={(v) => setForm({ ...form, requestedPlanId: v })}
              >
                {data.plans
                  .filter((p) => p.published)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </SelectField>
              <Input
                label="City"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
              <Input
                label="Expected students"
                type="number"
                required
                value={form.expectedStudents}
                onChange={(e) =>
                  setForm({ ...form, expectedStudents: Number(e.target.value) })
                }
              />
              <div className="sm:col-span-2">
                <Input
                  label="Address"
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <Input
                label="Institute phone"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label="Institute email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Admin full name"
                required
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              />
              <Input
                label="Admin phone"
                required
                value={form.adminPhone}
                onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Admin email"
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <TextArea
                  label="Message (optional)"
                  value={form.message}
                  onChange={(v) => setForm({ ...form, message: v })}
                />
              </div>
              <div className="sm:col-span-2 mt-2">
                <Button
                  type="submit"
                  className="w-full bg-[var(--sa-ink)] hover:bg-[var(--sa-ink-2)]"
                  size="lg"
                >
                  Submit registration
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
