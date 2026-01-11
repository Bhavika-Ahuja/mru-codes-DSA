import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { StudentPerformanceDashboard } from "@/components/dashboard/student-performance-dashboard";
import { BarChart3 } from "lucide-react";

export default async function StudentPerformancePage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "student") {
    redirect("/teacher/dashboard");
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-2">
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm font-medium">Performance Analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            My Performance
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Track your progress, analyze your strengths and weaknesses, and see how you&apos;re improving over time.
          </p>
        </div>
      </div>

      {/* Performance Dashboard */}
      <StudentPerformanceDashboard />
    </div>
  );
}
