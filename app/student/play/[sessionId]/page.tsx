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
  ChevronRight,
  List,
  LogOut,
} from "lucide-react";
import toast from "react-hot-toast";

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
import { useAntiCheat } from "@/hooks/use-anti-cheat";
import { useFullscreenCheck } from "@/hooks/use-fullscreen-check";

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
    questions?: CurrentQuestion[];
  };
  host: {
    id: string;
    fullName: string;
  };
  currentQuestion: CurrentQuestion | null;
  participantCount: number;
  questionsAnswered?: number;
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
  const [isMovingToNext, setIsMovingToNext] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [fullscreenGranted, setFullscreenGranted] = useState(false);
  const [fullscreenWarningTimer, setFullscreenWarningTimer] = useState(0);

  // Use screenfull library for reliable fullscreen detection
  const { isFullscreen, isSupported, requestFullscreen } = useFullscreenCheck();

  // Countdown timer for fullscreen warning (15 seconds)
  useEffect(() => {
    if (session?.status === "live" && fullscreenGranted && !isFullscreen) {
      setFullscreenWarningTimer(15); // 15 second countdown
      const interval = setInterval(() => {
        setFullscreenWarningTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setFullscreenWarningTimer(0);
    }
  }, [session?.status, fullscreenGranted, isFullscreen]);

  // Submit answer
  const submitAnswer = useCallback(async () => {
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
  }, [session, selectedOption, hasAnswered, sessionId, timeRemaining]);

  // Anti-cheat system
  const handleViolation = useCallback(
    (type: string) => {
      if (type === "max_violations" && session?.status === "live") {
        // Auto-submit current answer if available and exit
        if (selectedOption && !hasAnswered) {
          submitAnswer();
        }
        // Redirect after a delay
        setTimeout(() => {
          toast.error("Quiz terminated due to multiple violations.");
          router.push("/student/dashboard");
        }, 2000);
      }
    },
    [session, selectedOption, hasAnswered, submitAnswer, router]
  );

  // Only enable anti-cheat when quiz is live and fullscreen is granted
  const { violationCount } = useAntiCheat({
    sessionId,
    enableFullscreen: session?.status === "live" && fullscreenGranted,
    maxViolations: 15, // More lenient
    isActive: session?.status === "live" && fullscreenGranted,
    onViolation: handleViolation,
  });

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

      // Reset answer state on new question if question changed
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

  // Check fullscreen status periodically when quiz is live
  useEffect(() => {
    if (session?.status === "live") {
      const checkInterval = setInterval(() => {
        if (isFullscreen && !fullscreenGranted) {
          setFullscreenGranted(true);
          toast.success("Fullscreen detected! Quiz can now start.");
        }
      }, 1000); // Check every second

      return () => clearInterval(checkInterval);
    }
  }, [session?.status, isFullscreen, fullscreenGranted]);

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
      .on("broadcast", { event: "time_extended" }, (payload) => {
        // Time was extended, refetch to get updated startedAt
        fetchSession();
        toast.success(`Quiz time extended by ${Math.floor((payload.payload.seconds_added as number) / 60)} minute(s)!`);
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


  // Move to next question
  // Handle quiz submission
  const handleSubmitQuiz = () => {
    toast.success("Quiz submitted successfully!", { duration: 3000 });
    setTimeout(() => {
      router.push("/student/dashboard");
    }, 500);
  };

  const moveToNextQuestion = async () => {
    if (!session) return;

    setIsMovingToNext(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/next-question`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to move to next question");
      }

      if (data.isComplete) {
        toast.success("You've completed all questions!");
        await fetchSession();
      } else {
        // Reset state for new question
        setSelectedOption(null);
        setHasAnswered(false);
        setSubmissionResult(null);
        await fetchSession();
      }
    } catch (error) {
      console.error("Error moving to next question:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to move to next question"
      );
    } finally {
      setIsMovingToNext(false);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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

  // Not joined yet - allow joining during waiting or live status
  if (!hasJoined && session.status !== "completed") {
    return (
      <div className="max-w-md mx-auto">
        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{session.quiz.title}</CardTitle>
            <CardDescription>
              Hosted by {session.host.fullName}
            </CardDescription>
            {session.status === "live" && (
              <div className="mt-2">
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  Quiz in Progress
                </Badge>
              </div>
            )}
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
            {session.status === "live" && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  The quiz has already started. You can still join and answer questions from where the quiz is currently at.
                </p>
              </div>
            )}
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
              className="w-full cursor-pointer"
              onClick={joinSession}
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  {session.status === "live" ? "Join Quiz Now" : "Join Quiz"}
                </>
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
            <Button
              onClick={handleSubmitQuiz}
              size="lg"
              className="w-full"
            >
              Submit Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fullscreen requirement screen (before quiz starts)
  if (session && session.status === "live" && !fullscreenGranted) {
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

    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-2 border-primary/30">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl mb-2">Ready to Start Quiz?</CardTitle>
            <CardDescription>
              Review quiz details and enable fullscreen to begin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quiz Information */}
            <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
              <h3 className="font-semibold text-lg mb-3">Quiz Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Quiz Title</p>
                  <p className="font-semibold">{session.quiz.title}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Topic</p>
                  <Badge variant="outline" className="mt-1">
                    {session.quiz.topic}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Difficulty</p>
                  <Badge
                    variant="outline"
                    className={`mt-1 ${getDifficultyColor(session.quiz.difficulty)}`}
                  >
                    {session.quiz.difficulty}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Time Limit</p>
                  <p className="font-semibold">{session.quiz.timeLimit} minutes</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Questions</p>
                  <p className="font-semibold">{session.quiz.totalQuestions}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Points per Question</p>
                  <p className="font-semibold">10 points</p>
                </div>
              </div>
            </div>

            {/* Exam Rules */}
            <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Exam Rules & Guidelines:
              </h3>
              <ul className="space-y-2 text-sm text-left list-disc list-inside">
                <li>Fullscreen mode is required and will be enforced</li>
                <li>Stay focused - avoid switching tabs or windows</li>
                <li>You&apos;ll receive warnings for rule violations</li>
                <li>After 15 warnings, your quiz will be auto-submitted</li>
                <li>Focus on the quiz - all activities are monitored</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full"
                onClick={async () => {
                  if (isSupported) {
                    const success = await requestFullscreen();
                    if (success) {
                      setFullscreenGranted(true);
                      toast.success("Fullscreen enabled! Quiz starting...");
                    } else {
                      toast.error("Please allow fullscreen permission when prompted");
                    }
                  } else {
                    toast.error("Fullscreen is not supported in your browser. Please use F11 to enable fullscreen.");
                  }
                }}
              >
                Enable Fullscreen & Start Quiz
              </Button>

            </div>

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
      {/* Completion Banner - Show when all questions are answered */}
      {(session.questionsAnswered ?? 0) >= session.quiz.totalQuestions && (
        <Card className="border-2 border-primary/30 bg-linear-to-b from-primary/10 via-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    All Questions Completed
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your test has been submitted successfully
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                className="cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => router.push("/student/dashboard")}
              >
                <PartyPopper className="h-4 w-4 mr-2" />
                Acknowledge & Exit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fullscreen Warning Banner with Timer */}
      {session.status === "live" && fullscreenGranted && !isFullscreen && (
        <Card className="border-red-500/50 bg-red-500/10 mb-4 animate-pulse">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 animate-pulse" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    ⚠️ Fullscreen Mode Required - Warning Active
                  </p>
                  {fullscreenWarningTimer > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      <Clock className="h-3 w-3 mr-1" />
                      {fullscreenWarningTimer}s
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-red-600 dark:text-red-500">
                  You exited fullscreen mode. Please return to fullscreen immediately (F11) or your quiz may be auto-submitted.
                </p>
                {violationCount > 0 && (
                  <p className="text-xs font-bold text-red-700 dark:text-red-400 mt-2">
                    Violations: {violationCount} / 15 - {15 - violationCount} warnings remaining
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  if (isSupported) {
                    const success = await requestFullscreen();
                    if (success) {
                      toast.success("Fullscreen enabled");
                      setFullscreenWarningTimer(0);
                    } else {
                      toast.error("Please enable fullscreen manually (F11)");
                    }
                  } else {
                    toast.error("Please press F11 to enable fullscreen");
                  }
                }}
              >
                Enable Fullscreen Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Violation Warning Banner */}
      {violationCount > 0 && session.status === "live" && violationCount < 15 && (
        <Card className={`mb-4 ${violationCount >= 12
          ? "border-red-500/50 bg-red-500/10"
          : violationCount >= 8
            ? "border-orange-500/50 bg-orange-500/10"
            : "border-amber-500/50 bg-amber-500/10"
          }`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <AlertCircle className={`h-5 w-5 shrink-0 ${violationCount >= 12
                ? "text-red-600"
                : violationCount >= 8
                  ? "text-orange-600"
                  : "text-amber-600"
                }`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${violationCount >= 12
                  ? "text-red-700 dark:text-red-400"
                  : violationCount >= 8
                    ? "text-orange-700 dark:text-orange-400"
                    : "text-amber-700 dark:text-amber-400"
                  }`}>
                  {violationCount >= 12
                    ? "Final Warning"
                    : violationCount >= 8
                      ? "Warning"
                      : "Notice"}: {violationCount} violation(s) detected
                </p>
                <p className={`text-xs mt-1 ${violationCount >= 12
                  ? "text-red-600 dark:text-red-500"
                  : violationCount >= 8
                    ? "text-orange-600 dark:text-orange-500"
                    : "text-amber-600 dark:text-amber-500"
                  }`}>
                  Please stay in fullscreen and on this page. Your quiz will be auto-submitted after {15 - violationCount} more violation(s).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeRemaining <= 60
              ? "bg-red-500/10 text-red-500"
              : "bg-muted"
              }`}
          >
            <Clock className="h-5 w-5" />
            <span className="text-2xl font-mono font-bold">
              {formatTime(timeRemaining)}
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
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${isSelected && !hasAnswered
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
            {(session.questionsAnswered ?? 0) >= session.quiz.totalQuestions ? (
              // All questions completed - show prominent completion section
              <div className="space-y-4 mt-6">
                <div className="p-6 bg-primary/10 border-2 border-primary/20 rounded-xl text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-foreground">
                    All Questions Completed!
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You have answered all {session.quiz.totalQuestions} questions. Your test has been submitted.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1 cursor-pointer"
                      onClick={() => setShowAllQuestions(true)}
                    >
                      <List className="h-4 w-4 mr-2" />
                      Review All Questions
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleSubmitQuiz}
                    >
                      <PartyPopper className="h-4 w-4 mr-2" />
                      Submit Quiz
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full mt-4 cursor-pointer"
                onClick={moveToNextQuestion}
                disabled={isMovingToNext || (session.currentQuestionIndex >= session.quiz.totalQuestions - 1)}
              >
                {isMovingToNext ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : session.currentQuestionIndex >= session.quiz.totalQuestions - 1 ? (
                  "All Questions Completed"
                ) : (
                  <>
                    Next Question
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* All Questions Review Modal */}
      {showAllQuestions && session.quiz.questions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle>All Questions Review</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllQuestions(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-6">
              {session.quiz.questions.map((question, index) => (
                <Card key={question.id} className="border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Question {index + 1}: {question.questionText}
                    </CardTitle>
                    <CardDescription>{question.points} points</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={option.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border"
                        >
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold bg-muted">
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <span className="flex-1">{option.text}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
            <div className="p-6 border-t shrink-0">
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  setShowAllQuestions(false);
                  handleSubmitQuiz();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Submit Quiz
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

