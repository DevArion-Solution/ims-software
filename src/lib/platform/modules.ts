import type { PlatformModuleId } from "@/types/platform";

export const PLATFORM_MODULES: {
  id: PlatformModuleId;
  label: string;
  group: "core" | "operations" | "finance" | "services" | "portals";
}[] = [
  { id: "dashboard", label: "Dashboard", group: "core" },
  { id: "admissions", label: "Admissions", group: "core" },
  { id: "students", label: "Students", group: "core" },
  { id: "academics", label: "Academics", group: "core" },
  { id: "attendance", label: "Attendance", group: "operations" },
  { id: "exams", label: "Exams & Results", group: "operations" },
  { id: "communication", label: "Communication", group: "operations" },
  { id: "staff", label: "Staff & HR", group: "operations" },
  { id: "fees", label: "Fee Management", group: "finance" },
  { id: "accounts", label: "Accounts", group: "finance" },
  { id: "reports", label: "Reports", group: "finance" },
  { id: "library", label: "Library", group: "services" },
  { id: "transport", label: "Transport", group: "services" },
  { id: "hostel", label: "Hostel", group: "services" },
  { id: "inventory", label: "Inventory", group: "services" },
  { id: "settings", label: "School Settings", group: "core" },
  { id: "parent_portal", label: "Parent Portal", group: "portals" },
  { id: "student_portal", label: "Student Portal", group: "portals" },
  { id: "teacher_portal", label: "Teacher Portal", group: "portals" },
  { id: "accountant_portal", label: "Accountant Portal", group: "portals" },
  { id: "principal_portal", label: "Principal Portal", group: "portals" },
  { id: "librarian_portal", label: "Librarian Portal", group: "portals" },
  { id: "receptionist_portal", label: "Receptionist Portal", group: "portals" },
];

export const ALL_MODULE_IDS = PLATFORM_MODULES.map((m) => m.id);

export const CORE_MODULE_IDS: PlatformModuleId[] = [
  "dashboard",
  "admissions",
  "students",
  "academics",
  "attendance",
  "exams",
  "fees",
  "reports",
  "settings",
  "parent_portal",
  "student_portal",
  "teacher_portal",
];

export const GROWTH_MODULE_IDS: PlatformModuleId[] = [
  ...CORE_MODULE_IDS,
  "accounts",
  "staff",
  "communication",
  "library",
  "transport",
  "hostel",
  "inventory",
  "accountant_portal",
  "principal_portal",
  "librarian_portal",
  "receptionist_portal",
];

export const ENTERPRISE_MODULE_IDS: PlatformModuleId[] = [...ALL_MODULE_IDS];
