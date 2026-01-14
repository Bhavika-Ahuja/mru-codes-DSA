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
import { cn } from "@/lib/utils";

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
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [isMovingToNext, setIsMovingToNext] = useState(false);
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [fullscreenGranted, setFullscreenGranted] = useState(false);
  const [showQuestionSidebar, setShowQuestionSidebar] = useState(false);
  const [questionSubmissions, setQuestionSubmissions] = useState<Map<string, string>>(new Map());
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

  // Save answer silently (don't show correct/incorrect)
  const saveAnswer = useCallback(async () => {
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
        throw new Error(data.error || "Failed to save answer");
      }

      // Save the answer silently - don't show correct/incorrect
      setTotalScore((prev) => prev + data.submission.score);
      setQuestionSubmissions(prev => new Map(prev).set(session.currentQuestion!.id, selectedOption));
    } catch (error) {
      console.error("Error saving answer:", error);
      setHasAnswered(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [session, selectedOption, hasAnswered, sessionId, timeRemaining]);

  // Jump to a specific question - optimized for speed
  const jumpToQuestion = async (questionIndex: number) => {
    if (!session || questionIndex < 0 || questionIndex >= session.quiz.totalQuestions) return;
    if (isMovingToNext) return; // Prevent double clicks

    setIsMovingToNext(true);

    // Save current answer if selected (but don't submit if not saved yet)
    if (selectedOption && session.currentQuestion && !hasAnswered) {
      setQuestionSubmissions(prev => new Map(prev).set(session.currentQuestion!.id, selectedOption));
    }

    // Optimistic UI update - update state immediately for instant feedback
    const targetQuestion = session.quiz.questions?.[questionIndex];
    if (targetQuestion) {
      setSession(prev => prev ? {
        ...prev,
        currentQuestionIndex: questionIndex,
        currentQuestion: targetQuestion,
      } : null);

      // Load saved answer for the new question
      const savedAnswer = questionSubmissions.get(targetQuestion.id);
      if (savedAnswer) {
        setSelectedOption(savedAnswer);
        setHasAnswered(true);
      } else {
        setSelectedOption(null);
        setHasAnswered(false);
      }
    }

    setShowQuestionSidebar(false);

    // Background API call - don't block UI
    try {
      const response = await fetch(`/api/sessions/${sessionId}/jump-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to jump to question");
      }

      // Silently sync in background
      fetchSession().catch(err => console.error("Background sync error:", err));
    } catch (error) {
      console.error("Error jumping to question:", error);
      // Revert on error
      fetchSession();
    } finally {
      setIsMovingToNext(false);
    }
  };

  // Anti-cheat system
  const handleViolation = useCallback(
    (type: string) => {
      if (type === "max_violations" && session?.status === "live") {
        // Auto-save current answer if available and exit
        if (selectedOption && !hasAnswered) {
          saveAnswer();
        }
        // Redirect after a delay
        setTimeout(() => {
          toast.error("Quiz terminated due to multiple violations.");
          router.push("/student/dashboard");
        }, 2000);
      }
    },
    [session, selectedOption, hasAnswered, saveAnswer, router]
  );

  // Only enable anti-cheat when quiz is live and fullscreen is granted
  const { violationCount } = useAntiCheat({
    sessionId,
    enableFullscreen: session?.status === "live" && fullscreenGranted,
    maxViolations: 15, // More lenient
    isActive: session?.status === "live" && fullscreenGranted,
    onViolation: handleViolation,
  });

  // Fetch session data and load saved answers
  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch session");
      }

      setSession(data.session);
      setHasJoined(data.isParticipant);

      // Load saved submissions for all questions
      const submissionsMap = new Map<string, string>();
      if (data.session.quiz?.questions) {
        const submissionsResponse = await fetch(`/api/sessions/${sessionId}/submissions`);
        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          if (submissionsData.submissions) {
            submissionsData.submissions.forEach((sub: { questionId: string; selectedOptionId: string }) => {
              if (sub.selectedOptionId) {
                submissionsMap.set(sub.questionId, sub.selectedOptionId);
              }
            });
            setQuestionSubmissions(submissionsMap);
          }
        }
      }

      // Reset answer state on new question if question changed
      if (data.session.currentQuestion?.id !== currentQuestionId) {
        setCurrentQuestionId(data.session.currentQuestion?.id || null);
        const currentQId = data.session.currentQuestion?.id;

        // Load saved answer for current question if exists
        if (currentQId && submissionsMap.has(currentQId)) {
          setSelectedOption(submissionsMap.get(currentQId) || null);
          setHasAnswered(true);
        } else {
          setSelectedOption(null);
          setHasAnswered(false);
        }
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

        if (data.alreadyCompleted) {
          throw new Error(
            data.error ||
            "You have already completed this quiz and cannot join it again."
          );
        }

        throw new Error(data.error || data.message || "Failed to join session");
      }

      setHasJoined(true);
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
    <div className="max-w-6xl mx-auto space-y-6 p-4">
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
                Submit Quiz & Exit
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

      {/* Main Content Area */}
      <div className="flex gap-4 relative">
        {/* Question Navigation Sidebar */}
        {showQuestionSidebar && session.quiz.questions && (
          <div className="hidden md:block w-20 shrink-0">
            <Card className="sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {session.quiz.questions.map((q, index) => {
                  const isCurrent = index === session.currentQuestionIndex;
                  const hasAnswer = questionSubmissions.has(q.id);
                  return (
                    <button
                      key={q.id}
                      onClick={() => jumpToQuestion(index)}
                      className={cn(
                        "w-full aspect-square rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer active:scale-90",
                        isCurrent
                          ? "bg-primary text-primary-foreground shadow-md"
                          : hasAnswer
                            ? "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                            : "bg-muted hover:bg-muted/80 hover:scale-105"
                      )}
                      disabled={isMovingToNext}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mobile Question Navigation */}
        {showQuestionSidebar && session.quiz.questions && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowQuestionSidebar(false)}>
            <div className="absolute bottom-0 left-0 right-0 bg-background border-t rounded-t-xl p-4 max-h-[60vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Questions</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowQuestionSidebar(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {session.quiz.questions.map((q, index) => {
                  const isCurrent = index === session.currentQuestionIndex;
                  const hasAnswer = questionSubmissions.has(q.id);
                  return (
                    <button
                      key={q.id}
                      onClick={() => jumpToQuestion(index)}
                      className={cn(
                        "aspect-square rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer active:scale-90",
                        isCurrent
                          ? "bg-primary text-primary-foreground shadow-md"
                          : hasAnswer
                            ? "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                            : "bg-muted hover:bg-muted/80"
                      )}
                      disabled={isMovingToNext}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 space-y-4">
          {/* Header with timer and score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer transition-all hover:scale-110 active:scale-90"
                onClick={() => jumpToQuestion(Math.max(0, session.currentQuestionIndex - 1))}
                disabled={session.currentQuestionIndex === 0 || isMovingToNext}
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
              <Badge variant="outline" className="text-lg px-4 py-2">
                Question {session.currentQuestionIndex + 1} /{" "}
                {session.quiz.totalQuestions}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer transition-all hover:scale-110 active:scale-90"
                onClick={() => jumpToQuestion(Math.min(session.quiz.totalQuestions - 1, session.currentQuestionIndex + 1))}
                disabled={session.currentQuestionIndex >= session.quiz.totalQuestions - 1 || isMovingToNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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

                let optionClass =
                  "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-150 cursor-pointer active:scale-[0.98]";

                if (isSelected) {
                  optionClass += " border-foreground bg-primary/10 shadow-sm";
                } else {
                  optionClass +=
                    " border-border hover:border-primary/50 hover:bg-muted/50 hover:scale-[1.01]";
                }

                return (
                  <button
                    key={option.id}
                    className={`${optionClass} w-full`}
                    onClick={() => setSelectedOption(option.id)}
                    disabled={isSubmitting}
                  >
                    <span
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                        }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 text-left text-lg">{option.text}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Proceed button */}
          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1 h-14 text-lg cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={saveAnswer}
              disabled={!selectedOption || isSubmitting || hasAnswered}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Proceed"
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 cursor-pointer transition-all hover:scale-105 active:scale-95"
              onClick={() => setShowQuestionSidebar(!showQuestionSidebar)}
            >
              <List className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => jumpToQuestion(Math.max(0, session.currentQuestionIndex - 1))}
              disabled={session.currentQuestionIndex === 0 || isMovingToNext}
            >
              <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
              Previous
            </Button>
            <Button
              variant="outline"
              className="flex-1 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => jumpToQuestion(Math.min(session.quiz.totalQuestions - 1, session.currentQuestionIndex + 1))}
              disabled={session.currentQuestionIndex >= session.quiz.totalQuestions - 1 || isMovingToNext}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Completion message */}
          {(session.questionsAnswered ?? 0) >= session.quiz.totalQuestions && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">All Questions Completed!</h3>
                  <p className="text-sm text-muted-foreground">
                    You have answered all {session.quiz.totalQuestions} questions.
                  </p>
                  <Button
                    size="lg"
                    className="w-full cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    onClick={handleSubmitQuiz}
                  >
                    <PartyPopper className="h-4 w-4 mr-2" />
                    Submit Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
                className="w-full cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
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

