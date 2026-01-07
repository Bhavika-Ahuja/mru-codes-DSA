import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { Trophy, Medal, Crown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import prisma from "@/lib/prisma";

async function getLeaderboard() {
  return await prisma.profile.findMany({
    where: { role: "student" },
    select: {
      id: true,
      fullName: true,
      rollNumber: true,
      section: true,
      avatarUrl: true,
      totalScore: true,
    },
    orderBy: { totalScore: "desc" },
    take: 50,
  });
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return null;
  }
}

function getRankBadge(rank: number) {
  if (rank === 1) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  if (rank === 2) return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  if (rank === 3) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "";
}

export default async function StudentLeaderboardPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "student") {
    redirect("/teacher/dashboard");
  }

  const leaderboard = await getLeaderboard();
  const studentsWithRank = leaderboard.map((student, index) => ({
    ...student,
    rank: index + 1,
  }));

  // Group by section
  const sections = [...new Set(leaderboard.map((s) => s.section).filter(Boolean))];

  // Find current student's rank
  const currentStudentRank = studentsWithRank.findIndex(
    (s) => s.id === profile.id
  ) + 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground mt-1">
          See how you rank against your classmates
          {currentStudentRank > 0 && (
            <span className="ml-2 font-medium text-primary">
              (You&apos;re #{currentStudentRank})
            </span>
          )}
        </p>
      </div>

      <Tabs defaultValue="global" className="space-y-6">
        <TabsList>
          <TabsTrigger value="global">Global Rankings</TabsTrigger>
          {profile.section && (
            <TabsTrigger value="section">Section: {profile.section}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          {/* Top 3 Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {studentsWithRank.slice(0, 3).map((student) => (
              <Card
                key={student.id}
                className={`relative overflow-hidden ${
                  student.rank === 1 ? "border-yellow-500/50" : ""
                } ${student.id === profile.id ? "ring-2 ring-primary" : ""}`}
              >
                {student.rank === 1 && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500" />
                )}
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative">
                      <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                        <AvatarImage src={student.avatarUrl || undefined} />
                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                          {student.fullName
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -top-2 -right-2 h-8 w-8 rounded-full flex items-center justify-center ${
                          student.rank === 1
                            ? "bg-yellow-500"
                            : student.rank === 2
                            ? "bg-gray-400"
                            : "bg-amber-600"
                        } text-white font-bold text-sm`}
                      >
                        {student.rank}
                      </div>
                    </div>
                    <h3 className="mt-4 font-semibold text-lg">
                      {student.fullName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {student.section}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-2xl font-bold text-primary">
                      <TrendingUp className="h-5 w-5" />
                      {student.totalScore.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Full Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>All Rankings</CardTitle>
              <CardDescription>
                Top 50 students by total points
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {studentsWithRank.map((student) => (
                  <div
                    key={student.id}
                    className={`flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-muted/50 ${
                      student.rank <= 3 ? getRankBadge(student.rank) : ""
                    } ${student.id === profile.id ? "ring-2 ring-primary bg-primary/5" : ""}`}
                  >
                    <div className="w-8 text-center font-bold text-muted-foreground">
                      {getRankIcon(student.rank) || `#${student.rank}`}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {student.fullName
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{student.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.section}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {student.totalScore.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {profile.section && (
          <TabsContent value="section" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Section Rankings</CardTitle>
                <CardDescription>
                  Rankings for section: {profile.section}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const sectionStudents = studentsWithRank
                    .filter((s) => s.section === profile.section)
                    .map((s, i) => ({ ...s, sectionRank: i + 1 }));

                  if (sectionStudents.length === 0) {
                    return (
                      <p className="text-center text-muted-foreground py-8">
                        No students in your section yet
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {sectionStudents.map((student) => (
                        <div
                          key={student.id}
                          className={`flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 ${
                            student.sectionRank <= 3
                              ? getRankBadge(student.sectionRank)
                              : ""
                          } ${student.id === profile.id ? "ring-2 ring-primary bg-primary/5" : ""}`}
                        >
                          <div className="w-8 text-center font-bold text-muted-foreground">
                            {getRankIcon(student.sectionRank) ||
                              `#${student.sectionRank}`}
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={student.avatarUrl || undefined}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {student.fullName
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {student.fullName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {student.totalScore.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

