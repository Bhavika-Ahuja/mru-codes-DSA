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
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Award, BarChart3, Download, FileSpreadsheet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface Student {
  id: string;
  fullName: string;
  email: string;
  rollNumber: string | null;
  section: string | null;
  avatarUrl: string | null;
  totalScore: number;
  quizzesTaken: number;
  metrics: {
    totalSessions: number;
    avgScore: number;
    avgAccuracy: number;
    topicPerformance: Record<string, { correct: number; total: number; score: number }>;
    difficultyPerformance: Record<string, { correct: number; total: number; score: number }>;
    recentSessions: Array<{
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
  };
}

interface AnalyticsData {
  students: Student[];
  sections: string[];
  sectionStats: Array<{
    section: string;
    avgScore: number;
    totalStudents: number;
    avgAccuracy: number;
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
  return `${entry.section || entry.difficulty || entry.topic}: ${entry.students || entry.total || entry.value || 0}`;
};

export function TeacherPerformanceDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");

  useEffect(() => {
    fetchAnalytics();
  }, [selectedSection, selectedStudent]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSection !== "all") {
        params.append("section", selectedSection);
      }
      if (selectedStudent !== "all") {
        params.append("studentId", selectedStudent);
      }

      const response = await fetch(`/api/analytics/teacher?${params.toString()}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: string = "all") => {
    try {
      const params = new URLSearchParams();
      if (selectedSection !== "all") {
        params.append("section", selectedSection);
      }
      if (selectedStudent !== "all") {
        params.append("studentId", selectedStudent);
      }
      params.append("type", type);

      const response = await fetch(`/api/analytics/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `analytics-report-${type}-${timestamp}.xlsx`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data. Please try again.");
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

  if (!data || data.students.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No student data available</p>
        </CardContent>
      </Card>
    );
  }

  const students = data.students;
  const selectedStudentData = selectedStudent !== "all"
    ? students.find((s) => s.id === selectedStudent)
    : null;

  // Prepare data for charts
  const sectionPerformance = data.sectionStats.map((stat) => ({
    section: stat.section,
    avgScore: stat.avgScore,
    avgAccuracy: stat.avgAccuracy,
    students: stat.totalStudents,
  }));

  const topStudents = students
    .slice(0, 10)
    .map((s) => ({
      name: s.fullName.split(" ")[0],
      score: s.totalScore,
      accuracy: s.metrics.avgAccuracy,
      sessions: s.metrics.totalSessions,
    }));

  // Get topic performance data
  const topicPerformanceData: Array<{
    topic: string;
    correct: number;
    total: number;
    accuracy: number;
  }> = [];

  students.forEach((student) => {
    Object.entries(student.metrics.topicPerformance).forEach(([topic, perf]) => {
      const existing = topicPerformanceData.find((t) => t.topic === topic);
      if (existing) {
        existing.correct += perf.correct;
        existing.total += perf.total;
      } else {
        topicPerformanceData.push({
          topic,
          correct: perf.correct,
          total: perf.total,
          accuracy: perf.total > 0 ? (perf.correct / perf.total) * 100 : 0,
        });
      }
    });
  });

  // Get difficulty performance data
  const difficultyPerformanceData: Array<{
    difficulty: string;
    correct: number;
    total: number;
    accuracy: number;
  }> = [];

  students.forEach((student) => {
    Object.entries(student.metrics.difficultyPerformance).forEach(([difficulty, perf]) => {
      const existing = difficultyPerformanceData.find((d) => d.difficulty === difficulty);
      if (existing) {
        existing.correct += perf.correct;
        existing.total += perf.total;
      } else {
        difficultyPerformanceData.push({
          difficulty,
          correct: perf.correct,
          total: perf.total,
          accuracy: perf.total > 0 ? (perf.correct / perf.total) * 100 : 0,
        });
      }
    });
  });

  // Student performance over time
  const performanceOverTime =
    selectedStudentData?.metrics.recentSessions.map((s) => ({
      date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: s.score,
      accuracy: s.accuracy,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Filters and Export */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4 flex-wrap">
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {data.sections.map((section) => (
                <SelectItem key={section} value={section}>
                  {section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedSection !== "all" && (
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => handleExport("all")}
            variant="outline"
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export All
          </Button>
          <Button
            onClick={() => handleExport("quizzes")}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export Quizzes
          </Button>
          <Button
            onClick={() => handleExport("assignments")}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export Assignments
          </Button>
          <Button
            onClick={() => handleExport("performance")}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export Performance
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.length > 0
                ? Math.round(
                    (students.reduce((sum, s) => sum + s.metrics.avgScore, 0) / students.length) *
                      100
                  ) / 100
                : 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.length > 0
                ? Math.round(
                    (students.reduce((sum, s) => sum + s.metrics.avgAccuracy, 0) / students.length) *
                      100
                  ) / 100
                : 0}
              %
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.reduce((sum, s) => sum + s.metrics.totalSessions, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="difficulty">Difficulty</TabsTrigger>
          {selectedStudentData && <TabsTrigger value="student">Student Detail</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Students by Score</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topStudents} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PRIMARY_COLOR} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={PRIMARY_COLOR} stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: "12px" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: "12px" }}
                      iconType="circle"
                    />
                    <Bar 
                      dataKey="score" 
                      fill={`url(#scoreGradient)`}
                      name="Total Score"
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top 10 Students by Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topStudents} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SUCCESS_COLOR} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={SUCCESS_COLOR} stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
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
                      fill={`url(#accuracyGradient)`}
                      name="Accuracy %"
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sections" className="space-y-4">
          {sectionPerformance.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Section Average Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sectionPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="sectionScoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={PRIMARY_COLOR} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={PRIMARY_COLOR} stopOpacity={0.5} />
                        </linearGradient>
                        <linearGradient id="sectionAccuracyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={SUCCESS_COLOR} stopOpacity={0.9} />
                          <stop offset="100%" stopColor={SUCCESS_COLOR} stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="section" 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: "12px" }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: "12px" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ fontSize: "12px" }}
                        iconType="circle"
                      />
                      <Bar 
                        dataKey="avgScore" 
                        fill={`url(#sectionScoreGradient)`}
                        name="Avg Score"
                        radius={[8, 8, 0, 0]}
                        animationDuration={800}
                      />
                      <Bar 
                        dataKey="avgAccuracy" 
                        fill={`url(#sectionAccuracyGradient)`}
                        name="Avg Accuracy %"
                        radius={[8, 8, 0, 0]}
                        animationDuration={800}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Students per Section</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sectionPerformance}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={CustomPieLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="students"
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {sectionPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No section data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          {topicPerformanceData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Topic Performance</CardTitle>
              </CardHeader>
              <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topicPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <defs>
                        <linearGradient id="topicGradient" x1="0" y1="0" x2="0" y2="1">
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
                      fill={`url(#topicGradient)`}
                      name="Accuracy %"
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No topic data available</p>
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
                        <linearGradient id="difficultyGradient" x1="0" y1="0" x2="0" y2="1">
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
                        fill={`url(#difficultyGradient)`}
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
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No difficulty data available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {selectedStudentData && (
          <TabsContent value="student" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedStudentData.fullName} - Performance Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  {performanceOverTime.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
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
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: "12px" }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          wrapperStyle={{ fontSize: "12px" }}
                          iconType="line"
                        />
                        <Line
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
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      No session data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Topic Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.entries(selectedStudentData.metrics.topicPerformance).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(selectedStudentData.metrics.topicPerformance).map(
                          ([topic, perf]) => ({
                            topic,
                            accuracy:
                              perf.total > 0 ? (perf.correct / perf.total) * 100 : 0,
                          })
                        )}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <defs>
                          <linearGradient id="studentTopicGradient" x1="0" y1="0" x2="0" y2="1">
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
                        <Bar 
                          dataKey="accuracy" 
                          fill={`url(#studentTopicGradient)`}
                          name="Accuracy %"
                          radius={[8, 8, 0, 0]}
                          animationDuration={800}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      No topic data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Assignment Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedStudentData.metrics.assignmentPerformance.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudentData.metrics.assignmentPerformance.map((assignment, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{assignment.assignmentTitle}</div>
                          <div className="text-sm text-muted-foreground">{assignment.topic}</div>
                        </div>
                        <div className="text-right">
                          {assignment.grade !== null ? (
                            <>
                              <div className="font-medium">
                                {assignment.grade}/{assignment.maxPoints}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {assignment.percentage?.toFixed(1)}%
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-muted-foreground">Pending</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    No assignment data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
