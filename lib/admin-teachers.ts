/**
 * Teacher emails that can edit and delete any quiz (including other teachers' quizzes).
 * All other teachers can only edit/delete their own quizzes.
 */
export const ADMIN_TEACHER_EMAILS = [
  "deeptithakral@mru.edu.in",
  "meena@mru.edu.in",
  "chandnimagoo@mru.edu.in",
  "tamannasachdeva@mru.edu.in",
  "eshakhanna@mru.edu.in",
] as const;

const ADMIN_SET = new Set(ADMIN_TEACHER_EMAILS.map((e) => e.toLowerCase()));

export function canEditDeleteAnyQuiz(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_SET.has(email.toLowerCase());
}
