"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { Dictionary } from "@/lib/i18n";

type ModuleKey = keyof Dictionary["modules"];

export function ModulePlaceholder({
  moduleKey,
  features,
}: {
  moduleKey: ModuleKey;
  features: string[];
}) {
  const { dict } = useLocale();
  const mod = dict.modules[moduleKey];

  return (
    <div>
      <PageHeader
        title={mod.title}
        subtitle={mod.subtitle}
        actions={<Button size="sm">{dict.common.add}</Button>}
      />
      <Card>
        <CardBody className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <EmptyState title={dict.common.comingSoon} description={mod.subtitle} />
          <div className="rounded-lg border border-dashed border-[var(--ims-border)] bg-[var(--ims-muted)]/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ims-text-muted)]">
              Planned capabilities
            </p>
            <ul className="mt-3 space-y-2">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-[var(--ims-text)]"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ims-accent)]" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
