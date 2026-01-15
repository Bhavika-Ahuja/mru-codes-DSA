"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartTooltip } from "@/components/ui/chart";
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

// Enhanced custom tooltip component
type TooltipEntry = {
  name?: string;
  value?: number | string;
  color?: string;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-xl shadow-2xl p-4 backdrop-blur-sm">
        <p className="font-bold mb-3 text-foreground text-base border-b border-border pb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-medium text-muted-foreground">{entry.name}:</span>
              <span className="text-sm font-bold" style={{ color: entry.color }}>
                {typeof entry.value === "number"
                  ? entry.name.includes("%") || entry.name.includes("Accuracy")
                    ? `${entry.value.toFixed(1)}%`
                    : entry.value.toFixed(0)
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Custom label component for pie charts
type PieLabelEntry = {
  topic?: string;
  difficulty?: string;
  total?: number;
  value?: number;
};

const CustomPieLabel = (entry: PieLabelEntry) =>
  `${entry.topic || entry.difficulty}: ${entry.total ?? entry.value ?? 0}`;

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
      {/* Overview Stats with Enhanced Design */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 border-amber-500/20 bg-linear-to-br from-amber-500/5 to-transparent hover:border-amber-500/40 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Score</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-linear-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent">
              {data.overview.totalScore}
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Keep learning!
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/20 bg-linear-to-br from-primary/5 to-transparent hover:border-primary/40 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {data.overview.avgScore.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Per session</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-500/20 bg-linear-to-br from-green-500/5 to-transparent hover:border-green-500/40 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Target className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-linear-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
              {data.overview.avgAccuracy.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">Across all quizzes</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500/20 bg-linear-to-br from-blue-500/5 to-transparent hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {data.overview.sectionRank ? "Section Rank" : "Quizzes Taken"}
            </CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Award className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            {data.overview.sectionRank ? (
              <>
                <div className="text-3xl font-bold bg-linear-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  #{data.overview.sectionRank.rank}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  of {data.overview.sectionRank.totalInSection} students
                </p>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold bg-linear-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  {data.overview.quizzesTaken}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Total sessions</p>
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
            <Card className="border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Performance Over Time
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Track your progress across all quiz sessions
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[450px]">
                  <AreaChart data={performanceOverTime} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PRIMARY_COLOR} stopOpacity={0.4} />
                        <stop offset="50%" stopColor={PRIMARY_COLOR} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={PRIMARY_COLOR} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="accuracyAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SUCCESS_COLOR} stopOpacity={0.4} />
                        <stop offset="50%" stopColor={SUCCESS_COLOR} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={SUCCESS_COLOR} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: "hsl(var(--foreground))" }}
                      style={{ fontSize: "12px", fontWeight: 500 }}
                      tickLine={{ stroke: "hsl(var(--foreground))" }}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: "hsl(var(--foreground))" }}
                      style={{ fontSize: "12px", fontWeight: 500 }}
                      tickLine={{ stroke: "hsl(var(--foreground))" }}
                      label={{ value: "Score", angle: -90, position: "insideLeft", style: { fontSize: "12px", fill: "hsl(var(--foreground))" } }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: "hsl(var(--foreground))" }}
                      style={{ fontSize: "12px", fontWeight: 500 }}
                      tickLine={{ stroke: "hsl(var(--foreground))" }}
                      domain={[0, 100]}
                      label={{ value: "Accuracy %", angle: 90, position: "insideRight", style: { fontSize: "12px", fill: "hsl(var(--foreground))" } }}
                    />
                    <ChartTooltip content={<CustomTooltip />} />
                    <ChartLegend 
                      wrapperStyle={{ fontSize: "13px", fontWeight: 500, paddingTop: "20px", color: "hsl(var(--foreground))" }}
                      iconType="line"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="score"
                      stroke={PRIMARY_COLOR}
                      strokeWidth={3}
                      fill="url(#scoreAreaGradient)"
                      name="Score"
                      animationDuration={1000}
                      dot={{ fill: PRIMARY_COLOR, r: 5, strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="accuracy"
                      stroke={SUCCESS_COLOR}
                      strokeWidth={3}
                      fill="url(#accuracyAreaGradient)"
                      name="Accuracy %"
                      animationDuration={1000}
                      dot={{ fill: SUCCESS_COLOR, r: 5, strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground mb-2">No performance data yet</p>
                <p className="text-sm text-muted-foreground">
                  Join quizzes to see your performance over time
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          {topicPerformanceData.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-2 border-warning/10 hover:border-warning/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Target className="h-5 w-5 text-warning" />
                    Topic Accuracy
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your accuracy percentage by topic
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-[350px]">
                    <BarChart data={topicPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <defs>
                        <linearGradient id="topicAccuracyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={WARNING_COLOR} stopOpacity={1} />
                          <stop offset="50%" stopColor={WARNING_LIGHT} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={WARNING_COLOR} stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis 
                        dataKey="topic" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        stroke="hsl(var(--foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                        style={{ fontSize: "12px", fontWeight: 500 }}
                        tickLine={{ stroke: "hsl(var(--foreground))" }}
                      />
                      <YAxis 
                        stroke="hsl(var(--foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                        style={{ fontSize: "12px", fontWeight: 500 }}
                        domain={[0, 100]}
                        tickLine={{ stroke: "hsl(var(--foreground))" }}
                        label={{ value: "Accuracy %", angle: -90, position: "insideLeft", style: { fontSize: "12px", fill: "hsl(var(--foreground))" } }}
                      />
                      <ChartTooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="accuracy" 
                        fill={`url(#topicAccuracyGradient)`}
                        name="Accuracy %"
                        radius={[12, 12, 0, 0]}
                        animationDuration={1200}
                        animationBegin={0}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Questions by Topic
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Distribution of questions answered
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-[350px]">
                    <PieChart>
                      <Pie
                        data={topicPerformanceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: { total: number; topic: string }) => {
                          const percent = (
                            (entry.total / topicPerformanceData.reduce((sum, t) => sum + t.total, 0)) *
                            100
                          ).toFixed(0);
                          return {
                            value: `${entry.topic}: ${percent}%`,
                            fill: "hsl(var(--foreground))",
                            fontSize: 12,
                            fontWeight: 500,
                          };
                        }}
                        outerRadius={120}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="total"
                        animationBegin={0}
                        animationDuration={1200}
                        paddingAngle={2}
                      >
                        {topicPerformanceData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={<CustomTooltip />}
                        formatter={(value: number, name: string) => {
                          if (name === "total") {
                            const percent = ((value / topicPerformanceData.reduce((sum, t) => sum + t.total, 0)) * 100).toFixed(1);
                            return [`${value} questions (${percent}%)`, "Total"];
                          }
                          return [value, name];
                        }}
                      />
                      <ChartLegend
                        wrapperStyle={{ fontSize: "13px", fontWeight: 500, paddingTop: "20px", color: "hsl(var(--foreground))" }}
                        iconType="circle"
                      />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground mb-2">No topic data available</p>
                <p className="text-sm text-muted-foreground">
                  Complete quizzes to see topic performance
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="difficulty" className="space-y-4">
          {difficultyPerformanceData.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-2 border-info/10 hover:border-info/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Target className="h-5 w-5 text-info" />
                    Performance by Difficulty
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    How well you perform at each difficulty level
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-[350px]">
                    <BarChart data={difficultyPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="difficultyAccuracyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={INFO_COLOR} stopOpacity={1} />
                          <stop offset="50%" stopColor={INFO_LIGHT} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={INFO_COLOR} stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis 
                        dataKey="difficulty" 
                        stroke="hsl(var(--foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                        style={{ fontSize: "12px", fontWeight: 500 }}
                        tickLine={{ stroke: "hsl(var(--foreground))" }}
                      />
                      <YAxis 
                        stroke="hsl(var(--foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                        style={{ fontSize: "12px", fontWeight: 500 }}
                        domain={[0, 100]}
                        tickLine={{ stroke: "hsl(var(--foreground))" }}
                        label={{ value: "Accuracy %", angle: -90, position: "insideLeft", style: { fontSize: "12px", fill: "hsl(var(--foreground))" } }}
                      />
                      <ChartTooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="accuracy" 
                        fill={`url(#difficultyAccuracyGradient)`}
                        name="Accuracy %"
                        radius={[12, 12, 0, 0]}
                        animationDuration={1200}
                        animationBegin={0}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Questions by Difficulty
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Distribution of questions by difficulty level
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-[350px]">
                    <PieChart>
                      <Pie
                        data={difficultyPerformanceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: { total: number; difficulty: string }) => {
                          const percent = (
                            (entry.total / difficultyPerformanceData.reduce((sum, d) => sum + d.total, 0)) *
                            100
                          ).toFixed(0);
                          return {
                            value: `${entry.difficulty}: ${percent}%`,
                            fill: "hsl(var(--foreground))",
                            fontSize: 12,
                            fontWeight: 500,
                          };
                        }}
                        outerRadius={120}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="total"
                        animationBegin={0}
                        animationDuration={1200}
                        paddingAngle={2}
                      >
                        {difficultyPerformanceData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={<CustomTooltip />}
                        formatter={(value: number, name: string) => {
                          if (name === "total") {
                            const percent = ((value / difficultyPerformanceData.reduce((sum, d) => sum + d.total, 0)) * 100).toFixed(1);
                            return [`${value} questions (${percent}%)`, "Total"];
                          }
                          return [value, name];
                        }}
                      />
                      <ChartLegend
                        wrapperStyle={{ fontSize: "13px", fontWeight: 500, paddingTop: "20px" }}
                        iconType="circle"
                      />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground mb-2">No difficulty data available</p>
                <p className="text-sm text-muted-foreground">
                  Complete quizzes to see difficulty analysis
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          {data.assignmentPerformance.length > 0 ? (
            <Card className="border-2 border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Assignment Performance
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Your grades and performance on submitted assignments
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.assignmentPerformance.map((assignment, idx) => {
                    const percentage = assignment.percentage || 0;
                    const gradeColor = percentage >= 80 ? "text-green-600" : percentage >= 60 ? "text-yellow-600" : "text-red-600";
                    const bgColor = percentage >= 80 ? "bg-green-500/10 border-green-500/20" : percentage >= 60 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20";
                    
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-5 border-2 rounded-xl hover:shadow-lg transition-all duration-300 ${bgColor}`}
                      >
                        <div className="flex-1">
                          <div className="font-bold text-base mb-1">{assignment.assignmentTitle}</div>
                          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-medium">
                              {assignment.topic}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Submitted: {new Date(assignment.submittedAt).toLocaleDateString("en-US", { 
                              month: "short", 
                              day: "numeric", 
                              year: "numeric" 
                            })}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          {assignment.grade !== null ? (
                            <>
                              <div className={`text-3xl font-bold ${gradeColor} mb-1`}>
                                {assignment.grade}/{assignment.maxPoints}
                              </div>
                              <div className={`text-base font-semibold ${gradeColor}`}>
                                {assignment.percentage?.toFixed(1)}%
                              </div>
                              <div className="mt-2">
                                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${
                                      percentage >= 80 ? "bg-green-500" : 
                                      percentage >= 60 ? "bg-yellow-500" : 
                                      "bg-red-500"
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
                              Pending Grade
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Award className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground mb-2">No assignment data available</p>
                <p className="text-sm text-muted-foreground">
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
