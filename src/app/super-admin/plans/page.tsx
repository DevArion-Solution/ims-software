"use client";

import { useState } from "react";
import { Check, Plus, Star } from "lucide-react";
import { usePlatform } from "@/components/providers/PlatformProvider";
import { PLATFORM_MODULES } from "@/lib/platform/modules";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, Field, TextArea } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import type { PlatformModuleId, PlatformPlan } from "@/types/platform";

function emptyPlan(): PlatformPlan {
  return {
    id: `plan_${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    code: "custom",
    priceMonthly: 9999,
    priceYearly: 99990,
    currency: "PKR",
    maxStudents: 500,
    maxStaff: 50,
    maxCampuses: 2,
    modules: ["dashboard", "students", "fees", "settings", "parent_portal"],
    trialDays: 14,
    published: true,
    description: "",
  };
}

export default function PlansPage() {
  const { data, savePlan, togglePlanPublished } = usePlatform();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PlatformPlan>(emptyPlan());

  function openCreate() {
    setForm(emptyPlan());
    setOpen(true);
  }

  function openEdit(plan: PlatformPlan) {
    setForm({ ...plan, modules: [...plan.modules] });
    setOpen(true);
  }

  function toggleModule(id: PlatformModuleId) {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(id)
        ? prev.modules.filter((m) => m !== id)
        : [...prev.modules, id],
    }));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sa-gold)]">
            Commerce
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--sa-text)]">
            Plans & packages
          </h1>
          <p className="mt-1 text-sm text-[var(--sa-muted)]">
            Control price, student seats, campuses and which modules each package unlocks.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[var(--sa-ink)] hover:bg-[var(--sa-ink-2)]">
          <Plus className="h-4 w-4" />
          New plan
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {data.plans.map((plan) => (
          <article
            key={plan.id}
            className={`relative overflow-hidden rounded-3xl border bg-white p-6 shadow-[var(--sa-shadow)] ${
              plan.highlight
                ? "border-[var(--sa-gold)] ring-2 ring-[var(--sa-gold)]/20"
                : "border-[var(--sa-border)]"
            }`}
          >
            {plan.highlight ? (
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[var(--sa-gold-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7a6210]">
                <Star className="h-3 w-3" /> Popular
              </span>
            ) : null}
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-xl font-semibold text-[var(--sa-text)]">{plan.name}</h2>
              <Badge status={plan.published ? "active" : "inactive"}>
                {plan.published ? "published" : "hidden"}
              </Badge>
            </div>
            <p className="text-sm text-[var(--sa-muted)]">{plan.description}</p>
            <p className="mt-5 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--sa-text)]">
              {formatCurrency(plan.priceMonthly)}
              <span className="text-sm font-normal text-[var(--sa-muted)]"> /mo</span>
            </p>
            <p className="text-xs text-[var(--sa-muted)]">
              or {formatCurrency(plan.priceYearly)} /year
            </p>
            <ul className="mt-5 space-y-2 text-sm text-[var(--sa-text)]">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[var(--sa-cyan)]" />
                Up to {plan.maxStudents.toLocaleString()} students
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[var(--sa-cyan)]" />
                {plan.maxStaff} staff · {plan.maxCampuses} campuses
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[var(--sa-cyan)]" />
                {plan.modules.length} modules · {plan.trialDays}-day trial
              </li>
            </ul>
            <div className="mt-6 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => openEdit(plan)}>
                Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => togglePlanPublished(plan.id)}>
                {plan.published ? "Unpublish" : "Publish"}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Plan editor"
        description="Seat limits and module access define what each school can use."
        wide
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Plan name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Monthly price (PKR)">
            <Input
              type="number"
              value={form.priceMonthly}
              onChange={(e) => setForm({ ...form, priceMonthly: Number(e.target.value) })}
            />
          </Field>
          <Field label="Yearly price (PKR)">
            <Input
              type="number"
              value={form.priceYearly}
              onChange={(e) => setForm({ ...form, priceYearly: Number(e.target.value) })}
            />
          </Field>
          <Field label="Trial days">
            <Input
              type="number"
              value={form.trialDays}
              onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })}
            />
          </Field>
          <Field label="Max students">
            <Input
              type="number"
              value={form.maxStudents}
              onChange={(e) => setForm({ ...form, maxStudents: Number(e.target.value) })}
            />
          </Field>
          <Field label="Max staff">
            <Input
              type="number"
              value={form.maxStaff}
              onChange={(e) => setForm({ ...form, maxStaff: Number(e.target.value) })}
            />
          </Field>
          <Field label="Max campuses">
            <Input
              type="number"
              value={form.maxCampuses}
              onChange={(e) => setForm({ ...form, maxCampuses: Number(e.target.value) })}
            />
          </Field>
          <div className="sm:col-span-2">
            <TextArea
              label="Description"
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
            />
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-[var(--sa-text)]">Included modules</p>
          <div className="grid max-h-56 gap-2 overflow-y-auto rounded-xl border border-[var(--sa-border)] p-3 sm:grid-cols-2">
            {PLATFORM_MODULES.map((m) => {
              const on = form.modules.includes(m.id);
              return (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    on ? "bg-[var(--sa-cyan-soft)] text-[var(--sa-text)]" : "text-[var(--sa-muted)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleModule(m.id)}
                  />
                  {m.label}
                </label>
              );
            })}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[var(--sa-ink)] hover:bg-[var(--sa-ink-2)]"
            onClick={() => {
              if (!form.name.trim()) return;
              savePlan(form);
              setOpen(false);
            }}
          >
            Save plan
          </Button>
        </div>
      </Modal>
    </div>
  );
}
