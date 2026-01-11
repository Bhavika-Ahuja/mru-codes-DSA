import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { TeacherPerformanceDashboard } from "@/components/dashboard/teacher-performance-dashboard";
import { Users } from "lucide-react";

export default async function TeacherPerformancePage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "teacher") {
    redirect("/student/dashboard");
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">Student Analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Student Performance
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Monitor your students&apos; progress, analyze class performance by section, and identify areas that need attention.
          </p>
        </div>
      </div>

      {/* Performance Dashboard with Class/Section Filtering */}
      <TeacherPerformanceDashboard />
    </div>
  );
}
