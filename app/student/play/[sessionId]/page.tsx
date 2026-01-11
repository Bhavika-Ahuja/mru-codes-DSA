"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  Trophy,
  Loader2,
  AlertCircle,
  Check,
  X,
  Hourglass,
  PartyPopper,
  MapPin,
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
import { createClient } from "@/lib/supabase/client";

interface QuestionOption {
  id: string;
  text: string;
}

interface CurrentQuestion {
  id: string;
  questionText: string;
  options: QuestionOption[];
  orderIndex: number;
  points: number;
}

interface SessionData {
  id: string;
  roomCode: string;
  status: "waiting" | "live" | "completed";
  currentQuestionIndex: number;
  questionStartedAt: string | null;
  startedAt: string | null;
  quiz: {
    title: string;
    topic: string;
    difficulty: string;
    timeLimit: number;
    totalQuestions: number;
    geolocationEnabled?: boolean;
  };
  host: {
    id: string;
    fullName: string;
  };
  currentQuestion: CurrentQuestion | null;
  participantCount: number;
}

interface SubmissionResult {
  isCorrect: boolean;
  score: number;
  correctOptionId: string;
  explanation: string | null;
}

export default function StudentPlayPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const supabase = createClient();

  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch session");
      }

      setSession(data.session);
      setHasJoined(data.isParticipant);

      // Reset answer state on new question
      if (data.session.currentQuestion?.id !== currentQuestionId) {
        setCurrentQuestionId(data.session.currentQuestion?.id || null);
        setSelectedOption(null);
        setHasAnswered(false);
        setSubmissionResult(null);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      toast.error("Failed to load session");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, currentQuestionId]);

  // Initial fetch
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`quiz-session-${sessionId}`)
      .on("broadcast", { event: "question_change" }, () => {
        // New question - refetch and reset state
        setSelectedOption(null);
        setHasAnswered(false);
        setSubmissionResult(null);
        fetchSession();
      })
      .on("broadcast", { event: "session_end" }, () => {
        toast.success("Quiz has ended!");
        fetchSession();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase, fetchSession]);

  // Also subscribe to database changes on quiz_sessions table
  useEffect(() => {
    const channel = supabase
      .channel(`db-quiz-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quiz_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log("Session updated:", payload);
          // Reset state and refetch when current_question_id changes
          setSelectedOption(null);
          setHasAnswered(false);
          setSubmissionResult(null);
          fetchSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase, fetchSession]);

  // Timer countdown - total quiz time
  useEffect(() => {
    if (
      !session ||
      session.status !== "live" ||
      !session.startedAt
    ) {
      setTimeRemaining(0);
      return;
    }

    const startTime = new Date(session.startedAt).getTime();
    const duration = session.quiz.timeLimit * 1000; // Total quiz time in milliseconds

    const updateTime = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setTimeRemaining(remaining);
      
      // Auto-end quiz when time runs out (this will be handled by the teacher)
      if (remaining === 0) {
        setTimeRemaining(0);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Join session
  const joinSession = async () => {
    setIsJoining(true);
    try {
      // Check if geolocation is required
      let locationData: { latitude?: number; longitude?: number } = {};
      
      if (session?.quiz.geolocationEnabled) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            if (!navigator.geolocation) {
              reject(new Error("Geolocation is not supported by your browser"));
              return;
            }

            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
          });

          locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
        } catch (locationError) {
          throw new Error(
            locationError instanceof Error
              ? locationError.message
              : "Failed to get your location. Please enable location access and try again."
          );
        }
      }

      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(locationData),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.requiresLocation) {
          throw new Error(
            data.message || "Location access is required to join this quiz"
          );
        }
        throw new Error(data.error || data.message || "Failed to join session");
      }

      setHasJoined(true);
      toast.success("You've joined the quiz!");
      fetchSession();
    } catch (error) {
      console.error("Error joining session:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to join session"
      );
    } finally {
      setIsJoining(false);
    }
  };

  // Submit answer
  const submitAnswer = async () => {
    if (!session?.currentQuestion || !selectedOption || hasAnswered) return;

    setIsSubmitting(true);
    setHasAnswered(true);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: session.currentQuestion.id,
          selectedOptionId: selectedOption,
          timeTaken: session.quiz.timeLimit - timeRemaining,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit answer");
      }

      setSubmissionResult(data.submission);
      setTotalScore((prev) => prev + data.submission.score);

      if (data.submission.isCorrect) {
        toast.success(`Correct! +${data.submission.score} points`);
      } else {
        toast.error("Incorrect answer");
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit"
      );
      setHasAnswered(false);
    } finally {
      setIsSubmitting(false);
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
        <Button onClick={() => router.push("/student/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Not joined yet
  if (!hasJoined && session.status !== "completed") {
    return (
      <div className="max-w-md mx-auto">
        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{session.quiz.title}</CardTitle>
            <CardDescription>
              Hosted by {session.host.fullName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">
                  {session.quiz.totalQuestions}
                </p>
                <p className="text-sm text-muted-foreground">Questions</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">
                  {Math.floor(session.quiz.timeLimit / 60)}m
                </p>
                <p className="text-sm text-muted-foreground">Time Limit</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="outline">{session.quiz.topic}</Badge>
              <Badge variant="outline">{session.quiz.difficulty}</Badge>
              <Badge variant="outline">
                {session.participantCount} joined
              </Badge>
              {session.quiz.geolocationEnabled && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <MapPin className="h-3 w-3 mr-1" />
                  Campus Only
                </Badge>
              )}
            </div>
            {session.quiz.geolocationEnabled && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    Location access required. You must be on Manav Rachna University campus to join.
                  </span>
                </p>
              </div>
            )}
            <Button
              size="lg"
              className="w-full"
              onClick={joinSession}
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Quiz"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Waiting for quiz to start
  if (session.status === "waiting") {
    return (
      <div className="max-w-md mx-auto text-center">
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 mb-6">
              <Hourglass className="h-10 w-10 text-amber-500 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Get Ready!</h2>
            <p className="text-muted-foreground mb-6">
              Waiting for the teacher to start the quiz...
            </p>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Quiz</p>
              <p className="font-semibold">{session.quiz.title}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz completed
  if (session.status === "completed") {
    return (
      <div className="max-w-md mx-auto text-center">
        <Card className="border-primary/20">
          <CardContent className="pt-12 pb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-6">
              <PartyPopper className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
            <p className="text-muted-foreground mb-6">
              Great job finishing the quiz!
            </p>
            <div className="p-6 bg-primary/5 rounded-xl mb-6">
              <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-4xl font-bold text-primary">{totalScore}</p>
              <p className="text-sm text-muted-foreground">Total Points</p>
            </div>
            <Button onClick={() => router.push("/student/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Live quiz - show current question
  const currentQuestion = session.currentQuestion;

  if (!currentQuestion) {
    return (
      <div className="max-w-md mx-auto text-center">
        <Card>
          <CardContent className="pt-12 pb-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading question...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with timer and score */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-lg px-4 py-2">
          Question {session.currentQuestionIndex + 1} /{" "}
          {session.quiz.totalQuestions}
        </Badge>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <span className="font-bold">{totalScore}</span>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              timeRemaining <= 5
                ? "bg-red-500/10 text-red-500"
                : "bg-muted"
            }`}
          >
            <Clock className="h-5 w-5" />
            <span className="text-2xl font-mono font-bold">
              {timeRemaining}
            </span>
          </div>
        </div>
      </div>

      {/* Timer progress */}
      <Progress
        value={(timeRemaining / session.quiz.timeLimit) * 100}
        className={`h-2 ${timeRemaining <= 60 ? "[&>div]:bg-red-500" : ""}`}
      />

      {/* Question Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl leading-relaxed">
            {currentQuestion.questionText}
          </CardTitle>
          <CardDescription>
            {currentQuestion.points} points
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOption === option.id;
            const isCorrect =
              submissionResult?.correctOptionId === option.id;
            const isWrong =
              hasAnswered && isSelected && !submissionResult?.isCorrect;

            let optionClass =
              "flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer";

            if (hasAnswered) {
              if (isCorrect) {
                optionClass += " border-green-500 bg-green-500/10";
              } else if (isWrong) {
                optionClass += " border-red-500 bg-red-500/10";
              } else {
                optionClass += " border-border opacity-50";
              }
            } else if (isSelected) {
              optionClass += " border-primary bg-primary/5";
            } else {
              optionClass +=
                " border-border hover:border-primary/50 hover:bg-muted/50";
            }

            return (
              <button
                key={option.id}
                className={optionClass}
                onClick={() => !hasAnswered && setSelectedOption(option.id)}
                disabled={hasAnswered || isSubmitting}
              >
                <span
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                    isSelected && !hasAnswered
                      ? "bg-primary text-primary-foreground"
                      : isCorrect
                      ? "bg-green-500 text-white"
                      : isWrong
                      ? "bg-red-500 text-white"
                      : "bg-muted"
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1 text-left text-lg">{option.text}</span>
                {hasAnswered && isCorrect && (
                  <Check className="h-6 w-6 text-green-500" />
                )}
                {isWrong && <X className="h-6 w-6 text-red-500" />}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Submit button or result */}
      {!hasAnswered ? (
        <Button
          size="lg"
          className="w-full h-14 text-lg"
          onClick={submitAnswer}
          disabled={!selectedOption || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Answer"
          )}
        </Button>
      ) : submissionResult ? (
        <Card
          className={
            submissionResult.isCorrect
              ? "border-green-500/50 bg-green-500/5"
              : "border-red-500/50 bg-red-500/5"
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              {submissionResult.isCorrect ? (
                <>
                  <Check className="h-6 w-6 text-green-500" />
                  <span className="font-semibold text-green-600">
                    Correct! +{submissionResult.score} points
                  </span>
                </>
              ) : (
                <>
                  <X className="h-6 w-6 text-red-500" />
                  <span className="font-semibold text-red-600">
                    Incorrect
                  </span>
                </>
              )}
            </div>
            {submissionResult.explanation && (
              <p className="text-sm text-muted-foreground">
                {submissionResult.explanation}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              Waiting for next question...
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

