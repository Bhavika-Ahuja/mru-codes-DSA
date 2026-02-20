import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/supabase/server";
import { BookOpen, ChevronRight, Clock, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import prisma from "@/lib/prisma";

export default async function StudentLearnPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "student") {
    redirect("/teacher/dashboard");
  }

  // Fetch published courses from database
  const allCourses = await prisma.course.findMany({
    where: {
      status: "published",
    },
    include: {
      _count: {
        select: { content: true },
      },
      content: {
        select: { id: true },
      },
    },
    orderBy: { orderIndex: "asc" },
  });

  // Filter to only show courses that have content available
  const courses = allCourses.filter((course) => course._count.content > 0);

  // Get student progress for all courses
  const courseIds = courses.map((c) => c.id);
  const allContentIds = courses.flatMap((c) => c.content.map((item) => item.id));

  // Only fetch progress if there are content items
  let progressRecords: Array<{ contentId: string; isCompleted: boolean }> = [];
  if (allContentIds.length > 0) {
    try {
      progressRecords = await prisma.contentProgress.findMany({
        where: {
          studentId: profile.id,
          contentId: { in: allContentIds },
        },
        select: {
          contentId: true,
          isCompleted: true,
        },
      });
    } catch (error) {
      // If the table doesn't exist yet, progress will be empty
      console.warn("Progress tracking not available yet:", error);
      progressRecords = [];
    }
  }

  // Create progress map
  const progressMap = new Map(
    progressRecords.map((p) => [p.contentId, p.isCompleted])
  );

  // Calculate progress for each course
  const coursesWithProgress = courses.map((course) => {
    const courseContentIds = course.content.map((c) => c.id);
    const completed = courseContentIds.filter(
      (id) => progressMap.get(id) === true
    ).length;
    const total = courseContentIds.length;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    return {
      ...course,
      progress,
      completed,
      total,
    };
  });

  // Calculate total lessons and completed across all courses
  const totalLessons = courses.reduce((acc, c) => acc + c._count.content, 0);
  const totalCompleted = progressRecords.filter((p) => p.isCompleted).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          Learn DSA
        </h1>
        <p className="text-muted-foreground mt-1">
          Explore structured courseware from basics to advanced topics
        </p>
      </div>

      {/* Progress Overview */}
      {totalLessons > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress
                value={totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0}
                className="flex-1 h-3"
              />
              <span className="text-sm font-medium">
                {totalCompleted} / {totalLessons} lessons
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No courses available yet. Check back soon!
          </div>
        ) : (
          coursesWithProgress.map((course) => {
            const lessons = course.total;
            const completed = course.completed;
            const progress = course.progress;
            const isCompleted = progress === 100 && lessons > 0;
            const isStarted = progress > 0;
            const hasContent = lessons > 0;

            return (
              <Link key={course.id} href={`/student/learn/${course.slug}`}>
                <Card className="h-full transition-all hover:shadow-md hover:-translate-y-1 cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <span className="text-4xl">{course.icon || "📚"}</span>
                      {isCompleted ? (
                        <Badge variant="default" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </Badge>
                      ) : isStarted ? (
                        <Badge variant="secondary">{Math.round(progress)}%</Badge>
                      ) : hasContent ? (
                        <Badge variant="outline">Not started</Badge>
                      ) : (
                        <Badge variant="outline">No content</Badge>
                      )}
                    </div>
                    <CardTitle className="mt-4 group-hover:text-primary transition-colors">
                      {course.title}
                    </CardTitle>
                    <CardDescription>
                      {course.description || "Explore learning materials"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {hasContent && <Progress value={progress} className="h-2" />}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {lessons} {lessons === 1 ? "lesson" : "lessons"}
                        </span>
                        <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                          {hasContent ? "Continue" : "Coming soon"}
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

