"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Trophy,
  Clock,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface Question {
  id: string;
  questionText: string;
  topic: string;
  difficulty: string;
  points: number;
  options: {
    id: string;
    text: string;
    is_correct: boolean;
  }[];
  explanation: string | null;
}

interface Answer {
  questionId: string;
  optionId: string | null;
  isCorrect: boolean;
  score: number;
  submittedAt: string;
}

interface ReviewData {
  sessionId: string;
  quizTitle: string;
  topic: string;
  difficulty: string;
  totalScore: number;
  maxScore: number;
  accuracy: number;
  questionsAnswered: number;
  totalQuestions: number;
  completedAt: string;
  questions: Question[];
  answers: Answer[];
}

export default function QuizReviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReviewData();
  }, [sessionId]);

  const fetchReviewData = async () => {
    try {
      const response = await fetch(`/api/quiz-history/${sessionId}`);
      const data = await response.json();

      if (response.ok) {
        setReviewData(data.review);
      } else {
        console.error("Error fetching review:", data.error);
      }
    } catch (error) {
      console.error("Error fetching review:", error);
    } finally {
      setIsLoading(false);
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

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600";
    if (accuracy >= 60) return "text-amber-600";
    return "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Quiz review not found</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/student/quiz-history")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to History
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/student/quiz-history")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{reviewData.quizTitle}</h1>
          <p className="text-muted-foreground mt-1">Quiz Review</p>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Quiz Summary</CardTitle>
          <CardDescription>Your performance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <span className="text-sm font-medium text-muted-foreground">Score</span>
              </div>
              <p className="text-2xl font-bold">
                {reviewData.totalScore} / {reviewData.maxScore}
              </p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-muted-foreground">Accuracy</span>
              </div>
              <p className={`text-2xl font-bold ${getAccuracyColor(reviewData.accuracy)}`}>
                {reviewData.accuracy.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Questions</span>
              </div>
              <p className="text-2xl font-bold">
                {reviewData.questionsAnswered} / {reviewData.totalQuestions}
              </p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Completed</span>
              </div>
              <p className="text-sm font-semibold">
                {new Date(reviewData.completedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Badge variant="outline" className={getDifficultyColor(reviewData.difficulty)}>
              {reviewData.difficulty}
            </Badge>
            <Badge variant="outline">{reviewData.topic}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Questions Review */}
      <Card>
        <CardHeader>
          <CardTitle>Questions & Answers</CardTitle>
          <CardDescription>Review all questions and your answers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {reviewData.questions.map((question, index) => {
            const answer = reviewData.answers.find((a) => a.questionId === question.id);
            const selectedOption = answer
              ? question.options.find((opt) => opt.id === answer.optionId)
              : null;
            const correctOption = question.options.find((opt) => opt.is_correct);

            return (
              <div key={question.id} className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-muted-foreground">
                        Question {index + 1}
                      </span>
                      <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                        {question.difficulty}
                      </Badge>
                      <Badge variant="outline">{question.points} points</Badge>
                      {answer && (
                        <Badge
                          variant={answer.isCorrect ? "default" : "destructive"}
                          className={
                            answer.isCorrect
                              ? "bg-green-500 hover:bg-green-600"
                              : "bg-red-500 hover:bg-red-600"
                          }
                        >
                          {answer.isCorrect ? "Correct" : "Incorrect"}
                        </Badge>
                      )}
                      {!answer && (
                        <Badge variant="outline" className="bg-gray-500/10">
                          Not Answered
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-4">{question.questionText}</h3>
                  </div>
                </div>

                <div className="space-y-2">
                  {question.options.map((option, optIndex) => {
                    const isSelected = selectedOption?.id === option.id;
                    const isCorrect = option.is_correct;
                    const showAsCorrect = isCorrect;
                    const showAsWrong = isSelected && !isCorrect;

                    let optionClass =
                      "flex items-center gap-3 p-3 rounded-lg border-2 transition-all";
                    if (showAsCorrect) {
                      optionClass += " border-green-500 bg-green-500/10";
                    } else if (showAsWrong) {
                      optionClass += " border-red-500 bg-red-500/10";
                    } else {
                      optionClass += " border-border bg-muted/30";
                    }

                    return (
                      <div key={option.id} className={optionClass}>
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                            showAsCorrect
                              ? "bg-green-500 text-white"
                              : showAsWrong
                              ? "bg-red-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{option.text}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {showAsCorrect && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                          {showAsWrong && <XCircle className="h-5 w-5 text-red-600" />}
                          {isSelected && (
                            <Badge variant="outline" className="text-xs">
                              Your Answer
                            </Badge>
                          )}
                          {showAsCorrect && !isSelected && (
                            <Badge variant="outline" className="text-xs bg-green-500/20">
                              Correct Answer
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {question.explanation && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">
                      Explanation:
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      {question.explanation}
                    </p>
                  </div>
                )}

                {answer && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Points earned:</span> {answer.score} /{" "}
                      {question.points}
                    </p>
                  </div>
                )}

                {index < reviewData.questions.length - 1 && <Separator className="my-6" />}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
