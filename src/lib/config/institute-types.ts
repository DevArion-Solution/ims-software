import type { InstituteType } from "@/types";

export interface InstituteTypeConfig {
  value: InstituteType;
  label: string;
  description: string;
  defaultLevels: string[];
}

export const INSTITUTE_TYPES: InstituteTypeConfig[] = [
  {
    value: "school",
    label: "School",
    description: "Primary & secondary schools (Playgroup to Matric / O-Level)",
    defaultLevels: ["Playgroup", "Nursery", "KG", "1-10", "O-Level"],
  },
  {
    value: "college",
    label: "College",
    description: "Intermediate / A-Level / FA / FSc / ICom / ICS",
    defaultLevels: ["1st Year", "2nd Year", "A-Level"],
  },
  {
    value: "university",
    label: "University",
    description: "Undergraduate, graduate and postgraduate programs",
    defaultLevels: ["BS", "MS", "MPhil", "PhD", "Diploma"],
  },
  {
    value: "academy",
    label: "Academy",
    description: "Subject academies, skills and professional training",
    defaultLevels: ["Beginner", "Intermediate", "Advanced", "Batch"],
  },
  {
    value: "coaching",
    label: "Coaching Center",
    description: "Entry-test and competitive exam coaching",
    defaultLevels: ["MDCAT", "ECAT", "NTS", "CSS", "Batch"],
  },
  {
    value: "madrasa",
    label: "Madrasa",
    description: "Islamic education institutes",
    defaultLevels: ["Nazra", "Hifz", "Alim", "Alima"],
  },
  {
    value: "vocational",
    label: "Vocational / Technical",
    description: "Technical and vocational training institutes",
    defaultLevels: ["Certificate", "Diploma", "Short Course"],
  },
];
