import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { FileText, Plus, Calendar, Users, CheckCircle2, Clock, FileX } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

async function getAssignments(teacherId: string) {
  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        createdById: teacherId,
      },
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return assignments;
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return [];
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "published":
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Published
        </Badge>
      );
    case "draft":
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Draft
        </Badge>
      );
    case "closed":
      return (
        <Badge variant="outline">
          <FileX className="h-3 w-3 mr-1" />
          Closed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDate(date: Date | null) {
  if (!date) return "No due date";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function TeacherAssignmentsPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "teacher") {
    redirect("/student/dashboard");
  }

  const assignments = await getAssignments(profile.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Assignments
          </h1>
          <p className="text-muted-foreground mt-1">
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

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-muted rounded-full mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No assignments yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Create your first assignment to get started. Upload PDFs, set due dates, and track student submissions.
            </p>
            <Button asChild>
              <Link href="/teacher/assignments/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{assignment.title}</CardTitle>
                      {getStatusBadge(assignment.status)}
                    </div>
                    {assignment.description && (
                      <CardDescription className="mt-1">
                        {assignment.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  {assignment.topic && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Topic:</span>
                      <Badge variant="outline" className="text-xs">
                        {assignment.topic}
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {formatDate(assignment.dueDate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{assignment._count.submissions} submission{assignment._count.submissions !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>{assignment.maxPoints} points</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/teacher/assignments/${assignment.id}`}>
                      View Details
                    </Link>
                  </Button>
                  {assignment.status === "published" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/teacher/assignments/${assignment.id}/submissions`}>
                        <Users className="h-4 w-4 mr-2" />
                        View Submissions ({assignment._count.submissions})
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
