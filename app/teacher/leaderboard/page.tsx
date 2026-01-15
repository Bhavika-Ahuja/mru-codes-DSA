import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import prisma from "@/lib/prisma";
import { formatDepartmentSection } from "@/lib/departments";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function TeacherLeaderboardPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "teacher") {
    redirect("/student/dashboard");
  }

  // Fetch global leaderboard (all students)
  const leaderboard = await prisma.profile.findMany({
    where: { role: "student" },
    select: {
      id: true,
      fullName: true,
      rollNumber: true,
      department: true,
      section: true,
      avatarUrl: true,
      totalScore: true,
      quizzesTaken: true,
    },
    orderBy: { totalScore: "desc" },
    take: 50,
  });

  const studentsWithRank = leaderboard.map((s, idx) => ({ ...s, rank: idx + 1 }));
  const departments = [
    ...new Set(studentsWithRank.map((s) => s.department).filter(Boolean)),
  ].sort();

  const departmentSectionGroups = [
    ...new Set(
      studentsWithRank
        .map((s) => (s.department && s.section ? `${s.department}__${s.section}` : null))
        .filter(Boolean)
    ),
  ].sort();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-amber-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className="text-sm font-medium text-muted-foreground">
            #{rank}
          </span>
        );
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-amber-500/10 border-amber-500/20";
      case 2:
        return "bg-gray-400/10 border-gray-400/20";
      case 3:
        return "bg-amber-600/10 border-amber-600/20";
      default:
        return "bg-muted/50 border-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground">
            View top-performing students across all sections
          </p>
        </div>
        <Badge variant="outline" className="gap-2">
          <TrendingUp className="h-3.5 w-3.5" />
          Global Rankings
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Total Students</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{leaderboard.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Total Points Awarded</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {leaderboard.reduce((sum: number, s) => sum + s.totalScore, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Average Score</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {leaderboard.length > 0
                ? Math.round(
                    leaderboard.reduce((sum: number, s) => sum + s.totalScore, 0) /
                      leaderboard.length
                  )
                : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="global" className="space-y-4">
        <TabsList>
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="department">By Department</TabsTrigger>
          <TabsTrigger value="section">By Department • Section</TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>
                Students ranked by total points earned
              </CardDescription>
            </CardHeader>
            <CardContent>
              {studentsWithRank.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No rankings yet</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Students will appear here once they start participating in quizzes.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {studentsWithRank.map((student) => {
                    const rank = student.rank;
                    const initials = student.fullName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <div
                        key={student.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${getRankBg(
                          rank
                        )}`}
                      >
                        <div className="flex items-center justify-center w-12 h-12 shrink-0">
                          {getRankIcon(rank)}
                        </div>

                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage
                            src={student.avatarUrl || undefined}
                            alt={student.fullName}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {initials}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{student.fullName}</h3>
                            {student.rollNumber && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {student.rollNumber}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {(student.department || student.section) && (
                              <span>{formatDepartmentSection(student.department, student.section)}</span>
                            )}
                            <span>Quizzes: {student.quizzesTaken}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-2xl font-bold">{student.totalScore}</p>
                          <p className="text-xs text-muted-foreground">points</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="department" className="space-y-6">
          {departments.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                No department data available.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {departments.map((dept) => {
                const deptStudents = studentsWithRank
                  .filter((s) => s.department === dept)
                  .map((s, i) => ({ ...s, deptRank: i + 1 }));
                return (
                  <Card key={dept} className="border-border/50">
                    <CardHeader>
                      <CardTitle>{dept}</CardTitle>
                      <CardDescription>
                        Top students in {dept} (showing up to 10)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {deptStudents.slice(0, 10).map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge variant="outline" className="shrink-0">
                              #{student.deptRank}
                            </Badge>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{student.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDepartmentSection(student.department, student.section)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-primary">{student.totalScore}</p>
                            <p className="text-xs text-muted-foreground">points</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="section" className="space-y-6">
          {departmentSectionGroups.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                No section data available.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {departmentSectionGroups.map((key) => {
                const [dept, sec] = String(key).split("__");
                const groupStudents = studentsWithRank
                  .filter((s) => s.department === dept && s.section === sec)
                  .map((s, i) => ({ ...s, groupRank: i + 1 }));

                return (
                  <Card key={key} className="border-border/50">
                    <CardHeader>
                      <CardTitle>{dept} • Section {sec}</CardTitle>
                      <CardDescription>
                        Top students in this section (showing up to 10)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {groupStudents.slice(0, 10).map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Badge variant="outline" className="shrink-0">
                              #{student.groupRank}
                            </Badge>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{student.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDepartmentSection(student.department, student.section)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-primary">{student.totalScore}</p>
                            <p className="text-xs text-muted-foreground">points</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

