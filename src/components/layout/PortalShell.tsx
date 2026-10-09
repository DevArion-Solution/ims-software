"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  ClipboardCheck,
  FileSpreadsheet,
  BookOpen,
  Wallet,
  Calculator,
  Bell,
  Calendar,
  GraduationCap,
  Users,
  LogOut,
  Menu,
  Banknote,
  Receipt,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useData } from "@/components/providers/DataProvider";
import { useTenantAccess } from "@/components/providers/TenantAccessProvider";
import { useLocale } from "@/components/providers/LocaleProvider";
import { TenantGate } from "@/components/platform/TenantGate";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { SUPPORTED_LOCALES } from "@/lib/i18n";

export interface PortalNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function PortalShell({
  title,
  subtitle,
  nav,
  children,
  accent = "primary",
}: {
  title: string;
  subtitle: string;
  nav: PortalNavItem[];
  children: ReactNode;
  accent?: "primary" | "accent";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, ready, logout } = useAuth();
  const { data } = useData();
  const { canUsePortal, ready: accessReady } = useTenantAccess();
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);

  const portalKey = (() => {
    if (pathname.startsWith("/teacher")) return "teacher" as const;
    if (pathname.startsWith("/accountant")) return "accountant" as const;
    if (pathname.startsWith("/parent")) return "parent" as const;
    if (pathname.startsWith("/student")) return "student" as const;
    if (pathname.startsWith("/principal")) return "principal" as const;
    if (pathname.startsWith("/librarian")) return "librarian" as const;
    if (pathname.startsWith("/receptionist")) return "receptionist" as const;
    return null;
  })();

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/login");
  }, [ready, session, router]);

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--ims-text-muted)]">
        Loading portal…
      </div>
    );
  }

  if (portalKey && accessReady && !canUsePortal(portalKey)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--ims-bg)] px-4">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-lg">
          <p className="text-lg font-semibold text-[var(--ims-text)]">Portal not enabled</p>
          <p className="mt-2 text-sm text-[var(--ims-text-muted)]">
            The Super Admin has not enabled the {portalKey} portal for this school&apos;s plan.
          </p>
        </div>
      </div>
    );
  }

  const brandBg = accent === "accent" ? "bg-[var(--ims-accent)]" : "bg-[var(--ims-primary)]";

  return (
    <TenantGate>
    <div className="flex min-h-screen bg-[var(--ims-bg)]">
      <aside className="hidden w-60 flex-col border-r border-[var(--ims-border)] bg-[var(--ims-sidebar)] text-white lg:flex">
        <div className="border-b border-white/10 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold text-white", brandBg)}>
              IMS
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-[11px] text-white/55">{subtitle}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm",
                  active ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3 text-xs text-white/50">
          {data.institute.shortName} · {data.institute.academicYear}
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--ims-border)] bg-white px-4 sm:px-6">
          <button type="button" className="rounded-md p-2 lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{data.institute.name}</p>
            <p className="truncate text-xs text-[var(--ims-text-muted)]">
              {session.user.name} · {session.user.role.replace("_", " ")}
            </p>
          </div>
          <select
            aria-label="Language"
            className="hidden h-8 rounded-md border border-[var(--ims-border)] bg-white px-2 text-xs sm:block"
            value={locale}
            onChange={(e) => setLocale(e.target.value as "en" | "ur")}
          >
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </header>

        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-60 bg-[var(--ims-sidebar)] p-3 text-white">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="mb-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-white/80 hover:bg-white/10"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</main>
      </div>
    </div>
    </TenantGate>
  );
}

export const TEACHER_NAV: PortalNavItem[] = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/report", label: "My Report", icon: UserCircle },
  { href: "/teacher/classes", label: "My Classes", icon: Users },
  { href: "/teacher/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/teacher/marks", label: "Marks Entry", icon: FileSpreadsheet },
  { href: "/teacher/timetable", label: "Timetable", icon: Calendar },
  { href: "/teacher/homework", label: "Homework", icon: BookOpen },
  { href: "/teacher/leave", label: "Leave", icon: ClipboardCheck },
  { href: "/teacher/notices", label: "Notices", icon: Bell },
];

export const ACCOUNTANT_NAV: PortalNavItem[] = [
  { href: "/accountant", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accountant/profile", label: "My Profile", icon: UserCircle },
  { href: "/accountant/fees", label: "Fee Collection", icon: Wallet },
  { href: "/accountant/challans", label: "Challans", icon: FileSpreadsheet },
  { href: "/accountant/payroll", label: "Payroll", icon: Banknote },
  { href: "/accountant/expenses", label: "Expenses & Trips", icon: Receipt },
  { href: "/accountant/vouchers", label: "Vouchers", icon: Calculator },
  { href: "/accountant/reports", label: "Reports", icon: BookOpen },
];

export const PARENT_NAV: PortalNavItem[] = [
  { href: "/parent", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parent/report", label: "Child Report", icon: UserCircle },
  { href: "/parent/fees", label: "Fees & Pay", icon: Wallet },
  { href: "/parent/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/parent/results", label: "Results", icon: GraduationCap },
  { href: "/parent/homework", label: "Homework", icon: BookOpen },
  { href: "/parent/notices", label: "Notices", icon: Bell },
];

export const STUDENT_NAV: PortalNavItem[] = [
  { href: "/student", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/report", label: "My Report", icon: UserCircle },
  { href: "/student/timetable", label: "Timetable", icon: Calendar },
  { href: "/student/homework", label: "Homework", icon: BookOpen },
  { href: "/student/results", label: "Results", icon: GraduationCap },
  { href: "/student/fees", label: "My Fees", icon: Wallet },
  { href: "/student/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/student/notices", label: "Notices", icon: Bell },
];

export const PRINCIPAL_NAV: PortalNavItem[] = [
  { href: "/principal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/principal/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/principal/staff", label: "Staff", icon: Users },
  { href: "/principal/reports", label: "Reports", icon: BookOpen },
];

export const LIBRARIAN_NAV: PortalNavItem[] = [
  { href: "/librarian", label: "Dashboard", icon: LayoutDashboard },
  { href: "/librarian/catalog", label: "Catalog", icon: BookOpen },
  { href: "/librarian/issues", label: "Issue / Return", icon: ClipboardCheck },
];

export const RECEPTIONIST_NAV: PortalNavItem[] = [
  { href: "/receptionist", label: "Dashboard", icon: LayoutDashboard },
  { href: "/receptionist/inquiries", label: "Inquiries", icon: Users },
  { href: "/receptionist/visitors", label: "Visitors", icon: ClipboardCheck },
  { href: "/receptionist/lookup", label: "Student lookup", icon: GraduationCap },
];
