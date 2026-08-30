export type StudentDepartment = "CSE" | "AIML" | "CSTI" | "FSD" | "GenAI";
export type TeacherDepartment =
  | "CST"
  | "Mechanical Engineering"
  | "ECE"
  | "Robotics & AI"
  | "BCA";

export type Department = StudentDepartment | TeacherDepartment;

/** Departments a student can belong to. Sections apply to CSE/AIML only. */
export const DEPARTMENT_OPTIONS: Array<{ value: StudentDepartment; label: string }> = [
  { value: "CSE", label: "CSE" },
  { value: "AIML", label: "AIML" },
  { value: "CSTI", label: "CSTI (No section)" },
  { value: "FSD", label: "FSD (No section)" },
  { value: "GenAI", label: "GenAI (No section)" },
];

/** Departments a teacher can belong to. Teachers are never tied to a section. */
export const TEACHER_DEPARTMENT_OPTIONS: Array<{ value: TeacherDepartment; label: string }> = [
  { value: "CST", label: "CST" },
  { value: "Mechanical Engineering", label: "Mechanical Engineering" },
  { value: "ECE", label: "ECE" },
  { value: "Robotics & AI", label: "Robotics & AI" },
  { value: "BCA", label: "BCA" },
];

export const SECTION_OPTIONS = ["A", "B", "C", "D"] as const;
export type Section = (typeof SECTION_OPTIONS)[number];

export function departmentOptionsForRole(role: string | null | undefined) {
  return role === "teacher" ? TEACHER_DEPARTMENT_OPTIONS : DEPARTMENT_OPTIONS;
}

export function departmentRequiresSection(dept: Department | null | undefined) {
  return dept === "CSE" || dept === "AIML";
}

/**
 * Section applies to students only. A teacher never selects one, whatever
 * their department is named.
 */
export function roleRequiresSection(
  role: string | null | undefined,
  dept: Department | null | undefined
) {
  if (role === "teacher") return false;
  return departmentRequiresSection(dept);
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
