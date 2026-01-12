"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Trophy,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QuizHistory {
  sessionId: string;
  quizTitle: string;
  topic: string;
  difficulty: string;
  score: number;
  maxScore: number;
  accuracy: number;
  questionsAnswered: number;
  totalQuestions: number;
  completedAt: string;
  timeTaken: number;
  violations?: number;
}

export default function QuizHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<QuizHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");

  useEffect(() => {
    fetchHistory();
  }, [filterTopic, filterDifficulty]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(
        `/api/quiz-history?topic=${filterTopic}&difficulty=${filterDifficulty}`
      );
      const data = await response.json();
      if (response.ok) {
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredHistory = history;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "hard":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "";
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600";
    if (accuracy >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const topics = Array.from(new Set(history.map((h) => h.topic)));

  const stats = {
    totalQuizzes: history.length,
    avgAccuracy: history.length > 0
      ? history.reduce((sum, h) => sum + h.accuracy, 0) / history.length
      : 0,
    totalScore: history.reduce((sum, h) => sum + h.score, 0),
    perfectScores: history.filter((h) => h.accuracy === 100).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quiz History</h1>
        <p className="text-muted-foreground mt-1">
          Review your past quiz performances and track your progress
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalQuizzes}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgAccuracy.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Overall performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Score</CardTitle>
            <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalScore}</p>
            <p className="text-xs text-muted-foreground mt-1">Points earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Perfect Scores</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.perfectScores}</p>
            <p className="text-xs text-muted-foreground mt-1">100% accuracy</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={filterTopic} onValueChange={setFilterTopic}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Results</CardTitle>
          <CardDescription>Your complete quiz history</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No quiz history yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete quizzes to see your history here!
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((quiz) => (
                  <TableRow key={quiz.sessionId}>
                    <TableCell className="font-medium">{quiz.quizTitle}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{quiz.topic}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{quiz.score}</span>
                        <span className="text-muted-foreground">/ {quiz.maxScore}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${getAccuracyColor(quiz.accuracy)}`}>
                        {quiz.accuracy.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      {quiz.questionsAnswered} / {quiz.totalQuestions}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {Math.floor(quiz.timeTaken / 60)}m {quiz.timeTaken % 60}s
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(quiz.completedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/student/quiz-history/${quiz.sessionId}`)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-2" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
