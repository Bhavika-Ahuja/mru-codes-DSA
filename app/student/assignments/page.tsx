import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { FileText, Plus, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function StudentAssignmentsPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "student") {
    redirect("/teacher/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">
            View and submit your coding assignments
          </p>
        </div>
      </div>

      {/* Coming Soon */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-muted rounded-full mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Assignments Coming Soon</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">
            The assignment system is currently under development. You&apos;ll be able to view assignments, submit your solutions, and track your progress soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

