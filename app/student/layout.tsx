import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/nav";
import { DashboardHeader } from "@/components/dashboard/header";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  // Double-check role (middleware should have caught this, but just in case)
  if (profile.role !== "student") {
    redirect("/teacher/dashboard");
  }

  // Transform Prisma profile to match component props
  const profileData = {
    id: profile.id,
    email: profile.email,
    full_name: profile.fullName,
    roll_number: profile.rollNumber,
    section: profile.section,
    role: profile.role as "student" | "teacher",
    avatar_url: profile.avatarUrl,
    total_points: profile.totalScore,
    created_at: profile.createdAt.toISOString(),
    updated_at: profile.updatedAt.toISOString(),
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      <DashboardHeader profile={profileData} />
      <div className="flex flex-1 min-h-0">
        <DashboardNav role={profile.role} />
        <main className="flex-1 p-4 pb-24 lg:p-8 lg:pb-8 overflow-y-auto min-w-0">{children}</main>
      </div>
      <MobileNav role={profile.role} />
    </div>
  );
}

