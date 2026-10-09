import { describe, expect, it } from "vitest";
import { parseCsv, parseStudentsCsv, parseStaffCsv } from "@/lib/school/csv";

describe("parseCsv", () => {
  it("parses quoted fields with commas", () => {
    const rows = parseCsv('name,note\n"Ahmed, Jr.",hello');
    expect(rows[1]![0]).toBe("Ahmed, Jr.");
    expect(rows[1]![1]).toBe("hello");
  });

  it("strips BOM", () => {
    const rows = parseCsv("\uFEFFa,b\n1,2");
    expect(rows[0]![0]).toBe("a");
  });
});

describe("parseStudentsCsv", () => {
  it("parses valid student rows", () => {
    const csv = `firstName,lastName,className,section,gender
Ahmed,Raza,Class 8,A,male`;
    const { rows, errors } = parseStudentsCsv(csv, "camp1");
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.firstName).toBe("Ahmed");
    expect(rows[0]!.className).toBe("Class 8");
    expect(rows[0]!.campusId).toBe("camp1");
  });

  it("errors on missing required columns", () => {
    const { rows, errors } = parseStudentsCsv("foo,bar\n1,2", "camp1");
    expect(rows).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("parseStaffCsv", () => {
  it("parses staff rows (employeeNo assigned on import)", () => {
    const csv = `name,role,department,phone,email,salary,status
Jane Doe,Teacher,Science,03001234567,jane@test.com,90000,active`;
    const { rows, errors } = parseStaffCsv(csv, "camp1");
    expect(errors).toHaveLength(0);
    expect(rows[0]!.name).toBe("Jane Doe");
    expect(rows[0]!.role).toBe("Teacher");
    expect(rows[0]!.salary).toBe(90000);
    expect(rows[0]!.campusId).toBe("camp1");
  });
});
