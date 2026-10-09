export interface NavModule {
  id: string;
  labelKey: string;
  href: string;
  icon: string;
  group: "main" | "operations" | "finance" | "support" | "system";
}

export const NAV_MODULES: NavModule[] = [
  { id: "dashboard", labelKey: "nav.dashboard", href: "/dashboard", icon: "LayoutDashboard", group: "main" },
  { id: "admissions", labelKey: "nav.admissions", href: "/admissions", icon: "UserPlus", group: "main" },
  { id: "students", labelKey: "nav.students", href: "/students", icon: "GraduationCap", group: "main" },
  { id: "academics", labelKey: "nav.academics", href: "/academics", icon: "BookOpen", group: "main" },
  { id: "attendance", labelKey: "nav.attendance", href: "/attendance", icon: "ClipboardCheck", group: "operations" },
  { id: "exams", labelKey: "nav.exams", href: "/exams", icon: "FileSpreadsheet", group: "operations" },
  { id: "fees", labelKey: "nav.fees", href: "/fees", icon: "Wallet", group: "finance" },
  { id: "accounts", labelKey: "nav.accounts", href: "/accounts", icon: "Calculator", group: "finance" },
  { id: "staff", labelKey: "nav.staff", href: "/staff", icon: "Users", group: "operations" },
  { id: "library", labelKey: "nav.library", href: "/library", icon: "Library", group: "support" },
  { id: "transport", labelKey: "nav.transport", href: "/transport", icon: "Bus", group: "support" },
  { id: "hostel", labelKey: "nav.hostel", href: "/hostel", icon: "Building2", group: "support" },
  { id: "inventory", labelKey: "nav.inventory", href: "/inventory", icon: "Package", group: "support" },
  { id: "communication", labelKey: "nav.communication", href: "/communication", icon: "MessageSquare", group: "operations" },
  { id: "reports", labelKey: "nav.reports", href: "/reports", icon: "BarChart3", group: "finance" },
  {
    id: "subscription",
    labelKey: "nav.subscription",
    href: "/subscription",
    icon: "CreditCard",
    group: "system",
  },
  { id: "settings", labelKey: "nav.settings", href: "/settings", icon: "Settings", group: "system" },
];

export const NAV_GROUPS: { id: NavModule["group"]; labelKey: string }[] = [
  { id: "main", labelKey: "nav.group.main" },
  { id: "operations", labelKey: "nav.group.operations" },
  { id: "finance", labelKey: "nav.group.finance" },
  { id: "support", labelKey: "nav.group.support" },
  { id: "system", labelKey: "nav.group.system" },
];
