"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Building2,
  Bus,
  Calculator,
  ClipboardCheck,
  CreditCard,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  Library,
  MessageSquare,
  Package,
  Settings,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { NAV_GROUPS, NAV_MODULES } from "@/lib/config/modules";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useData } from "@/components/providers/DataProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTenantAccess } from "@/components/providers/TenantAccessProvider";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  UserPlus,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  FileSpreadsheet,
  Wallet,
  Calculator,
  Users,
  Library,
  Bus,
  Building2,
  Package,
  MessageSquare,
  BarChart3,
  CreditCard,
  Settings,
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { dict } = useLocale();
  const { data } = useData();
  const { session } = useAuth();
  const { canUseNavModule } = useTenantAccess();
  const institute = data.institute;

  const userAllowedModules = (() => {
    const email = session?.user.email;
    const su = data.systemUsers.find((u) => u.email === email && u.active);
    if (!su || !su.modules.length) return null;
    return new Set(su.modules);
  })();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-[var(--ims-border)] bg-[var(--ims-sidebar)] text-[var(--ims-sidebar-text)]">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--ims-accent)] font-[family-name:var(--font-display)] text-lg font-bold text-white">
            IMS
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{institute.shortName}</p>
            <p className="truncate text-xs text-white/60">{dict.brand.tagline}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const items = NAV_MODULES.filter((m) => {
            if (m.group !== group.id) return false;
            if (!canUseNavModule(m.id)) return false;
            if (!userAllowedModules) return true;
            if (m.id === "dashboard" || m.id === "settings" || m.id === "subscription") return true;
            return userAllowedModules.has(m.id);
          });
          if (!items.length) return null;
          return (
            <div key={group.id} className="mb-5">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                {t(dict, group.labelKey)}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard;
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                          active
                            ? "bg-white/12 text-white"
                            : "text-white/70 hover:bg-white/8 hover:text-white",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-90" />
                        <span className="truncate">{t(dict, item.labelKey)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-3 text-xs text-white/45">
        Academic Year {institute.academicYear}
      </div>
    </aside>
  );
}
