import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  FileText,
  Calendar,
  Users,
  ArrowLeft,
  Edit,
  ExternalLink,
  CheckCircle2,
  Clock,
  FileX,
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
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "teacher") {
    redirect("/student/dashboard");
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          fullName: true,
          email: true,
        },
      },
      _count: {
        select: {
          submissions: true,
        },
      },
    },
  });

  if (!assignment) {
    redirect("/teacher/assignments");
  }

  if (assignment.createdById !== profile.id) {
    redirect("/teacher/assignments");
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/teacher/assignments">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              {assignment.title}
            </h1>
            <p className="text-muted-foreground mt-1">Assignment Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(assignment.status)}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Assignment Info */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Information</CardTitle>
            <CardDescription>View and manage assignment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Title</p>
                <p className="text-base">{assignment.title}</p>
              </div>

              {assignment.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Description
                  </p>
                  <p className="text-base whitespace-pre-wrap">
                    {assignment.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {assignment.topic && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Topic
                    </p>
                    <Badge variant="outline">{assignment.topic}</Badge>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Difficulty
                  </p>
                  <Badge variant="outline" className="capitalize">
                    {assignment.difficulty}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Maximum Points
                  </p>
                  <p className="text-base">{assignment.maxPoints} points</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due Date
                  </p>
                  <p className="text-base">{formatDate(assignment.dueDate)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Assignment PDF
                </p>
                {assignment.pdfUrl ? (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={assignment.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {assignment.pdfFileName || "View PDF"}
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">No PDF uploaded</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  {assignment._count.submissions} submission
                  {assignment._count.submissions !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          {assignment.status === "published" && (
            <Button asChild className="flex-1">
              <Link href={`/teacher/assignments/${assignment.id}/submissions`}>
                <Users className="h-4 w-4 mr-2" />
                View Submissions ({assignment._count.submissions})
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
