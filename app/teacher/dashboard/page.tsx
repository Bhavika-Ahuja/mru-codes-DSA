import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Zap,
  FileText,
  PlusCircle,
  BarChart3,
  Clock,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { getProfile } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherPerformanceDashboard } from "@/components/dashboard/teacher-performance-dashboard";

export default async function TeacherDashboardPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "teacher") {
    redirect("/student/dashboard");
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-primary mb-2">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-medium">Teacher Dashboard</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Welcome back, {profile.fullName.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Create quizzes, manage live sessions, and track your students&apos;
            progress all in one place.
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Student Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Quizzes
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">0</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first quiz
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Sessions
                </CardTitle>
                <div className="p-2 bg-success/10 rounded-lg">
                  <Clock className="h-4 w-4 text-success" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">0</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No live sessions
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Students
                </CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">0</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all sections
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg. Score
                </CardTitle>
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">--</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No data yet
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2 group-hover:bg-primary/20 transition-colors">
                    <PlusCircle className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Create Quiz</CardTitle>
                  <CardDescription>
                    Design a new quiz with AI-generated or custom questions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/teacher/quizzes/create">
                    <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                      Create Now
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <div className="p-3 bg-success/10 rounded-xl w-fit mb-2 group-hover:bg-success/20 transition-colors">
                    <Zap className="h-6 w-6 text-success" />
                  </div>
                  <CardTitle className="text-lg">Start Live Session</CardTitle>
                  <CardDescription>
                    Host a real-time quiz session for your students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/teacher/quizzes">
                    <Button variant="outline" className="w-full">
                      View Quizzes
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <div className="p-3 bg-blue-500/10 rounded-xl w-fit mb-2 group-hover:bg-blue-500/20 transition-colors">
                    <BarChart3 className="h-6 w-6 text-blue-500" />
                  </div>
                  <CardTitle className="text-lg">View Analytics</CardTitle>
                  <CardDescription>
                    Track student performance and identify areas for improvement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/teacher/performance">
                    <Button variant="outline" className="w-full">
                      View Reports
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Activity Placeholder */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Recent Quizzes
              </CardTitle>
              <CardDescription>Your recently created quizzes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No quizzes yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Create your first quiz to start engaging your students with
                  interactive learning.
                </p>
                <Link href="/teacher/quizzes/create">
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Your First Quiz
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Student Performance Analytics</h2>
                <p className="text-sm text-muted-foreground">
                  Track student performance across all metrics, sections, and individuals
                </p>
              </div>
            </div>
            <TeacherPerformanceDashboard />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
