import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Trophy,
  Zap,
  TrendingUp,
  Target,
  Flame,
  Medal,
  ArrowRight,
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentPerformanceDashboard } from "@/components/dashboard/student-performance-dashboard";

export default async function StudentDashboardPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "student") {
    redirect("/teacher/dashboard");
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Flame className="h-5 w-5" />
              <span className="text-sm font-medium">Student Dashboard</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              Hey, {profile.fullName.split(" ")[0]}! 👋
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Continue your learning journey. Join quizzes, track progress, and
              climb the leaderboard.
            </p>
          </div>
          <Link href="/student/quiz/join">
            <Button size="lg" className="gap-2 shadow-lg shadow-primary/20">
              <Zap className="h-5 w-5" />
              Join Live Quiz
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">My Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Points
                </CardTitle>
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{profile.totalScore}</p>
                <p className="text-xs text-muted-foreground mt-1">Keep learning!</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quizzes Taken
                </CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{profile.quizzesTaken}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {profile.quizzesTaken === 0 ? "Join your first!" : "Great work!"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Topics Completed
                </CardTitle>
                <div className="p-2 bg-success/10 rounded-lg">
                  <BookOpen className="h-4 w-4 text-success" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">0</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start learning
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Section Rank
                </CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">--</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {profile.section || "No section"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-xl w-fit mb-2 group-hover:bg-primary/20 transition-colors">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Join Live Quiz</CardTitle>
                <CardDescription>
                  Enter a room code to join a quiz session
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/student/quiz/join">
                  <Button className="w-full">
                    Join Now
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
              <CardHeader>
                <div className="p-3 bg-success/10 rounded-xl w-fit mb-2 group-hover:bg-success/20 transition-colors">
                  <BookOpen className="h-6 w-6 text-success" />
                </div>
                <CardTitle className="text-lg">Continue Learning</CardTitle>
                <CardDescription>
                  Pick up where you left off with DSA topics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/student/learn">
                  <Button variant="outline" className="w-full">
                    View Topics
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
              <CardHeader>
                <div className="p-3 bg-amber-500/10 rounded-xl w-fit mb-2 group-hover:bg-amber-500/20 transition-colors">
                  <Medal className="h-6 w-6 text-amber-500" />
                </div>
                <CardTitle className="text-lg">Leaderboard</CardTitle>
                <CardDescription>
                  See how you rank against your classmates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/student/leaderboard">
                  <Button variant="outline" className="w-full">
                    View Rankings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Learning Progress */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Learning Progress
                  </CardTitle>
                  <CardDescription>
                    Track your progress across DSA topics
                  </CardDescription>
                </div>
                <Link href="/student/learn">
                  <Button variant="ghost" size="sm" className="gap-1">
                    View All
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Arrays & Strings</span>
                  <span className="text-muted-foreground">0%</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Linked Lists</span>
                  <span className="text-muted-foreground">0%</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Trees & Graphs</span>
                  <span className="text-muted-foreground">0%</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Dynamic Programming</span>
                  <span className="text-muted-foreground">0%</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent quiz participations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No activity yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Join a live quiz to see your activity here. Your quiz history and
                  scores will appear here.
                </p>
                <Link href="/student/quiz/join">
                  <Button>
                    <Zap className="h-4 w-4 mr-2" />
                    Join Your First Quiz
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
                <h2 className="text-lg font-semibold">My Performance Analytics</h2>
                <p className="text-sm text-muted-foreground">
                  Track your performance with detailed charts and graphs
                </p>
              </div>
            </div>
            <StudentPerformanceDashboard />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
