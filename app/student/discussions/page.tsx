import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { DiscussionBoard } from "@/components/discussions/discussion-board";

export default async function StudentDiscussionsPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "student") {
    redirect("/teacher/dashboard");
  }

  return (
    <DiscussionBoard
      role="student"
      initialDepartment={profile.department ?? null}
      initialSection={profile.section ?? null}
    />
  );
}
