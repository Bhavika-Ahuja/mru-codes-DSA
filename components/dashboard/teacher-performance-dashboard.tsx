"use client";

import { useEffect, useState, useCallback } from "react";
import {
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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartTooltip } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Award, BarChart3, Download, FileSpreadsheet, Trophy, Target, FileQuestion, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Student {
  id: string;
  fullName: string;
  email: string;
  rollNumber: string | null;
  department: string | null;
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
    quizPerformance?: Array<{
      quizId: string;
      quizTitle: string;
      topic: string;
      difficulty: string;
      date: string;
      score: number;
      accuracy: number;
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

interface QuizWithPerformances {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  studentPerformances: Array<{
    studentId: string;
    fullName: string;
    rollNumber: string | null;
    department: string | null;
    section: string | null;
    date: string;
    score: number;
    accuracy: number;
    questionsAnswered: number;
    correctAnswers: number;
  }>;
}

interface AnalyticsData {
  students: Student[];
  quizzes: QuizWithPerformances[];
  departments: string[];
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
interface TooltipPayload {
  name: string;
  value: number | string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-xl shadow-2xl p-4 backdrop-blur-sm">
        <p className="font-bold mb-3 text-foreground text-base border-b border-border pb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: TooltipPayload, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-medium text-muted-foreground">{String(entry.name ?? "")}:</span>
              <span className="text-sm font-bold" style={{ color: entry.color }}>
                {typeof entry.value === "number"
                  ? (typeof entry.name === "string" && (entry.name.includes("%") || entry.name.includes("Accuracy")))
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

export function TeacherPerformanceDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [selectedQuiz, setSelectedQuiz] = useState<string>("all");
  const [searchStudentQuery, setSearchStudentQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStudentQuizFilter, setSelectedStudentQuizFilter] = useState<string>("all");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDepartment !== "all") {
        params.append("department", selectedDepartment);
      }
      if (selectedSection !== "all") {
        params.append("section", selectedSection);
      }
      if (selectedStudent !== "all") {
        params.append("studentId", selectedStudent);
      }

      const response = await fetch(`/api/analytics/teacher?${params.toString()}`);
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const errorMessage =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error?: unknown }).error || "Failed to load analytics")
            : `Failed to load analytics (${response.status})`;
        toast.error(errorMessage);
        return;
      }

      const maybeData = payload as Partial<AnalyticsData> | null;
      if (!maybeData || !Array.isArray(maybeData.students)) {
        toast.error("Failed to load analytics");
        return;
      }

      setData({
        ...maybeData,
        quizzes: Array.isArray(maybeData.quizzes) ? maybeData.quizzes : [],
      } as AnalyticsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment, selectedSection, selectedStudent]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Reset dependent filters when higher-level filter changes
  useEffect(() => {
    setSelectedSection("all");
    setSelectedStudent("all");
  }, [selectedDepartment]);

  useEffect(() => {
    setSelectedStudent("all");
  }, [selectedSection]);

  useEffect(() => {
    if (selectedStudent === "all" && activeTab === "student") setActiveTab("overview");
  }, [selectedStudent, activeTab]);

  useEffect(() => {
    setSelectedStudentQuizFilter("all");
  }, [selectedStudent]);

  const handleExport = async (type: string = "all") => {
    let loadingToastId: string | undefined;
    try {
      const params = new URLSearchParams();
      if (selectedDepartment !== "all") {
        params.append("department", selectedDepartment);
      }
      if (selectedSection !== "all") {
        params.append("section", selectedSection);
      }
      if (selectedStudent !== "all") {
        params.append("studentId", selectedStudent);
      }
      params.append("type", type);

      // Show loading toast
      loadingToastId = toast.loading("Generating Excel report...");

      const response = await fetch(`/api/analytics/export?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const timestamp = new Date().toISOString().split("T")[0];
      const departmentPart = selectedDepartment !== "all" ? `-${selectedDepartment}` : "";
      const sectionPart = selectedSection !== "all" ? `-${selectedSection}` : "";
      const filename = `Performance-Report${departmentPart}${sectionPart}-${type}-${timestamp}.xlsx`;
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Excel report downloaded successfully!`, { id: loadingToastId });
    } catch (error) {
      console.error("Error exporting data:", error);
      if (loadingToastId) toast.dismiss(loadingToastId);
      toast.error(
        error instanceof Error ? error.message : "Failed to export data. Please try again."
      );
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

  const q = searchStudentQuery.trim().toLowerCase();
  const searchMatches = q.length < 2
    ? []
    : students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        (s.rollNumber ?? "").toLowerCase().includes(q)
    ).slice(0, 20);

  const handleSelectStudent = (id: string) => {
    setSelectedStudent(id);
    setActiveTab("student");
  };

  // Department-level aggregates (computed client-side)
  const departmentPerformance = Object.values(
    students.reduce(
      (acc, s) => {
        const dept = (s.department || "Unknown").trim() || "Unknown";
        if (!acc[dept]) {
          acc[dept] = { department: dept, totalStudents: 0, scoreSum: 0, accSum: 0, sessionsSum: 0 };
        }
        acc[dept].totalStudents += 1;
        acc[dept].scoreSum += s.metrics.avgScore;
        acc[dept].accSum += s.metrics.avgAccuracy;
        acc[dept].sessionsSum += s.metrics.totalSessions;
        return acc;
      },
      {} as Record<
        string,
        {
          department: string;
          totalStudents: number;
          scoreSum: number;
          accSum: number;
          sessionsSum: number;
        }
      >
    )
  )
    .map((d) => ({
      department: d.department,
      students: d.totalStudents,
      avgScore: d.totalStudents > 0 ? Math.round((d.scoreSum / d.totalStudents) * 100) / 100 : 0,
      avgAccuracy: d.totalStudents > 0 ? Math.round((d.accSum / d.totalStudents) * 100) / 100 : 0,
      totalSessions: d.sessionsSum,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // Distributions (bucketed for readability)
  const scoreDistribution = (() => {
    const buckets = [
      { label: "0-20", min: 0, max: 20 },
      { label: "20-40", min: 20, max: 40 },
      { label: "40-60", min: 40, max: 60 },
      { label: "60-80", min: 60, max: 80 },
      { label: "80-100", min: 80, max: 100 },
    ];
    const counts = buckets.map((b) => ({ range: b.label, students: 0 }));
    for (const s of students) {
      const v = s.metrics.avgScore;
      const idx = Math.min(
        buckets.length - 1,
        Math.max(0, Math.floor(v / 20))
      );
      counts[idx].students += 1;
    }
    return counts;
  })();

  const accuracyDistribution = (() => {
    const buckets = [
      { label: "0-50%", min: 0, max: 50 },
      { label: "50-60%", min: 50, max: 60 },
      { label: "60-70%", min: 60, max: 70 },
      { label: "70-80%", min: 70, max: 80 },
      { label: "80-90%", min: 80, max: 90 },
      { label: "90-100%", min: 90, max: 100 },
    ];
    const counts = buckets.map((b) => ({ range: b.label, students: 0 }));
    for (const s of students) {
      const v = s.metrics.avgAccuracy;
      const idx =
        v < 50
          ? 0
          : v < 60
            ? 1
            : v < 70
              ? 2
              : v < 80
                ? 3
                : v < 90
                  ? 4
                  : 5;
      counts[idx].students += 1;
    }
    return counts;
  })();

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
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {(data.departments || []).map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
            <Select
              value={selectedStudent}
              onValueChange={(v) => {
                setSelectedStudent(v);
                if (v !== "all") setActiveTab("student");
              }}
            >
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
            variant="default"
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export All Reports
          </Button>
          <Button
            onClick={() => handleExport("detailed")}
            variant="outline"
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Detailed Report
          </Button>
          <Button
            onClick={() => handleExport("quizzes")}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Quiz Report
          </Button>
          <Button
            onClick={() => handleExport("assignments")}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Assignment Report
          </Button>
          <Button
            onClick={() => handleExport("performance")}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Performance Report
          </Button>
        </div>
      </div>

      {/* Find student — search and click to view performance */}
      <Card className="border-2 border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Find student
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Search by name, email, or roll number — then click to view performance in all quizzes or filter by one quiz.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchStudentQuery}
              onChange={(e) => setSearchStudentQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {searchMatches.length > 0 && (
            <ScrollArea className="h-[200px] rounded-lg border">
              <div className="p-2 space-y-1">
                {searchMatches.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectStudent(s.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left rounded-md hover:bg-muted transition-colors border border-transparent hover:border-border"
                  >
                    <span className="font-medium truncate">{s.fullName}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {s.rollNumber ?? s.section ?? s.department ?? "—"}
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
          {q.length >= 2 && searchMatches.length === 0 && (
            <p className="text-sm text-muted-foreground">No students match &quot;{searchStudentQuery}&quot;</p>
          )}
        </CardContent>
      </Card>

      {/* Overview Stats with Enhanced Design */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 border-primary/20 bg-linear-to-br from-primary/5 to-transparent hover:border-primary/40 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {students.length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Active students</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-500/20 bg-linear-to-br from-amber-500/5 to-transparent hover:border-amber-500/40 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-linear-to-r from-amber-600 to-amber-400 bg-clip-text text-transparent">
              {students.length > 0
                ? Math.round(
                  (students.reduce((sum, s) => sum + s.metrics.avgScore, 0) / students.length) *
                  100
                ) / 100
                : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Class average</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-500/20 bg-linear-to-br from-green-500/5 to-transparent hover:border-green-500/40 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Award className="h-5 w-5 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-linear-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
              {students.length > 0
                ? Math.round(
                  (students.reduce((sum, s) => sum + s.metrics.avgAccuracy, 0) / students.length) *
                  100
                ) / 100
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-2">Class average</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500/20 bg-linear-to-br from-blue-500/5 to-transparent hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-linear-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              {students.reduce((sum, s) => sum + s.metrics.totalSessions, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">All quiz sessions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="byQuiz">By Quiz</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="distributions">Distributions</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="difficulty">Difficulty</TabsTrigger>
          {selectedStudentData && <TabsTrigger value="student">Student Detail</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Top 10 Students by Score
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Highest scoring students in your class
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[350px]">
                  <BarChart data={topStudents} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PRIMARY_COLOR} stopOpacity={1} />
                        <stop offset="50%" stopColor={PRIMARY_LIGHT} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={PRIMARY_COLOR} stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: "hsl(var(--foreground))" }}
                      style={{ fontSize: "12px", fontWeight: 500 }}
                      tickLine={{ stroke: "hsl(var(--foreground))" }}
                    />
                    <YAxis
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: "hsl(var(--foreground))" }}
                      style={{ fontSize: "12px", fontWeight: 500 }}
                      tickLine={{ stroke: "hsl(var(--foreground))" }}
                      label={{ value: "Total Score", angle: -90, position: "insideLeft", style: { fontSize: "12px", fill: "hsl(var(--foreground))" } }}
                    />
                    <ChartTooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="score"
                      fill={`url(#scoreGradient)`}
                      name="Total Score"
                      radius={[12, 12, 0, 0]}
                      animationDuration={1200}
                      animationBegin={0}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-500/10 hover:border-green-500/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  Top 10 Students by Accuracy
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Most accurate students in your class
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[350px]">
                  <BarChart data={topStudents} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SUCCESS_COLOR} stopOpacity={1} />
                        <stop offset="50%" stopColor={SUCCESS_LIGHT} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={SUCCESS_COLOR} stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis
                      dataKey="name"
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
                      fill={`url(#accuracyGradient)`}
                      name="Accuracy %"
                      radius={[12, 12, 0, 0]}
                      animationDuration={1200}
                      animationBegin={0}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="byQuiz" className="space-y-4">
          <Card className="border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-primary" />
                Performance by Quiz
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                View all students&apos; performance for a specific quiz
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Select quiz:</span>
                  <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Choose a quiz" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All quizzes</SelectItem>
                      {(data?.quizzes ?? []).map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.title} ({q.topic})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(data?.quizzes ?? []).length === 0 ? (
                <div className="py-12 text-center text-muted-foreground rounded-lg border border-dashed">
                  <FileQuestion className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No quiz data yet</p>
                  <p className="text-sm mt-1">Quiz performance will appear once students take your hosted sessions.</p>
                </div>
              ) : selectedQuiz === "all" ? (
                <div className="space-y-6">
                  {(data?.quizzes ?? []).map((quiz) => (
                    <div key={quiz.id} className="space-y-3">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        <FileQuestion className="h-4 w-4 text-primary" />
                        {quiz.title}
                        <span className="text-muted-foreground font-normal text-sm">— {quiz.topic} · {quiz.difficulty}</span>
                      </h3>
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead>Roll No.</TableHead>
                              <TableHead>Section</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead className="text-right">Score</TableHead>
                              <TableHead className="text-right">Accuracy</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quiz.studentPerformances.map((sp, idx) => (
                              <TableRow key={`${sp.studentId}-${sp.date}-${idx}`}>
                                <TableCell className="font-medium">{sp.fullName}</TableCell>
                                <TableCell>{sp.rollNumber ?? "—"}</TableCell>
                                <TableCell>{sp.section ?? "—"}</TableCell>
                                <TableCell>{sp.department ?? "—"}</TableCell>
                                <TableCell className="text-right">{sp.score}</TableCell>
                                <TableCell className="text-right">{sp.accuracy.toFixed(1)}%</TableCell>
                                <TableCell>{new Date(sp.date).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                (() => {
                  const q = (data?.quizzes ?? []).find((qu) => qu.id === selectedQuiz);
                  if (!q) return null;
                  return (
                    <div className="rounded-lg border overflow-hidden">
                      <div className="px-4 py-2 bg-muted/50 border-b">
                        <span className="font-medium">{q.title}</span>
                        <span className="text-muted-foreground text-sm ml-2">— {q.topic} · {q.difficulty}</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Roll No.</TableHead>
                            <TableHead>Section</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead className="text-right">Accuracy</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {q.studentPerformances.map((sp, idx) => (
                            <TableRow key={`${sp.studentId}-${sp.date}-${idx}`}>
                              <TableCell className="font-medium">{sp.fullName}</TableCell>
                              <TableCell>{sp.rollNumber ?? "—"}</TableCell>
                              <TableCell>{sp.section ?? "—"}</TableCell>
                              <TableCell>{sp.department ?? "—"}</TableCell>
                              <TableCell className="text-right">{sp.score}</TableCell>
                              <TableCell className="text-right">{sp.accuracy.toFixed(1)}%</TableCell>
                              <TableCell>{new Date(sp.date).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          {departmentPerformance.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Department Performance
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Compare average score and accuracy across departments
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-[350px]">
                    <BarChart data={departmentPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="department" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip content={<CustomTooltip />} />
                      <ChartLegend iconType="circle" />
                      <Bar dataKey="avgScore" fill="hsl(var(--chart-1))" name="Avg Score" radius={[10, 10, 0, 0]} />
                      <Bar dataKey="avgAccuracy" fill="hsl(var(--chart-2))" name="Avg Accuracy %" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Students by Department
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Student distribution across departments
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-[350px]">
                    <PieChart>
                      <Pie
                        data={departmentPerformance}
                        cx="50%"
                        cy="50%"
                        dataKey="students"
                        nameKey="department"
                        outerRadius={120}
                        innerRadius={40}
                        paddingAngle={2}
                        label={(p: { name?: string; percent?: number }) =>
                          `${p.name ?? ""} ${(p.percent ? p.percent * 100 : 0).toFixed(0)}%`
                        }
                      >
                        {departmentPerformance.map((_, index) => (
                          <Cell
                            key={`dept-cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <ChartTooltip content={<CustomTooltip />} />
                      <ChartLegend iconType="circle" />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground mb-2">No department data available</p>
                <p className="text-sm text-muted-foreground">
                  Department stats will appear once students have departments set
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sections" className="space-y-4">
          {sectionPerformance.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Section Performance Comparison
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Compare average scores and accuracy across sections
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-[350px]">
                    <BarChart data={sectionPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="sectionScoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={PRIMARY_COLOR} stopOpacity={1} />
                          <stop offset="50%" stopColor={PRIMARY_LIGHT} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={PRIMARY_COLOR} stopOpacity={0.6} />
                        </linearGradient>
                        <linearGradient id="sectionAccuracyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={SUCCESS_COLOR} stopOpacity={1} />
                          <stop offset="50%" stopColor={SUCCESS_LIGHT} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={SUCCESS_COLOR} stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                      <XAxis
                        dataKey="section"
                        stroke="hsl(var(--foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                        style={{ fontSize: "12px", fontWeight: 500 }}
                        tickLine={{ stroke: "hsl(var(--foreground))" }}
                      />
                      <YAxis
                        stroke="hsl(var(--foreground))"
                        tick={{ fill: "hsl(var(--foreground))" }}
                        style={{ fontSize: "12px", fontWeight: 500 }}
                        tickLine={{ stroke: "hsl(var(--foreground))" }}
                        label={{ value: "Score / Accuracy", angle: -90, position: "insideLeft", style: { fontSize: "12px", fill: "hsl(var(--foreground))" } }}
                      />
                      <ChartTooltip content={<CustomTooltip />} />
                      <ChartLegend
                        wrapperStyle={{ fontSize: "13px", fontWeight: 500, paddingTop: "20px", color: "hsl(var(--foreground))" }}
                        iconType="circle"
                      />
                      <Bar
                        dataKey="avgScore"
                        fill={`url(#sectionScoreGradient)`}
                        name="Avg Score"
                        radius={[12, 12, 0, 0]}
                        animationDuration={1200}
                        animationBegin={0}
                      />
                      <Bar
                        dataKey="avgAccuracy"
                        fill={`url(#sectionAccuracyGradient)`}
                        name="Avg Accuracy %"
                        radius={[12, 12, 0, 0]}
                        animationDuration={1200}
                        animationBegin={200}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Students Distribution
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Number of students in each section
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-[350px]">
                    <PieChart>
                      <Pie
                        data={sectionPerformance}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props: { payload?: { section: string; students: number }; percent?: number }) => {
                          const entry = props.payload || { section: "", students: 0 };
                          const percent = props.percent !== undefined ? (props.percent * 100).toFixed(0) : "0";
                          return `${entry.section}: ${percent}%`;
                        }}
                        outerRadius={120}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="students"
                        animationBegin={0}
                        animationDuration={1200}
                        paddingAngle={2}
                      >
                        {sectionPerformance.map((entry, index) => (
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
                          if (name === "students") {
                            const percent = ((value / sectionPerformance.reduce((sum, s) => sum + s.students, 0)) * 100).toFixed(1);
                            return [`${value} students (${percent}%)`, "Students"];
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
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground mb-2">No section data available</p>
                <p className="text-sm text-muted-foreground">
                  Section data will appear when students join quizzes
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="distributions" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Avg Score Distribution
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  How many students fall into each average score band
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[320px]">
                  <BarChart data={scoreDistribution} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="range" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<CustomTooltip />} />
                    <Bar dataKey="students" name="Students" fill="hsl(var(--chart-3))" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-500" />
                  Accuracy Distribution
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  How many students fall into each accuracy band
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[320px]">
                  <BarChart data={accuracyDistribution} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="range" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<CustomTooltip />} />
                    <Bar dataKey="students" name="Students" fill="hsl(var(--chart-2))" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          {topicPerformanceData.length > 0 ? (
            <Card className="border-2 border-warning/10 hover:border-warning/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 text-warning" />
                  Class Topic Performance
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Average accuracy across all students by topic
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer className="h-[450px]">
                  <BarChart data={topicPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <defs>
                      <linearGradient id="topicGradient" x1="0" y1="0" x2="0" y2="1">
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
                      fill={`url(#topicGradient)`}
                      name="Accuracy %"
                      radius={[12, 12, 0, 0]}
                      animationDuration={1200}
                      animationBegin={0}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground mb-2">No topic data available</p>
                <p className="text-sm text-muted-foreground">
                  Topic data will appear when students complete quizzes
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
                    Class average accuracy at each difficulty level
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer className="h-[350px]">
                    <BarChart data={difficultyPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="difficultyGradient" x1="0" y1="0" x2="0" y2="1">
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
                        fill={`url(#difficultyGradient)`}
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
                    Distribution of questions across difficulty levels
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
                        label={(props: { payload?: { difficulty: string; total: number }; percent?: number }) => {
                          const entry = props.payload || { difficulty: "", total: 0 };
                          const percent = props.percent !== undefined ? (props.percent * 100).toFixed(0) : "0";
                          return `${entry.difficulty}: ${percent}%`;
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
                <p className="text-lg font-medium text-foreground mb-2">No difficulty data available</p>
                <p className="text-sm text-muted-foreground">
                  Difficulty data will appear when students complete quizzes
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {selectedStudentData && (
          <TabsContent value="student" className="space-y-4">
            <Card className="border-2 border-primary/10 mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {selectedStudentData.fullName} - Detailed Performance
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Individual student analytics and progress tracking
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-sm text-muted-foreground mb-1">Total Score</p>
                    <p className="text-2xl font-bold text-primary">{selectedStudentData.totalScore}</p>
                  </div>
                  <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/10">
                    <p className="text-sm text-muted-foreground mb-1">Avg Accuracy</p>
                    <p className="text-2xl font-bold text-green-600">{selectedStudentData.metrics.avgAccuracy.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/10">
                    <p className="text-sm text-muted-foreground mb-1">Sessions</p>
                    <p className="text-2xl font-bold text-amber-600">{selectedStudentData.metrics.totalSessions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Performance Over Time
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Score and accuracy trends across sessions
                  </p>
                </CardHeader>
                <CardContent>
                  {performanceOverTime.length > 0 ? (
                    <ChartContainer className="h-[350px]">
                      <AreaChart data={performanceOverTime} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <defs>
                          <linearGradient id="studentScoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={PRIMARY_COLOR} stopOpacity={0.4} />
                            <stop offset="50%" stopColor={PRIMARY_COLOR} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={PRIMARY_COLOR} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="studentAccuracyAreaGradient" x1="0" y1="0" x2="0" y2="1">
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
                          stroke="hsl(var(--foreground))"
                          tick={{ fill: "hsl(var(--foreground))" }}
                          style={{ fontSize: "12px", fontWeight: 500 }}
                          tickLine={{ stroke: "hsl(var(--foreground))" }}
                          label={{ value: "Score / Accuracy", angle: -90, position: "insideLeft", style: { fontSize: "12px", fill: "hsl(var(--foreground))" } }}
                        />
                        <ChartTooltip content={<CustomTooltip />} />
                        <ChartLegend
                          wrapperStyle={{ fontSize: "13px", fontWeight: 500, paddingTop: "20px", color: "hsl(var(--foreground))" }}
                          iconType="line"
                        />
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke={PRIMARY_COLOR}
                          strokeWidth={3}
                          fill="url(#studentScoreAreaGradient)"
                          name="Score"
                          animationDuration={1000}
                          dot={{ fill: PRIMARY_COLOR, r: 5, strokeWidth: 2, stroke: "#fff" }}
                          activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="accuracy"
                          stroke={SUCCESS_COLOR}
                          strokeWidth={3}
                          fill="url(#studentAccuracyAreaGradient)"
                          name="Accuracy %"
                          animationDuration={1000}
                          dot={{ fill: SUCCESS_COLOR, r: 5, strokeWidth: 2, stroke: "#fff" }}
                          activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff" }}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="py-16 text-center text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No session data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-2 border-warning/10 hover:border-warning/20 transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Target className="h-5 w-5 text-warning" />
                    Topic Performance
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Accuracy breakdown by topic
                  </p>
                </CardHeader>
                <CardContent>
                  {Object.entries(selectedStudentData.metrics.topicPerformance).length > 0 ? (
                    <ChartContainer className="h-[350px]">
                      <BarChart
                        data={Object.entries(selectedStudentData.metrics.topicPerformance).map(
                          ([topic, perf]) => ({
                            topic,
                            accuracy:
                              perf.total > 0 ? (perf.correct / perf.total) * 100 : 0,
                          })
                        )}
                        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                      >
                        <defs>
                          <linearGradient id="studentTopicGradient" x1="0" y1="0" x2="0" y2="1">
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
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: "12px", fontWeight: 500 }}
                          tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: "12px", fontWeight: 500 }}
                          domain={[0, 100]}
                          tickLine={{ stroke: "hsl(var(--muted-foreground))" }}
                          label={{ value: "Accuracy %", angle: -90, position: "insideLeft", style: { fontSize: "12px" } }}
                        />
                        <ChartTooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="accuracy"
                          fill={`url(#studentTopicGradient)`}
                          name="Accuracy %"
                          radius={[12, 12, 0, 0]}
                          animationDuration={1200}
                          animationBegin={0}
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="py-16 text-center text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No topic data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-2 border-primary/10 hover:border-primary/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileQuestion className="h-5 w-5 text-primary" />
                  Performance per Quiz
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  This student&apos;s score and accuracy for each quiz — view all or filter by one quiz.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {(selectedStudentData.metrics.quizPerformance ?? []).length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-muted-foreground">Filter by quiz:</span>
                      <Select value={selectedStudentQuizFilter} onValueChange={setSelectedStudentQuizFilter}>
                        <SelectTrigger className="w-[240px]">
                          <SelectValue placeholder="All quizzes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All quizzes</SelectItem>
                          {Array.from(
                            new Map(
                              (selectedStudentData.metrics.quizPerformance ?? []).map((qp) => [qp.quizId, qp])
                            ).values()
                          ).map((qp) => (
                            <SelectItem key={qp.quizId} value={qp.quizId}>
                              {qp.quizTitle} ({qp.topic})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Quiz</TableHead>
                            <TableHead>Topic</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead className="text-right">Accuracy</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedStudentData.metrics.quizPerformance ?? [])
                            .filter((qp) => selectedStudentQuizFilter === "all" || qp.quizId === selectedStudentQuizFilter)
                            .map((qp, idx) => (
                              <TableRow key={`${qp.quizId}-${qp.date}-${idx}`}>
                                <TableCell className="font-medium">{qp.quizTitle}</TableCell>
                                <TableCell>{qp.topic}</TableCell>
                                <TableCell className="capitalize">{qp.difficulty}</TableCell>
                                <TableCell className="text-right">{qp.score}</TableCell>
                                <TableCell className="text-right">{qp.accuracy.toFixed(1)}%</TableCell>
                                <TableCell>{new Date(qp.date).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No quiz data yet</p>
                    <p className="text-sm mt-1">Performance per quiz will appear once this student takes your hosted sessions.</p>
                  </div>
                )}
              </CardContent>
            </Card>

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
