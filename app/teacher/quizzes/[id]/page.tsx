"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Clock,
  Check,
  Edit,
  Play,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuestionOption {
  id: string;
  text: string;
  is_correct?: boolean;
}

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  points: number;
  orderIndex: number;
  options: QuestionOption[];
  explanation: string | null;
}

interface QuizData {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  difficulty: string;
  timeLimit: number;
  status: string;
  questions: Question[];
}

export default function TeacherQuizViewPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuiz() {
      try {
        const response = await fetch(`/api/quizzes/${quizId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to load quiz");
          return;
        }

        setQuiz(data.quiz);
      } catch {
        setError("Failed to load quiz");
      } finally {
        setIsLoading(false);
      }
    }

    fetchQuiz();
  }, [quizId]);

  const startSession = async () => {
    if (!quiz) return;
    setIsStarting(true);
    try {
      const response = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quiz.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to start session");
      router.push(`/teacher/session/${data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="space-y-4">
        <Link href="/teacher/quizzes">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Quizzes
          </Button>
        </Link>
        <Card className="border-destructive/50">
          <CardContent className="py-10 text-center">
            <p className="text-destructive font-medium">
              {error || "Quiz not found"}
            </p>
            <Link href="/teacher/quizzes">
              <Button variant="outline" className="mt-4">
                Back to Quiz Library
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timeLimitMinutes = Math.floor((quiz.timeLimit || 900) / 60);
  const difficultyColor =
    quiz.difficulty === "easy"
      ? "bg-green-500/10 text-green-600 border-green-500/20"
      : quiz.difficulty === "medium"
        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
        : "bg-red-500/10 text-red-600 border-red-500/20";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link href="/teacher/quizzes">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Quizzes
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/teacher/quizzes/create?quizId=${quiz.id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Quiz
            </Button>
          </Link>
          <Button
            size="sm"
            className="gap-2"
            onClick={startSession}
            disabled={isStarting || quiz.questions.length === 0}
          >
            {isStarting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Start Session
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{quiz.title}</CardTitle>
          {quiz.description && (
            <CardDescription className="text-base">
              {quiz.description}
            </CardDescription>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Badge variant="outline" className={difficultyColor}>
              {quiz.difficulty}
            </Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {quiz.questions.length} questions
            </span>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {timeLimitMinutes} min
            </span>
            <span className="text-sm text-muted-foreground">
              Topic: {quiz.topic}
            </span>
            <Badge variant="secondary">{quiz.status}</Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Questions</h2>
        {quiz.questions
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((q, index) => {
            const options = Array.isArray(q.options) ? q.options : [];
            return (
              <Card key={q.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">
                      Q{index + 1}.
                    </span>
                    <span>{q.questionText}</span>
                    <Badge variant="outline" className="shrink-0 ml-auto">
                      {q.points} pts
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-2">
                    {options.map((opt) => (
                      <li
                        key={opt.id}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                          opt.is_correct
                            ? "border-green-500/50 bg-green-500/10"
                            : "border-border bg-muted/30"
                        }`}
                      >
                        <span className="font-medium">{opt.id}.</span>
                        <span className="flex-1">{opt.text}</span>
                        {opt.is_correct && (
                          <Badge className="bg-green-600 shrink-0 gap-1">
                            <Check className="h-3 w-3" />
                            Correct
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                  {q.explanation && (
                    <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                      <span className="font-medium text-muted-foreground">
                        Explanation:{" "}
                      </span>
                      {q.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
