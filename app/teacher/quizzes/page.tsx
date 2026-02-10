"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/providers/user-provider";
import { canEditDeleteAnyQuiz } from "@/lib/admin-teachers";
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
  Users,
  TrendingUp,
  BarChart3,
  Radio,
  RotateCw,
} from "lucide-react";
import toast from "react-hot-toast";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  difficulty: string;
  status: string;
  totalQuestions: number;
  timeLimit: number;
  createdAt: string;
  createdById?: string;
  createdBy?: { fullName: string } | null;
  stats?: {
    totalSessions: number;
    totalParticipants: number;
    avgScore: number;
    avgAccuracy: number;
  };
  liveSession?: {
    sessionId: string;
    roomCode: string;
    timeRemaining: number;
    timeLimit: number;
    startedAt: string;
    currentQuestionIndex: number;
    participantCount: number;
  };
}

export default function TeacherQuizzesPage() {
  const router = useRouter();
  const { profile } = useUser();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [sessionToRestart, setSessionToRestart] = useState<{ sessionId: string; quizTitle: string } | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);

  // Update live session timers - calculate based on actual elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setQuizzes((prevQuizzes) =>
        prevQuizzes.map((quiz) => {
          if (quiz.liveSession && quiz.liveSession.startedAt && quiz.liveSession.timeLimit) {
            const now = new Date();
            const startedAt = new Date(quiz.liveSession.startedAt);
            if (isNaN(startedAt.getTime())) {
              return quiz; // Invalid date, skip update
            }
            const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
            const timeRemaining = Math.max(0, quiz.liveSession.timeLimit - elapsedSeconds);
            
            return {
              ...quiz,
              liveSession: {
                ...quiz.liveSession,
                timeRemaining: isNaN(timeRemaining) ? 0 : timeRemaining,
              },
            };
          }
          return quiz;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format time helper
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) {
      return "0:00";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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

  const editQuiz = (quizId: string) => {
    router.push(`/teacher/quizzes/create?quizId=${quizId}`);
  };

  const openDeleteDialog = (quizId: string, quizTitle: string) => {
    setQuizToDelete({ id: quizId, title: quizTitle });
    setDeleteDialogOpen(true);
  };

  const deleteQuiz = async () => {
    if (!quizToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/quizzes/${quizToDelete.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete quiz");
      }

      toast.success("Quiz deleted successfully!");
      setDeleteDialogOpen(false);
      setQuizToDelete(null);
      // Refresh the quiz list
      fetchQuizzes();
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete quiz"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openRestartDialog = (sessionId: string, quizTitle: string) => {
    setSessionToRestart({ sessionId, quizTitle });
    setRestartDialogOpen(true);
  };

  const restartSession = async () => {
    if (!sessionToRestart) return;

    setIsRestarting(true);
    try {
      const response = await fetch(
        `/api/sessions/${sessionToRestart.sessionId}/restart`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to restart session");
      }

      toast.success("Session restarted successfully!");
      setRestartDialogOpen(false);
      setSessionToRestart(null);
      // Refresh the quiz list to show the new session
      fetchQuizzes();
      // Navigate to the new session
      router.push(`/teacher/session/${data.session.id}`);
    } catch (error) {
      console.error("Error restarting session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to restart session"
      );
    } finally {
      setIsRestarting(false);
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
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link
                        href={`/teacher/quizzes/${quiz.id}`}
                        className="font-semibold truncate hover:underline text-primary underline-offset-2 focus:outline-none focus:ring-2 focus:ring-ring rounded"
                      >
                        {quiz.title}
                      </Link>
                      <Badge
                        variant="outline"
                        className={getStatusColor(quiz.status)}
                      >
                        {quiz.status}
                      </Badge>
                      {quiz.liveSession && (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 animate-pulse">
                          <Radio className="h-3 w-3 mr-1" />
                          LIVE
                        </Badge>
                      )}
                    </div>
                    {quiz.liveSession && (
                      <div className="mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-green-600" />
                              <span className="font-semibold text-green-700 dark:text-green-400">
                                Time Remaining: {formatTime(quiz.liveSession?.timeRemaining ?? 0)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-green-600" />
                              <span className="text-green-700 dark:text-green-400">
                                {quiz.liveSession.participantCount} participants
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <span className="text-green-700 dark:text-green-400">
                                Q{quiz.liveSession.currentQuestionIndex + 1}/{quiz.totalQuestions}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-500/20 cursor-pointer"
                              onClick={() => router.push(`/teacher/session/${quiz.liveSession?.sessionId}`)}
                            >
                              <Play className="h-3.5 w-3.5 mr-2" />
                              View Session
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20 cursor-pointer"
                              onClick={() => openRestartDialog(quiz.liveSession!.sessionId, quiz.title)}
                            >
                              <RotateCw className="h-3.5 w-3.5 mr-2" />
                              Restart
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
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
                        {(() => {
                          const timeLimitSeconds = Number(quiz.timeLimit) || 900;
                          const minutes = Math.floor(timeLimitSeconds / 60);
                          const seconds = timeLimitSeconds % 60;
                          if (seconds === 0) {
                            return `${minutes} min`;
                          }
                          return `${minutes}:${seconds.toString().padStart(2, '0')} min`;
                        })()}
                      </span>
                      <span className="text-muted-foreground">
                        Topic: {quiz.topic}
                      </span>
                    </div>
                    {/* Quiz Results/Statistics */}
                    {quiz.stats && quiz.stats.totalSessions > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded">
                              <BarChart3 className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-muted-foreground">Sessions:</span>
                            <span className="font-semibold text-foreground">
                              {quiz.stats.totalSessions}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-500/10 rounded">
                              <Users className="h-3.5 w-3.5 text-green-600" />
                            </div>
                            <span className="text-muted-foreground">Participants:</span>
                            <span className="font-semibold text-foreground">
                              {quiz.stats.totalParticipants}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-500/10 rounded">
                              <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                            </div>
                            <span className="text-muted-foreground">Avg Score:</span>
                            <span className="font-semibold text-foreground">
                              {quiz.stats.avgScore.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-500/10 rounded">
                              <Zap className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <span className="text-muted-foreground">Avg Accuracy:</span>
                            <span className="font-semibold text-foreground">
                              {quiz.stats.avgAccuracy.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:shrink-0">
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
                        <DropdownMenuItem onClick={() => cloneQuiz(quiz.id)} className="cursor-pointer">
                          <Copy className="h-4 w-4 mr-2" />
                          Clone Quiz
                        </DropdownMenuItem>
                        {(quiz.createdById === profile?.id || canEditDeleteAnyQuiz(profile?.email)) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => editQuiz(quiz.id)} className="cursor-pointer">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Quiz
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(quiz.id, quiz.title)} 
                              className="text-destructive cursor-pointer focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Quiz
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-xl">Delete Quiz</DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                &quot;{quizToDelete?.title}&quot;
              </span>
              ? This action cannot be undone and will permanently delete the quiz
              and all its questions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setQuizToDelete(null);
              }}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteQuiz}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Quiz
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restart Session Warning Dialog */}
      <Dialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
              </div>
              <DialogTitle className="text-xl">Restart Session</DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2 space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Warning: This action will permanently delete the current session and all related data.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-amber-600 dark:text-amber-500 ml-2">
                  <li>All participant progress will be lost</li>
                  <li>All submitted answers will be deleted</li>
                  <li>All scores and statistics for this session will be removed</li>
                  <li>A new session will be created with a new room code</li>
                </ul>
              </div>
              <p className="pt-2">
                Are you sure you want to restart the session for{" "}
                <span className="font-semibold text-foreground">
                  {sessionToRestart?.quizTitle}
                </span>
                ?
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setRestartDialogOpen(false);
                setSessionToRestart(null);
              }}
              disabled={isRestarting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={restartSession}
              disabled={isRestarting}
              className="cursor-pointer gap-2"
            >
              {isRestarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restarting...
                </>
              ) : (
                <>
                  <RotateCw className="h-4 w-4" />
                  Restart Session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
