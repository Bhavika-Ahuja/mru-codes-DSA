import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { DiscussionBoard } from "@/components/discussions/discussion-board";

export default async function TeacherDiscussionsPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "teacher") {
    redirect("/student/dashboard");
  }

  return (
    // A teacher's own department is not a student department, so it can't seed
    // the target class — they choose which class to post to explicitly.
    <DiscussionBoard role="teacher" initialDepartment={null} initialSection={null} />
  );
}
