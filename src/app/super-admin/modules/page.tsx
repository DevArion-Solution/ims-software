"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Shield } from "lucide-react";
import { usePlatform } from "@/components/providers/PlatformProvider";
import { PLATFORM_MODULES } from "@/lib/platform/modules";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Modal";
import type { PlatformModuleId } from "@/types/platform";

export default function ModulesPage() {
  const { data, getPlan, effectiveModules, setSchoolModules, assignPlan, setSchoolLimits } =
    usePlatform();
  const searchParams = useSearchParams();
  const initialSchool = searchParams.get("school") ?? data.schools[0]?.id ?? "";
  const [schoolId, setSchoolId] = useState(initialSchool);

  const school = useMemo(
    () => data.schools.find((s) => s.id === schoolId) ?? data.schools[0],
    [data.schools, schoolId],
  );
  const plan = school ? getPlan(school.planId) : undefined;
  const modules = school ? effectiveModules(school) : [];
  const [selected, setSelected] = useState<PlatformModuleId[]>(modules);
  const [maxStudents, setMaxStudents] = useState(
    String(school?.maxStudentsOverride ?? plan?.maxStudents ?? 0),
  );
  const [maxStaff, setMaxStaff] = useState(
    String(school?.maxStaffOverride ?? plan?.maxStaff ?? 0),
  );

  function loadSchool(id: string) {
    const s = data.schools.find((x) => x.id === id);
    if (!s) return;
    setSchoolId(id);
    const p = getPlan(s.planId);
    setSelected(effectiveModules(s));
    setMaxStudents(String(s.maxStudentsOverride ?? p?.maxStudents ?? 0));
    setMaxStaff(String(s.maxStaffOverride ?? p?.maxStaff ?? 0));
  }

  useEffect(() => {
    const fromUrl = searchParams.get("school");
    if (fromUrl && data.schools.some((s) => s.id === fromUrl)) {
      loadSchool(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, data.schools]);

  function toggle(id: PlatformModuleId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  if (!school) {
    return <p className="text-sm text-[var(--sa-muted)]">No schools yet.</p>;
  }

  const groups = [...new Set(PLATFORM_MODULES.map((m) => m.group))];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sa-gold)]">
          Control
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--sa-text)]">
          Module & seat access
        </h1>
        <p className="mt-1 text-sm text-[var(--sa-muted)]">
          Override plan modules per school and set custom student/staff ceilings.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border border-[var(--sa-border)] bg-white p-4 shadow-[var(--sa-shadow)]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--sa-muted)]">
            Select school
          </p>
          <div className="space-y-1">
            {data.schools.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => loadSchool(s.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  school.id === s.id
                    ? "bg-[var(--sa-ink)] text-white"
                    : "hover:bg-[var(--sa-bg)] text-[var(--sa-text)]"
                }`}
              >
                <span className="truncate font-medium">{s.shortName}</span>
                <Badge status={s.status}>{s.status}</Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--sa-text)]">{school.name}</h2>
                <p className="text-sm text-[var(--sa-muted)]">
                  Base plan: {plan?.name ?? "—"} · currently {modules.length} modules live
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--sa-gold-soft)] px-3 py-1 text-xs font-semibold text-[#7a6210]">
                <Shield className="h-3.5 w-3.5" />
                Access control
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <SelectField
                label="Assign plan"
                value={school.planId}
                onChange={(v) => {
                  assignPlan(school.id, v, school.billingCycle);
                  const p = data.plans.find((x) => x.id === v);
                  if (p) {
                    setSelected([...p.modules]);
                    setMaxStudents(String(p.maxStudents));
                    setMaxStaff(String(p.maxStaff));
                  }
                }}
              >
                {data.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectField>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Max students override</span>
                <Input
                  type="number"
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Max staff override</span>
                <Input
                  type="number"
                  value={maxStaff}
                  onChange={(e) => setMaxStaff(e.target.value)}
                />
              </label>
            </div>
          </div>

          {groups.map((group) => (
            <div
              key={group}
              className="rounded-2xl border border-[var(--sa-border)] bg-white p-5 shadow-[var(--sa-shadow)]"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--sa-muted)]">
                {group}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {PLATFORM_MODULES.filter((m) => m.group === group).map((m) => {
                  const on = selected.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggle(m.id)}
                      className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                        on
                          ? "border-[var(--sa-cyan)] bg-[var(--sa-cyan-soft)] text-[var(--sa-text)]"
                          : "border-[var(--sa-border)] text-[var(--sa-muted)] hover:bg-[var(--sa-bg)]"
                      }`}
                    >
                      <span className="font-medium">{m.label}</span>
                      <span className="mt-1 block text-[11px] uppercase tracking-wide opacity-70">
                        {on ? "Enabled" : "Disabled"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (plan) setSelected([...plan.modules]);
              }}
            >
              Reset to plan
            </Button>
            <Button
              className="bg-[var(--sa-ink)] hover:bg-[var(--sa-ink-2)]"
              onClick={() => {
                setSchoolModules(school.id, selected);
                setSchoolLimits(school.id, {
                  maxStudents: Number(maxStudents) || undefined,
                  maxStaff: Number(maxStaff) || undefined,
                });
              }}
            >
              Save access rules
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
