import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";

export default async function DashboardPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  // Transform Prisma profile to match component props
  const profileData = {
    id: profile.id,
    email: profile.email,
    full_name: profile.fullName,
    roll_number: profile.rollNumber,
    section: profile.section,
    role: profile.role,
    avatar_url: profile.avatarUrl,
    total_points: profile.totalScore,
    created_at: profile.createdAt.toISOString(),
    updated_at: profile.updatedAt.toISOString(),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile.fullName.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">
          {profile.role === "teacher"
            ? "Manage your courses, quizzes, and track student progress."
            : "Continue learning, complete assignments, and join live quizzes."}
        </p>
      </div>

      {profile.role === "teacher" ? (
        <TeacherDashboard />
      ) : (
        <StudentDashboard profile={profileData} />
      )}
    </div>
  );
}
