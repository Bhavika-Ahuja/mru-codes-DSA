import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  FileText,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

async function getAssignments(
  studentId: string,
  department: string | null,
  section: string | null
) {
  try {
    const studentDepartment = department?.trim() || null;
    const studentSection = section?.trim() || null;

    const assignments = await prisma.assignment.findMany({
      where: {
        status: "published",
        OR: [
          {
            targetDepartment: null,
          },
          ...(studentDepartment
            ? [
                {
                  targetDepartment: studentDepartment,
                  OR: [
                    { targetSection: null },
                    ...(studentSection ? [{ targetSection: studentSection }] : []),
                  ],
                },
              ]
            : []),
        ],
      },
      include: {
        createdBy: {
          select: {
            fullName: true,
          },
        },
        submissions: {
          where: {
            studentId,
          },
          select: {
            id: true,
            status: true,
            submittedAt: true,
            grade: true,
          },
          take: 1,
          orderBy: {
            submittedAt: "desc",
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

function getSubmissionBadge(status: string | undefined, dueDate: Date | null) {
  if (!status) {
    const isOverdue = dueDate && new Date(dueDate) < new Date();
    if (isOverdue) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Not Submitted
      </Badge>
    );
  }

  switch (status) {
    case "graded":
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Graded
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Submitted
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDate(date: Date | null) {
  if (!date) return "No due date";
  const isOverdue = date < new Date();
  return (
    <span className={isOverdue ? "text-destructive font-medium" : ""}>
      {new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })}
    </span>
  );
}

export default async function StudentAssignmentsPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "student") {
    redirect("/teacher/dashboard");
  }

  const assignments = await getAssignments(
    profile.id,
    profile.department ?? null,
    profile.section ?? null
  );

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
            View and submit your assignment solutions
          </p>
        </div>
      </div>

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-muted rounded-full mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No assignments available</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              There are no published assignments at the moment. Check back later for new assignments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => {
            const submission = assignment.submissions[0];
            const isOverdue =
              assignment.dueDate && new Date(assignment.dueDate) < new Date();

            return (
              <Card
                key={assignment.id}
                className={`hover:shadow-md transition-shadow ${
                  isOverdue && !submission ? "border-destructive/50" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{assignment.title}</CardTitle>
                        {getSubmissionBadge(submission?.status, assignment.dueDate)}
                      </div>
                      {assignment.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {assignment.description}
                        </CardDescription>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>By {assignment.createdBy.fullName}</span>
                        {assignment.topic && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              {assignment.topic}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {formatDate(assignment.dueDate)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{assignment.maxPoints} points</span>
                    </div>
                    {submission && submission.grade !== null && (
                      <div className="flex items-center gap-1 font-medium text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>
                          Grade: {submission.grade}/{assignment.maxPoints}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={assignment.pdfUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Assignment
                      </a>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href={`/student/assignments/${assignment.id}`}>
                        {submission ? "View Submission" : "Submit Solution"}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
