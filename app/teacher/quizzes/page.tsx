"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Zap,
  MoreHorizontal,
  Play,
  Edit,
  Trash2,
  Clock,
  FileText,
  Loader2,
  Copy,
  Shuffle,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  difficulty: string;
  status: string;
  totalQuestions: number;
  timePerQuestion: number;
  createdAt: string;
}

export default function TeacherQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);

  const fetchQuizzes = useCallback(async () => {
    try {
      const response = await fetch("/api/quizzes");
      const data = await response.json();

      if (response.ok) {
        setQuizzes(data.quizzes);
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      toast.error("Failed to load quizzes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const startSession = async (quizId: string) => {
    setStartingQuizId(quizId);
    try {
      const response = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start session");
      }

      toast.success("Session started!");
      router.push(`/teacher/session/${data.session.id}`);
    } catch (error) {
      console.error("Error starting session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start session"
      );
    } finally {
      setStartingQuizId(null);
    }
  };

  const cloneQuiz = async (quizId: string) => {
    try {
      const response = await fetch(`/api/quizzes/${quizId}/clone`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to clone quiz");
      }

      toast.success("Quiz cloned successfully!");
      // Navigate to create page with cloned quiz ID
      router.push(`/teacher/quizzes/create?quizId=${data.quiz.id}`);
      // Refresh the quiz list
      fetchQuizzes();
    } catch (error) {
      console.error("Error cloning quiz:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to clone quiz"
      );
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-muted text-muted-foreground";
      case "published":
        return "bg-green-500/10 text-green-600";
      case "archived":
        return "bg-gray-500/10 text-gray-500";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Quizzes</h1>
          <p className="text-muted-foreground">
            Create and manage your quiz library
          </p>
        </div>
        <Link href="/teacher/quizzes/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Quiz
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Total Quizzes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{quizzes.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Published</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {quizzes.filter((q) => q.status === "published").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>Draft</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {quizzes.filter((q) => q.status === "draft").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quiz List */}
      {quizzes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No quizzes yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Create your first quiz and let AI generate questions for you.
              It&apos;s quick and easy!
            </p>
            <Link href="/teacher/quizzes/create">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Quiz
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <Card
              key={quiz.id}
              className="border-border/50 hover:border-primary/30 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Quiz Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{quiz.title}</h3>
                      <Badge
                        variant="outline"
                        className={getStatusColor(quiz.status)}
                      >
                        {quiz.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {quiz.description || "No description"}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <Badge
                        variant="outline"
                        className={getDifficultyColor(quiz.difficulty)}
                      >
                        {quiz.difficulty}
                      </Badge>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {quiz.totalQuestions} questions
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {quiz.timePerQuestion}s per question
                      </span>
                      <span className="text-muted-foreground">
                        Topic: {quiz.topic}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => startSession(quiz.id)}
                      disabled={
                        startingQuizId === quiz.id || quiz.totalQuestions === 0
                      }
                    >
                      {startingQuizId === quiz.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      Start Session
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => cloneQuiz(quiz.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Clone Quiz
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Quiz
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Quiz
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
