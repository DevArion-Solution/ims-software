import type { Gender, StaffMember, Student, StudentStatus } from "@/types";

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

export function parseCsv(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(splitCsvLine);
}

function headerIndex(headers: string[], ...names: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().replace(/[\s_]+/g, ""));
  for (const name of names) {
    const key = name.toLowerCase().replace(/[\s_]+/g, "");
    const idx = lower.indexOf(key);
    if (idx >= 0) return idx;
  }
  return -1;
}

function cell(row: string[], idx: number): string {
  return idx >= 0 ? (row[idx] ?? "").trim() : "";
}

export interface ImportResult {
  added: number;
  skipped: number;
  errors: string[];
}

export function parseStudentsCsv(
  text: string,
  campusId: string,
): { rows: Omit<Student, "id" | "admissionNo">[]; errors: string[] } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], errors: ["CSV needs a header row and at least one data row"] };

  const headers = table[0]!;
  const firstNameI = headerIndex(headers, "firstName", "firstname", "first");
  const lastNameI = headerIndex(headers, "lastName", "lastname", "last");
  const classI = headerIndex(headers, "className", "class");
  const sectionI = headerIndex(headers, "section");
  const genderI = headerIndex(headers, "gender");
  const dobI = headerIndex(headers, "dateOfBirth", "dob");
  const phoneI = headerIndex(headers, "phone");
  const emailI = headerIndex(headers, "email");
  const statusI = headerIndex(headers, "status");
  const guardianI = headerIndex(headers, "guardian", "fatherName", "guardianName");

  if (firstNameI < 0 || lastNameI < 0 || classI < 0) {
    return {
      rows: [],
      errors: ["Required columns: firstName, lastName, className (optional: section, gender, dateOfBirth, phone, email, status, guardian)"],
    };
  }

  const rows: Omit<Student, "id" | "admissionNo">[] = [];
  const errors: string[] = [];

  for (let i = 1; i < table.length; i++) {
    const row = table[i]!;
    const firstName = cell(row, firstNameI);
    const lastName = cell(row, lastNameI);
    const className = cell(row, classI);
    if (!firstName || !lastName || !className) {
      errors.push(`Row ${i + 1}: missing firstName/lastName/className`);
      continue;
    }
    const genderRaw = cell(row, genderI).toLowerCase() || "male";
    const gender = (["male", "female", "other"].includes(genderRaw)
      ? genderRaw
      : "male") as Gender;
    const statusRaw = cell(row, statusI).toLowerCase() || "active";
    const status = (
      ["active", "inactive", "alumni", "transferred", "expelled"].includes(statusRaw)
        ? statusRaw
        : "active"
    ) as StudentStatus;

    const guardianName = cell(row, guardianI);
    rows.push({
      firstName,
      lastName,
      gender,
      dateOfBirth: cell(row, dobI) || "2015-01-01",
      className,
      section: cell(row, sectionI) || "A",
      campusId,
      status,
      enrollmentDate: new Date().toISOString().slice(0, 10),
      phone: cell(row, phoneI) || undefined,
      email: cell(row, emailI) || undefined,
      guardians: guardianName
        ? [{ name: guardianName, relation: "Father", phone: cell(row, phoneI) || "" }]
        : [],
    });
  }

  return { rows, errors };
}

export function parseStaffCsv(text: string, campusId: string): {
  rows: Omit<StaffMember, "id" | "employeeNo">[];
  errors: string[];
} {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], errors: ["CSV needs a header row and at least one data row"] };

  const headers = table[0]!;
  const nameI = headerIndex(headers, "name");
  const roleI = headerIndex(headers, "role");
  const deptI = headerIndex(headers, "department", "dept");
  const phoneI = headerIndex(headers, "phone");
  const emailI = headerIndex(headers, "email");
  const salaryI = headerIndex(headers, "salary");
  const statusI = headerIndex(headers, "status");

  if (nameI < 0 || roleI < 0) {
    return {
      rows: [],
      errors: ["Required columns: name, role (optional: department, phone, email, salary, status)"],
    };
  }

  const rows: Omit<StaffMember, "id" | "employeeNo">[] = [];
  const errors: string[] = [];

  for (let i = 1; i < table.length; i++) {
    const row = table[i]!;
    const name = cell(row, nameI);
    const role = cell(row, roleI);
    if (!name || !role) {
      errors.push(`Row ${i + 1}: missing name/role`);
      continue;
    }
    const statusRaw = cell(row, statusI).toLowerCase() || "active";
    rows.push({
      name,
      role,
      department: cell(row, deptI) || "General",
      phone: cell(row, phoneI) || "",
      email: cell(row, emailI) || "",
      status: statusRaw === "inactive" ? "inactive" : "active",
      joinDate: new Date().toISOString().slice(0, 10),
      salary: Number(cell(row, salaryI)) || undefined,
      campusId,
    });
  }

  return { rows, errors };
}

export function studentsToCsv(students: Student[]): string {
  const headers = [
    "admissionNo",
    "firstName",
    "lastName",
    "gender",
    "dateOfBirth",
    "className",
    "section",
    "status",
    "phone",
    "email",
    "guardian",
  ];
  const rows = students.map((s) => [
    s.admissionNo,
    s.firstName,
    s.lastName,
    s.gender,
    s.dateOfBirth,
    s.className,
    s.section,
    s.status,
    s.phone ?? "",
    s.email ?? "",
    s.guardians[0]?.name ?? "",
  ]);
  return [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export function staffToCsv(staff: StaffMember[]): string {
  const headers = ["employeeNo", "name", "role", "department", "phone", "email", "salary", "status"];
  const rows = staff.map((s) => [
    s.employeeNo,
    s.name,
    s.role,
    s.department,
    s.phone,
    s.email,
    String(s.salary ?? ""),
    s.status,
  ]);
  return [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Simple class promotion: Grade N → Grade N+1; Class N → Class N+1; highest becomes alumni */
export function promoteClassName(className: string): { next: string; graduate: boolean } {
  const gradeMatch = /^(Grade|Class)\s+(\d+)$/i.exec(className.trim());
  if (gradeMatch) {
    const prefix = gradeMatch[1]!;
    const n = Number(gradeMatch[2]);
    if (n >= 12) return { next: className, graduate: true };
    return { next: `${prefix} ${n + 1}`, graduate: false };
  }
  return { next: className, graduate: false };
}
