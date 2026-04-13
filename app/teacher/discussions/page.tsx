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
    <DiscussionBoard
      role="teacher"
      initialDepartment={profile.department ?? null}
      initialSection={profile.section ?? null}
    />
  );
}
