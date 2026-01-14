export type Department = "CSE" | "AIML" | "CSTI" | "FSD" | "GenAI";

export const DEPARTMENT_OPTIONS: Array<{ value: Department; label: string }> = [
  { value: "CSE", label: "CSE" },
  { value: "AIML", label: "AIML" },
  { value: "CSTI", label: "CSTI (No section)" },
  { value: "FSD", label: "FSD (No section)" },
  { value: "GenAI", label: "GenAI (No section)" },
];

export const SECTION_OPTIONS = ["A", "B", "C"] as const;
export type Section = (typeof SECTION_OPTIONS)[number];

export function departmentRequiresSection(dept: Department | null | undefined) {
  return dept === "CSE" || dept === "AIML";
}

export function formatDepartmentSection(
  department: string | null | undefined,
  section: string | null | undefined
) {
  const dept = typeof department === "string" && department.trim() ? department.trim() : null;
  const sec = typeof section === "string" && section.trim() ? section.trim() : null;

  if (dept && sec) return `${dept} • Section ${sec}`;
  if (dept) return dept;
  if (sec) return `Section ${sec}`;
  return "—";
}

