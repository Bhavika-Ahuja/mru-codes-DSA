"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Play,
  SkipForward,
  Square,
  Users,
  Clock,
  Trophy,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";

interface Question {
  id: string;
  questionText: string;
  options: { id: string; text: string; is_correct: boolean }[];
  explanation: string | null;
  orderIndex: number;
  points: number;
}

interface Participant {
  id: string;
  score: number;
  questionsAnswered: number;
  correctAnswers: number;
  student: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    section: string | null;
  };
}

interface SessionData {
  id: string;
  roomCode: string;
  status: "waiting" | "live" | "completed";
  currentQuestionIndex: number;
  currentQuestionId: string | null;
  questionStartedAt: string | null;
  quiz: {
    id: string;
    title: string;
    topic: string;
    difficulty: string;
    timePerQuestion: number;
    totalQuestions: number;
    questions: Question[];
  };
  host: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  participants: Participant[];
}

export default function TeacherSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const supabase = createClient();

  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch session");
      }

      if (!data.isHost) {
        toast.error("You are not the host of this session");
        router.push("/teacher/dashboard");
        return;
      }

      setSession(data.session);
    } catch (error) {
      console.error("Error fetching session:", error);
      toast.error("Failed to load session");
      router.push("/teacher/dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, router]);

  // Initial fetch
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel(`quiz-session-${sessionId}`)
      .on("broadcast", { event: "participant_join" }, (payload) => {
        // Refetch to get updated participant list
        fetchSession();
        toast.success(`${payload.payload.full_name} joined the quiz!`);
      })
      .on("broadcast", { event: "score_update" }, () => {
        // Refetch to get updated scores
        fetchSession();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, sessionId, supabase, fetchSession]);

  // Timer countdown
  useEffect(() => {
    if (
      !session ||
      session.status !== "live" ||
      !session.questionStartedAt
    ) {
      setTimeRemaining(0);
      return;
    }

    const startTime = new Date(session.questionStartedAt).getTime();
    const duration = session.quiz.timePerQuestion * 1000;

    const updateTime = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setTimeRemaining(remaining);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Session actions
  const performAction = async (action: "start" | "next_question" | "end") => {
    setIsActionLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Action failed");
      }

      // Broadcast the change for realtime
      if (action === "start" || action === "next_question") {
        await supabase.channel(`quiz-session-${sessionId}`).send({
          type: "broadcast",
          event: "question_change",
          payload: {
            question_index: data.session.currentQuestionIndex,
            started_at: data.session.questionStartedAt,
          },
        });
      }

      if (action === "end" || data.session.status === "completed") {
        await supabase.channel(`quiz-session-${sessionId}`).send({
          type: "broadcast",
          event: "session_end",
          payload: {},
        });
        toast.success("Quiz ended!");
      }

      // Refetch session
      await fetchSession();
    } catch (error) {
      console.error("Error performing action:", error);
      toast.error(
        error instanceof Error ? error.message : "Action failed"
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const copyRoomCode = () => {
    if (session) {
      navigator.clipboard.writeText(session.roomCode);
      setCopied(true);
      toast.success("Room code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  const currentQuestion =
    session.status === "live" && session.quiz.questions[session.currentQuestionIndex];
  const isLastQuestion =
    session.currentQuestionIndex >= session.quiz.totalQuestions - 1;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header with room code */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {session.quiz.title}
          </h1>
          <p className="text-muted-foreground">
            {session.quiz.topic} • {session.quiz.difficulty}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            className="gap-2 font-mono text-lg"
            onClick={copyRoomCode}
          >
            {session.roomCode}
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Badge
            variant="outline"
            className={
              session.status === "waiting"
                ? "bg-amber-500/10 text-amber-600"
                : session.status === "live"
                ? "bg-green-500/10 text-green-600"
                : "bg-muted text-muted-foreground"
            }
          >
            {session.status === "waiting"
              ? "Waiting"
              : session.status === "live"
              ? "Live"
              : "Completed"}
          </Badge>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status/Control Card */}
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              {session.status === "waiting" && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
                    <Users className="h-8 w-8 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Waiting for students
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    {session.participants.length} students have joined
                  </p>
                  {(() => {
                    // Calculate section-wise counts
                    const sectionCounts = session.participants.reduce(
                      (acc, p) => {
                        const section = p.student.section || "No Section";
                        acc[section] = (acc[section] || 0) + 1;
                        return acc;
                      },
                      {} as Record<string, number>
                    );
                    const sections = Object.keys(sectionCounts).sort();

                    return sections.length > 0 ? (
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                        {sections.map((section) => (
                          <Badge
                            key={section}
                            variant="outline"
                            className="text-xs"
                          >
                            {section}: {sectionCounts[section]}
                          </Badge>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  <Button
                    size="lg"
                    onClick={() => performAction("start")}
                    disabled={
                      isActionLoading || session.participants.length === 0
                    }
                    className="gap-2"
                  >
                    {isActionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Start Quiz
                  </Button>
                </div>
              )}

              {session.status === "live" && currentQuestion && (
                <div className="space-y-6">
                  {/* Timer and progress */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        Question {session.currentQuestionIndex + 1} /{" "}
                        {session.quiz.totalQuestions}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock
                        className={`h-5 w-5 ${
                          timeRemaining <= 5
                            ? "text-red-500"
                            : "text-muted-foreground"
                        }`}
                      />
                      <span
                        className={`text-2xl font-mono font-bold ${
                          timeRemaining <= 5 ? "text-red-500" : ""
                        }`}
                      >
                        {timeRemaining}s
                      </span>
                    </div>
                  </div>

                  <Progress
                    value={
                      (timeRemaining / session.quiz.timePerQuestion) * 100
                    }
                    className="h-2"
                  />

                  {/* Question display */}
                  <div className="p-6 bg-muted/50 rounded-xl">
                    <p className="text-lg font-medium mb-6">
                      {currentQuestion.questionText}
                    </p>
                    <div className="grid gap-3">
                      {currentQuestion.options.map((option, index) => (
                        <div
                          key={option.id}
                          className={`flex items-center gap-3 p-4 rounded-lg border ${
                            option.is_correct
                              ? "border-green-500 bg-green-500/5"
                              : "border-border"
                          }`}
                        >
                          <span className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-sm font-medium">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="flex-1">{option.text}</span>
                          {option.is_correct && (
                            <Check className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="destructive"
                      onClick={() => performAction("end")}
                      disabled={isActionLoading}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      End Quiz
                    </Button>
                    <Button
                      onClick={() => performAction("next_question")}
                      disabled={isActionLoading}
                      className="gap-2"
                    >
                      {isActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isLastQuestion ? (
                        <>
                          Finish Quiz
                          <Check className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Next Question
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {session.status === "completed" && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                    <Trophy className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Quiz Completed!</h3>
                  <p className="text-muted-foreground mb-2">
                    {session.participants.length} students participated
                  </p>
                  {(() => {
                    // Calculate section-wise counts
                    const sectionCounts = session.participants.reduce(
                      (acc, p) => {
                        const section = p.student.section || "No Section";
                        acc[section] = (acc[section] || 0) + 1;
                        return acc;
                      },
                      {} as Record<string, number>
                    );
                    const sections = Object.keys(sectionCounts).sort();

                    return sections.length > 0 ? (
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                        {sections.map((section) => (
                          <Badge
                            key={section}
                            variant="outline"
                            className="text-xs"
                          >
                            {section}: {sectionCounts[section]}
                          </Badge>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  <Button onClick={() => router.push("/teacher/quizzes")}>
                    Back to Quizzes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Question overview (for waiting/completed) */}
          {session.status !== "live" && (
            <Card>
              <CardHeader>
                <CardTitle>Questions</CardTitle>
                <CardDescription>
                  {session.quiz.totalQuestions} questions •{" "}
                  {session.quiz.timePerQuestion}s per question
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {session.quiz.questions.map((q, index) => (
                    <div
                      key={q.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm truncate flex-1">
                        {q.questionText}
                      </span>
                      <Badge variant="outline">{q.points} pts</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Participants */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participants ({session.participants.length})
                </div>
                {(() => {
                  // Calculate section-wise counts for header
                  const sectionCounts = session.participants.reduce(
                    (acc, p) => {
                      const section = p.student.section || "No Section";
                      acc[section] = (acc[section] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  );
                  const sections = Object.keys(sectionCounts).sort();

                  return sections.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {sections.map((section) => (
                        <Badge
                          key={section}
                          variant="secondary"
                          className="text-xs"
                        >
                          {section}: {sectionCounts[section]}
                        </Badge>
                      ))}
                    </div>
                  ) : null;
                })()}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {session.participants.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Waiting for students to join...</p>
                    <p className="text-xs mt-1">
                      Share the room code:{" "}
                      <strong className="font-mono">
                        {session.roomCode}
                      </strong>
                    </p>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {(() => {
                      // Group participants by section
                      const groupedBySection = session.participants.reduce(
                        (acc, p) => {
                          const section = p.student.section || "No Section";
                          if (!acc[section]) {
                            acc[section] = [];
                          }
                          acc[section].push(p);
                          return acc;
                        },
                        {} as Record<string, typeof session.participants>
                      );

                      const sections = Object.keys(groupedBySection).sort();

                      return sections.map((section) => {
                        const sectionParticipants = groupedBySection[section];
                        return (
                          <div key={section} className="space-y-2">
                            <div className="flex items-center gap-2 px-2">
                              <Badge variant="outline" className="text-xs">
                                {section}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {sectionParticipants.length}{" "}
                                {sectionParticipants.length === 1
                                  ? "student"
                                  : "students"}
                              </span>
                            </div>
                            <div className="space-y-2 pl-2 border-l-2 border-border/50">
                              {sectionParticipants.map((p, index) => (
                                <div
                                  key={p.id}
                                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                                >
                                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                  </span>
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage
                                      src={p.student.avatarUrl || undefined}
                                    />
                                    <AvatarFallback>
                                      {p.student.fullName.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {p.student.fullName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {p.correctAnswers}/{p.questionsAnswered}{" "}
                                      correct
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-primary">
                                      {p.score}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      pts
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

