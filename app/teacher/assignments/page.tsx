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
import Link from "next/link";

export default async function TeacherAssignmentsPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "teacher") {
    redirect("/student/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="text-muted-foreground">
            Create and manage assignments for your students
          </p>
        </div>
        <Button className="gap-2" asChild>
          <Link href="/teacher/assignments/create">
            <Plus className="h-4 w-4" />
            Create Assignment
          </Link>
        </Button>
      </div>

      {/* Coming Soon */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="p-4 bg-muted rounded-full mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Assignments Coming Soon</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">
            The assignment system is currently under development. You&apos;ll be able to create assignments, track submissions, and grade student work soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

