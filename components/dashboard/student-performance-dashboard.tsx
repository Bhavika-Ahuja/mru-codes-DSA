"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Target, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsData {
  overview: {
    totalScore: number;
    quizzesTaken: number;
    totalSessions: number;
    avgScore: number;
    avgAccuracy: number;
    sectionRank: {
      rank: number;
      totalInSection: number;
    } | null;
  };
  topicPerformance: Record<string, { correct: number; total: number; score: number }>;
  difficultyPerformance: Record<string, { correct: number; total: number; score: number }>;
  performanceOverTime: Array<{
    date: string;
    score: number;
    accuracy: number;
    quizTitle: string;
    topic: string;
  }>;
  assignmentPerformance: Array<{
    assignmentTitle: string;
    topic: string;
    grade: number | null;
    maxPoints: number;
    percentage: number | null;
    submittedAt: string;
  }>;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

export function StudentPerformanceDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/analytics/student");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No performance data available</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const topicPerformanceData = Object.entries(data.topicPerformance).map(([topic, perf]) => ({
    topic,
    correct: perf.correct,
    total: perf.total,
    accuracy: perf.total > 0 ? (perf.correct / perf.total) * 100 : 0,
    score: perf.score,
  }));

  const difficultyPerformanceData = Object.entries(data.difficultyPerformance).map(
    ([difficulty, perf]) => ({
      difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      correct: perf.correct,
      total: perf.total,
      accuracy: perf.total > 0 ? (perf.correct / perf.total) * 100 : 0,
      score: perf.score,
    })
  );

  const performanceOverTime = data.performanceOverTime.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: item.score,
    accuracy: item.accuracy,
    quiz: item.quizTitle,
  }));

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Score</CardTitle>
            <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalScore}</div>
            <p className="text-xs text-muted-foreground mt-1">Keep learning!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.avgScore}</div>
            <p className="text-xs text-muted-foreground mt-1">Per session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <Target className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.avgAccuracy.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across all quizzes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {data.overview.sectionRank ? "Section Rank" : "Quizzes Taken"}
            </CardTitle>
            <Award className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {data.overview.sectionRank ? (
              <>
                <div className="text-2xl font-bold">
                  #{data.overview.sectionRank.rank}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {data.overview.sectionRank.totalInSection}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{data.overview.quizzesTaken}</div>
                <p className="text-xs text-muted-foreground mt-1">Total sessions</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance Over Time</TabsTrigger>
          <TabsTrigger value="topics">Topic Performance</TabsTrigger>
          <TabsTrigger value="difficulty">Difficulty Analysis</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          {performanceOverTime.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Performance Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={performanceOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="score"
                      stroke="#0088FE"
                      strokeWidth={2}
                      name="Score"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#00C49F"
                      strokeWidth={2}
                      name="Accuracy %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No performance data yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Join quizzes to see your performance over time
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          {topicPerformanceData.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Topic Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topicPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="topic" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="accuracy" fill="#FF8042" name="Accuracy %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Topic Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={topicPerformanceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ topic, total }) => `${topic}: ${total}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total"
                      >
                        {topicPerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No topic data available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Complete quizzes to see topic performance
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="difficulty" className="space-y-4">
          {difficultyPerformanceData.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Difficulty</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={difficultyPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="difficulty" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="accuracy" fill="#FFBB28" name="Accuracy %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Questions by Difficulty</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={difficultyPerformanceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ difficulty, total }) => `${difficulty}: ${total}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total"
                      >
                        {difficultyPerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No difficulty data available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Complete quizzes to see difficulty analysis
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          {data.assignmentPerformance.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Assignment Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.assignmentPerformance.map((assignment, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{assignment.assignmentTitle}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {assignment.topic}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Submitted: {new Date(assignment.submittedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        {assignment.grade !== null ? (
                          <>
                            <div className="text-2xl font-bold">
                              {assignment.grade}/{assignment.maxPoints}
                            </div>
                            <div
                              className={`text-sm font-medium ${
                                assignment.percentage && assignment.percentage >= 80
                                  ? "text-success"
                                  : assignment.percentage && assignment.percentage >= 60
                                  ? "text-warning"
                                  : "text-destructive"
                              }`}
                            >
                              {assignment.percentage?.toFixed(1)}%
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">Pending Grade</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No assignment data available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Submit assignments to see your grades here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
