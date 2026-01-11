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

// Theme-aware colors with gradients
const PRIMARY_COLOR = "#7c3aed";
const PRIMARY_LIGHT = "#a78bfa";
const SUCCESS_COLOR = "#16a34a";
const SUCCESS_LIGHT = "#22c55e";
const WARNING_COLOR = "#ca8a04";
const WARNING_LIGHT = "#eab308";
const INFO_COLOR = "#2563eb";
const INFO_LIGHT = "#3b82f6";
const DANGER_COLOR = "#dc2626";
const DANGER_LIGHT = "#ef4444";

const COLORS = [
  PRIMARY_COLOR,
  SUCCESS_COLOR,
  INFO_COLOR,
  WARNING_COLOR,
  DANGER_COLOR,
  PRIMARY_LIGHT,
  SUCCESS_LIGHT,
  INFO_LIGHT,
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="font-semibold mb-2 text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            <span className="font-medium">{entry.name}:</span>{" "}
            {typeof entry.value === "number"
              ? entry.name.includes("%") || entry.name.includes("Accuracy")
                ? `${entry.value.toFixed(1)}%`
                : entry.value.toFixed(0)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom label component for pie charts
const CustomPieLabel = (entry: any) => {
  return `${entry.topic || entry.difficulty}: ${entry.total || entry.value || 0}`;
};

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
                  <LineChart data={performanceOverTime} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="scoreLineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PRIMARY_COLOR} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={PRIMARY_COLOR} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="accuracyLineGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SUCCESS_COLOR} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={SUCCESS_COLOR} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: "12px" }}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: "12px" }}
                      iconType="line"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="score"
                      stroke={PRIMARY_COLOR}
                      strokeWidth={3}
                      dot={{ fill: PRIMARY_COLOR, r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Score"
                      animationDuration={800}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="accuracy"
                      stroke={SUCCESS_COLOR}
                      strokeWidth={3}
                      dot={{ fill: SUCCESS_COLOR, r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Accuracy %"
                      animationDuration={800}
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
                    <BarChart data={topicPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <defs>
                        <linearGradient id="topicAccuracyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={WARNING_COLOR} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={WARNING_COLOR} stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="topic" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: "12px" }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: "12px" }}
                        domain={[0, 100]}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ fontSize: "12px" }}
                        iconType="circle"
                      />
                      <Bar 
                        dataKey="accuracy" 
                        fill={`url(#topicAccuracyGradient)`}
                        name="Accuracy %"
                        radius={[8, 8, 0, 0]}
                        animationDuration={800}
                      />
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
                        label={CustomPieLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="total"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {topicPerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ fontSize: "12px" }}
                        iconType="circle"
                      />
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
                    <BarChart data={difficultyPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="difficultyAccuracyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={WARNING_COLOR} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={WARNING_COLOR} stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="difficulty" 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: "12px" }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: "12px" }}
                        domain={[0, 100]}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ fontSize: "12px" }}
                        iconType="circle"
                      />
                      <Bar 
                        dataKey="accuracy" 
                        fill={`url(#difficultyAccuracyGradient)`}
                        name="Accuracy %"
                        radius={[8, 8, 0, 0]}
                        animationDuration={800}
                      />
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
                        label={CustomPieLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="total"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {difficultyPerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ fontSize: "12px" }}
                        iconType="circle"
                      />
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
