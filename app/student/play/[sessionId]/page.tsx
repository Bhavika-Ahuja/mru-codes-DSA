"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  Trophy,
  Loader2,
  AlertCircle,
  Check,
  Hourglass,
  PartyPopper,
  MapPin,
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
  participantScore?: number;
}

function getSafeTimeLimitSeconds(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 900; // 15 minutes default
}


export default function StudentPlayPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const supabase = createClient();

  // Detect mobile device (used to relax fullscreen requirements on phones)
  const [isMobile, setIsMobile] = useState(false);

  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [fullscreenGranted, setFullscreenGranted] = useState(false);
  const [questionSubmissions, setQuestionSubmissions] = useState<Map<string, string>>(new Map());
  const [fullscreenWarningTimer, setFullscreenWarningTimer] = useState(0);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>([]);

  const timeLimitSeconds = getSafeTimeLimitSeconds(session?.quiz?.timeLimit);
  const quizTimeLimitMinutes = Math.max(1, Math.round(timeLimitSeconds / 60));
  const pointsPerQuestionLabel = (() => {
    if (!session?.quiz.questions || session.quiz.questions.length === 0) return "-";
    const pts = session.quiz.questions
      .map((q) => q.points)
      .filter((p): p is number => typeof p === "number" && Number.isFinite(p));
    if (pts.length === 0) return "-";
    const unique = Array.from(new Set(pts));
    if (unique.length === 1) return `${unique[0]} points`;
    const min = Math.min(...unique);
    const max = Math.max(...unique);
    return `Varies (${min}-${max})`;
  })();

  // Use screenfull library for reliable fullscreen detection
  const { isFullscreen, isSupported, requestFullscreen } = useFullscreenCheck();

  // Detect if the user is on a mobile device (user-agent + viewport width)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent || navigator.vendor || "";
    const mobileRegex = /Mobi|Android|iPhone|iPad|iPod|Mobile/i;
    const isMobileDevice =
      mobileRegex.test(ua) || window.innerWidth <= 768;

    setIsMobile(isMobileDevice);
  }, []);

  // Cache current user id (used for realtime score updates)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, [supabase]);

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

  // Fetch session data and load any previously saved answers
  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch session");
      }

      setSession(data.session);
      setHasJoined(data.isParticipant);
      if (typeof data.session?.participantScore === "number") {
        setTotalScore(data.session.participantScore);
      }

      // Load saved submissions for all questions (e.g. if student refreshes)
      const submissionsMap = new Map<string, string>();
      if (data.session.quiz?.questions) {
        const submissionsResponse = await fetch(
          `/api/sessions/${sessionId}/submissions`
        );
        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          if (submissionsData.submissions) {
            submissionsData.submissions.forEach(
              (sub: { questionId: string; selectedOptionId: string }) => {
                if (sub.selectedOptionId) {
                  submissionsMap.set(sub.questionId, sub.selectedOptionId);
                }
              }
            );
          }
        }
      }

      setQuestionSubmissions(submissionsMap);
    } catch (error) {
      console.error("Error fetching session:", error);
      toast.error("Failed to load session");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Submit all answers for this quiz in one go
  const saveAnswer = useCallback(async () => {
    if (!session) return;

    if (questionSubmissions.size === 0) {
      toast.error("Please answer at least one question before submitting.");
      return;
    }

    if (isSubmittingQuiz) return;

    setIsSubmittingQuiz(true);

    try {
      const answers = Array.from(questionSubmissions.entries());

      for (const [questionId, optionId] of answers) {
        const response = await fetch(`/api/sessions/${sessionId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId,
            selectedOptionId: optionId,
            timeTaken: Math.max(0, timeLimitSeconds - timeRemaining),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to submit answer");
        }

        const alreadySubmitted = data?.alreadySubmitted === true;

        // Only add score for fresh submissions (server also tracks this)
        if (
          !alreadySubmitted &&
          data?.submission &&
          typeof data.submission.score === "number"
        ) {
          setTotalScore((prev) => prev + data.submission.score);
        }
      }

      toast.success("Quiz submitted successfully!", { duration: 2500 });
      setTimeout(() => {
        router.push("/student/dashboard");
      }, 900);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit quiz. Please try again."
      );
    } finally {
      setIsSubmittingQuiz(false);
    }
  }, [
    session,
    questionSubmissions,
    isSubmittingQuiz,
    sessionId,
    timeLimitSeconds,
    timeRemaining,
    router,
  ]);

  // Anti-cheat system
  const handleViolation = useCallback(
    (type: string) => {
      if (type === "max_violations" && session?.status === "live") {
        // Auto-submit whatever answers the student has selected so far, then exit
        void saveAnswer();
        setTimeout(() => {
          toast.error("Quiz terminated due to multiple violations.");
          router.push("/student/dashboard");
        }, 2000);
      }
    },
    [session, saveAnswer, router]
  );

  // Only enable anti-cheat when quiz is live and fullscreen is granted
  // On mobile, we keep anti-cheat active but do NOT enforce fullscreen.
  const isFullscreenEnforced =
    !isMobile && session?.status === "live" && fullscreenGranted;
  const isAntiCheatActive =
    session?.status === "live" && (fullscreenGranted || isMobile);

  const { violationCount } = useAntiCheat({
    sessionId,
    enableFullscreen: isFullscreenEnforced,
    maxViolations: 15, // More lenient
    isActive: isAntiCheatActive,
    onViolation: handleViolation,
  });

  // Initial fetch
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Check fullscreen status periodically when quiz is live
  useEffect(() => {
    if (session?.status === "live" && !isMobile) {
      const checkInterval = setInterval(() => {
        if (isFullscreen && !fullscreenGranted) {
          setFullscreenGranted(true);
          toast.success("Fullscreen detected! Quiz can now start.");
        }
      }, 1000); // Check every second

      return () => clearInterval(checkInterval);
    }
  }, [session?.status, isFullscreen, fullscreenGranted, isMobile]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`quiz-session-${sessionId}`)
      .on("broadcast", { event: "score_update" }, (payload) => {
        const p = payload.payload as { user_id?: unknown; score?: unknown };
        if (currentUserId && p.user_id === currentUserId && typeof p.score === "number") {
          setTotalScore(p.score);
        }
      })
      .on("broadcast", { event: "question_change" }, () => {
        // Host moved to another question – for scrollable view we just refresh metadata
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
  }, [sessionId, supabase, fetchSession, currentUserId]);

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
          // Refetch when current_question_id or status changes
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
    const duration = getSafeTimeLimitSeconds(session.quiz.timeLimit) * 1000; // Total quiz time in milliseconds

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

  // When all questions are answered, reset confirmation state
  useEffect(() => {
    if (!session?.quiz.questions) return;
    const total = session.quiz.questions.length;
    if (total > 0 && questionSubmissions.size >= total) {
      setIsConfirmingSubmit(false);
      setUnansweredQuestions([]);
    }
  }, [session?.quiz.questions, questionSubmissions]);

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


  // Final quiz submission handler (handles confirmation and unanswered list)
  const handleSubmitQuiz = () => {
    if (!session) return;

    const unanswered =
      session.quiz.questions?.reduce<number[]>((acc, q, index) => {
        if (!questionSubmissions.has(q.id)) {
          acc.push(index + 1);
        }
        return acc;
      }, []) ?? [];

    // No unanswered questions: submit immediately
    if (unanswered.length === 0) {
      setIsConfirmingSubmit(false);
      setUnansweredQuestions([]);
      void saveAnswer();
      return;
    }

    // First click with unanswered questions: warn and require confirmation
    if (!isConfirmingSubmit) {
      setIsConfirmingSubmit(true);
      setUnansweredQuestions(unanswered);
      toast(
        `You have unanswered questions: ${unanswered.join(
          ", "
        )}. Tap Submit again to submit anyway.`,
        { icon: "⚠️" }
      );
      return;
    }

    // Second click: user confirmed, submit anyway
    setIsConfirmingSubmit(false);
    setUnansweredQuestions([]);
    void saveAnswer();
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
                  {quizTimeLimitMinutes}m
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
  if (session && session.status === "live" && !fullscreenGranted && !isMobile) {
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
                  <p className="font-semibold">{quizTimeLimitMinutes} minutes</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Questions</p>
                  <p className="font-semibold">{session.quiz.totalQuestions}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Points per Question</p>
                  <p className="font-semibold">{pointsPerQuestionLabel}</p>
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
    <>
      <div className="max-w-6xl mx-auto space-y-6 p-4 pb-28 sm:pb-6">
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
        {session.status === "live" && fullscreenGranted && !isFullscreen && !isMobile && (
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
        <div className="flex-1 space-y-4">
          {/* Header with timer, score, and answered count (always visible while scrolling) */}
          <div className="sticky top-4 z-40">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="outline" className="text-sm sm:text-lg px-3 py-2 sm:px-4 sm:py-2 truncate">
                  Questions Answered: {questionSubmissions.size}/{session.quiz.totalQuestions}
                </Badge>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span className="font-bold tabular-nums">{totalScore}</span>
                </div>
                <div
                  className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg ${timeRemaining <= 60 ? "bg-red-500/10 text-red-500" : "bg-muted"
                    }`}
                >
                  <Clock className="h-5 w-5" />
                  <span className="text-xl sm:text-2xl font-mono font-bold tabular-nums">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Timer progress */}
          <Progress
            value={(timeRemaining / timeLimitSeconds) * 100}
            className={`h-2 ${timeRemaining <= 60 ? "[&>div]:bg-red-500" : ""}`}
          />

          {/* Question list - all questions scrollable */}
          <div className="space-y-4">
            {session.quiz.questions?.map((question, qIndex) => {
              const selectedId = questionSubmissions.get(question.id) ?? null;
              return (
                <Card key={question.id} className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl leading-relaxed">
                      Q{qIndex + 1}. {question.questionText}
                    </CardTitle>
                    <CardDescription>
                      {question.points} points
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {question.options.map((option, index) => {
                      const isSelected = selectedId === option.id;
                      let optionClass =
                        "flex items-center gap-4 p-4 sm:p-4 rounded-xl border-2 transition-all duration-150 cursor-pointer active:scale-[0.98] text-left";

                      if (isSelected) {
                        optionClass +=
                          " border-foreground bg-primary/10 shadow-sm";
                      } else {
                        optionClass +=
                          " border-border hover:border-primary/50 hover:bg-muted/50 hover:scale-[1.01]";
                      }

                      return (
                        <button
                          key={option.id}
                          className={`${optionClass} w-full`}
                          onClick={() =>
                            setQuestionSubmissions((prev) => {
                              const next = new Map(prev);
                              next.set(question.id, option.id);
                              return next;
                            })
                          }
                          disabled={isSubmittingQuiz || session.status === "completed"}
                          aria-label={`Select option ${String.fromCharCode(
                            65 + index
                          )} for question ${qIndex + 1}`}
                        >
                          <span
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                              }`}
                          >
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="flex-1 text-base sm:text-lg leading-snug wrap-break-word">
                            {option.text}
                          </span>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Completion message (desktop) */}
          {questionSubmissions.size >= session.quiz.totalQuestions && (
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
                    className="w-full h-16 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    onClick={handleSubmitQuiz}
                    disabled={isSubmittingQuiz}
                  >
                    {isSubmittingQuiz ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <PartyPopper className="h-4 w-4 mr-2" />
                        Submit Quiz
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Desktop Submit block (always full-width, handles unanswered confirmation) */}
          {questionSubmissions.size < session.quiz.totalQuestions && (
            <div className="hidden sm:flex flex-col gap-2 mt-4">
              {isConfirmingSubmit && unansweredQuestions.length > 0 && (
                <div className="p-4 border border-amber-500/40 bg-amber-500/10 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-semibold mb-1">Warning: Unanswered questions</p>
                  <p className="text-xs sm:text-sm">
                    These questions are unanswered: {unansweredQuestions.join(", ")}. Tap{" "}
                    <span className="font-semibold">Submit Anyway</span> to submit
                    without answering them.
                  </p>
                </div>
              )}
              <Button
                size="lg"
                className="w-full h-16"
                onClick={handleSubmitQuiz}
                disabled={isSubmittingQuiz || questionSubmissions.size === 0}
              >
                {isSubmittingQuiz ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>{isConfirmingSubmit ? "Submit Anyway" : "Submit Quiz"}</>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky action bar - single Submit button */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 backdrop-blur sm:hidden",
          "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        <div className="max-w-6xl mx-auto p-3 flex items-center gap-2">
          <Button
            size="lg"
            className="h-16 flex-1"
            onClick={handleSubmitQuiz}
            disabled={isSubmittingQuiz || questionSubmissions.size === 0}
          >
            {isSubmittingQuiz ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>{isConfirmingSubmit ? "Submit Anyway" : "Submit Quiz"}</>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

