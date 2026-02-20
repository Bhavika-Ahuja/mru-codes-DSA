import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { BookOpen, FileText, Video, Presentation, Download, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ContentViewer } from "@/components/learning/content-viewer";
import { ProgressTracker } from "@/components/learning/progress-tracker";
import { CourseContentClient } from "@/components/learning/course-content-client";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "student") {
    redirect("/teacher/dashboard");
  }

  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      content: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!course || course.status !== "published") {
    redirect("/student/learn");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/student/learn">
          <Button variant="ghost" size="sm">
            ← Back to Courses
          </Button>
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{course.icon || "📚"}</span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              {course.title}
            </h1>
            {course.description && (
              <p className="text-muted-foreground mt-1">{course.description}</p>
            )}
          </div>
        </div>
      </div>

      {course.content.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No content available for this course yet. Check back soon!
            </p>
          </CardContent>
        </Card>
      ) : (
        <CourseContentClient courseId={course.id} content={course.content} />
      )}
    </div>
  );
}
