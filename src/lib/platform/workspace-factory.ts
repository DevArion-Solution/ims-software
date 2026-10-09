import { FEE_POLICY } from "@/lib/calc/fees";
import type { InstituteType } from "@/types";

export function buildEmptyWorkspace(input: {
  id: string;
  name: string;
  shortName: string;
  type: InstituteType | string;
  countryCode?: string;
  city: string;
  address: string;
  phone: string;
  email: string;
}) {
  return {
    institute: {
      id: input.id,
      name: input.name,
      shortName: input.shortName,
      type: input.type,
      countryCode: input.countryCode ?? "PK",
      city: input.city,
      address: input.address,
      phone: input.phone,
      email: input.email,
      academicYear: "2025-26",
      campuses: [
        {
          id: `${input.id}_camp1`,
          name: `${input.shortName} Main Campus`,
          city: input.city,
          address: input.address,
          isMain: true,
        },
      ],
    },
    students: [],
    admissions: [],
    fees: [],
    feeStructures: [],
    staff: [],
    leaves: [],
    payroll: [],
    classes: [],
    subjects: [],
    attendance: [],
    staffAttendance: [],
    exams: [],
    results: [],
    papers: [],
    books: [],
    bookIssues: [],
    routes: [],
    routeAssignments: [],
    hostelRooms: [],
    hostelAllotments: [],
    inventory: [],
    inventoryTxns: [],
    vouchers: [],
    expenses: [],
    trips: [],
    notices: [],
    deliveries: [],
    systemUsers: [],
    auditLogs: [],
    purchaseOrders: [],
    hostelVisitors: [],
    timetable: [],
    homework: [],
    feePolicy: { ...FEE_POLICY },
  };
}
