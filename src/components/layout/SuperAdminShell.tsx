"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Package,
  CreditCard,
  Shield,
  Users,
  Settings,
  ScrollText,
  LogOut,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePlatform } from "@/components/providers/PlatformProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: LucideIcon; group?: string }[] = [
  { href: "/super-admin", label: "Command Center", icon: LayoutDashboard, group: "Overview" },
  { href: "/super-admin/schools", label: "Schools", icon: Building2, group: "Tenants" },
  { href: "/super-admin/registrations", label: "Registrations", icon: ClipboardList, group: "Tenants" },
  { href: "/super-admin/plans", label: "Plans & Packages", icon: Package, group: "Commerce" },
  { href: "/super-admin/billing", label: "Billing", icon: CreditCard, group: "Commerce" },
  { href: "/super-admin/modules", label: "Module Access", icon: Shield, group: "Control" },
  { href: "/super-admin/users", label: "Platform Users", icon: Users, group: "Control" },
  { href: "/super-admin/audit", label: "Audit Log", icon: ScrollText, group: "Control" },
  { href: "/super-admin/settings", label: "Platform Settings", icon: Settings, group: "System" },
];

export function SuperAdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, ready, logout } = useAuth();
  const { data, stats } = usePlatform();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!session || session.portal !== "super") {
      router.replace("/login");
    }
  }, [ready, session, router]);

  if (!ready || !session || session.portal !== "super") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--ims-bg)] text-sm text-[var(--ims-text-muted)]">
        Opening Super Admin…
      </div>
    );
  }

  const groups = [...new Set(NAV.map((n) => n.group))];

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div>
        {groups.map((group) => (
          <div key={group} className="mb-5">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
              {group}
            </p>
            <ul className="space-y-0.5">
              {NAV.filter((n) => n.group === group).map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/super-admin"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
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
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  function SidebarBrand() {
    return (
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--ims-primary)] font-[family-name:var(--font-display)] text-lg font-bold text-white">
            IMS
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {data.settings.platformName}
            </p>
            <p className="truncate text-xs text-white/60">Super Admin Control</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-white/8 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/45">Schools</p>
            <p className="text-sm font-semibold text-white">{stats.totalSchools}</p>
          </div>
          <div className="rounded-md bg-white/8 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/45">MRR</p>
            <p className="text-sm font-semibold text-white">
              {(stats.mrr / 1000).toFixed(0)}k
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ims-bg)]">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64">
        <aside className="flex h-full w-full flex-col border-r border-[var(--ims-border)] bg-[var(--ims-sidebar)] text-[var(--ims-sidebar-text)]">
          <SidebarBrand />
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <NavLinks />
          </nav>
          <div className="border-t border-white/10 p-3">
            <div className="mb-2 px-1">
              <p className="truncate text-sm font-medium text-white">{session.user.name}</p>
              <p className="truncate text-xs text-white/45">{session.user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-white/8 py-2 text-sm text-white/75 transition hover:bg-white/12 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>
      </div>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-[var(--ims-border)] bg-white">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              className="rounded-md border border-[var(--ims-border)] bg-white p-2 lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5 text-[var(--ims-text)]" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--ims-text)]">
                Platform Command Tower
              </p>
              <p className="truncate text-xs text-[var(--ims-text-muted)]">
                {stats.pendingRegistrations} pending · {stats.activeSchools} live schools ·{" "}
                {stats.totalStudents.toLocaleString()} students
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => {
                logout();
                router.push("/login");
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
          </div>
        </header>

        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-64 flex-col overflow-y-auto bg-[var(--ims-sidebar)] text-white">
              <SidebarBrand />
              <nav className="flex-1 px-3 py-4">
                <NavLinks onNavigate={() => setOpen(false)} />
              </nav>
            </div>
          </div>
        ) : null}

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
