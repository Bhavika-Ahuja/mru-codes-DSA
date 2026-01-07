import { createClient } from "@/lib/supabase/server";
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

async function getLeaderboard() {
  const supabase = await createClient();

  const { data: students, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, section, total_points")
    .eq("role", "student")
    .order("total_points", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }

  return students.map((student, index) => ({
    ...student,
    rank: index + 1,
  }));
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

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();

  // Group by section
  const sections = [...new Set(leaderboard.map((s) => s.section).filter(Boolean))];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground mt-1">
          See how you rank against your classmates
        </p>
      </div>

      <Tabs defaultValue="global" className="space-y-6">
        <TabsList>
          <TabsTrigger value="global">Global Rankings</TabsTrigger>
          <TabsTrigger value="section">By Section</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          {/* Top 3 Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {leaderboard.slice(0, 3).map((student) => (
              <Card
                key={student.id}
                className={`relative overflow-hidden ${student.rank === 1 ? "border-yellow-500/50" : ""
                  }`}
              >
                {student.rank === 1 && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-yellow-500 via-yellow-400 to-yellow-500" />
                )}
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative">
                      <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                        <AvatarImage src={student.avatar_url || undefined} />
                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                          {student.full_name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -top-2 -right-2 h-8 w-8 rounded-full flex items-center justify-center ${student.rank === 1
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
                      {student.full_name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {student.section}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-2xl font-bold text-primary">
                      <TrendingUp className="h-5 w-5" />
                      {student.total_points.toLocaleString()}
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
                {leaderboard.map((student) => (
                  <div
                    key={student.id}
                    className={`flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-muted/50 ${student.rank <= 3 ? getRankBadge(student.rank) : ""
                      }`}
                  >
                    <div className="w-8 text-center font-bold text-muted-foreground">
                      {getRankIcon(student.rank) || `#${student.rank}`}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {student.full_name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{student.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.section}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {student.total_points.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="section" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Section Rankings</CardTitle>
              <CardDescription>
                Compare performance across sections
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No section data available
                </p>
              ) : (
                <div className="space-y-8">
                  {sections.map((section) => {
                    const sectionStudents = leaderboard
                      .filter((s) => s.section === section)
                      .map((s, i) => ({ ...s, sectionRank: i + 1 }));

                    return (
                      <div key={section}>
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="outline">{section}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {sectionStudents.length} students
                          </span>
                        </div>
                        <div className="space-y-2">
                          {sectionStudents.slice(0, 10).map((student) => (
                            <div
                              key={student.id}
                              className={`flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 ${student.sectionRank <= 3
                                ? getRankBadge(student.sectionRank)
                                : ""
                                }`}
                            >
                              <div className="w-8 text-center font-bold text-muted-foreground">
                                {getRankIcon(student.sectionRank) ||
                                  `#${student.sectionRank}`}
                              </div>
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={student.avatar_url || undefined}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {student.full_name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {student.full_name}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-primary">
                                  {student.total_points.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

