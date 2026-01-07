"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  Check,
  ArrowLeft,
  Save,
  Wand2,
  GripVertical,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";

// Form schema for quiz metadata
const quizSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  topic: z.string().min(2, "Topic is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  timePerQuestion: z.number().min(10).max(300).default(30),
});

type QuizFormData = z.infer<typeof quizSchema>;

// Question type for the review UI
interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  questionText: string;
  options: QuestionOption[];
  explanation: string;
}

const DSA_TOPICS = [
  "Arrays",
  "Strings",
  "Linked Lists",
  "Stacks",
  "Queues",
  "Hash Tables",
  "Trees",
  "Binary Search Trees",
  "Heaps",
  "Graphs",
  "Sorting Algorithms",
  "Searching Algorithms",
  "Dynamic Programming",
  "Recursion",
  "Backtracking",
  "Greedy Algorithms",
  "Divide and Conquer",
  "Two Pointers",
  "Sliding Window",
  "Bit Manipulation",
];

export default function CreateQuizPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "manual" | null>(null);
  const [step, setStep] = useState<"form" | "review">("form");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quizData, setQuizData] = useState<QuizFormData | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      difficulty: "medium",
      timePerQuestion: 30,
    },
  });

  const selectedDifficulty = watch("difficulty");
  const selectedTopic = watch("topic");

  // Generate questions using AI
  const generateQuestions = async (data: QuizFormData) => {
    setIsGenerating(true);
    setQuizData(data);

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: data.topic,
          difficulty: data.difficulty,
          count: 5,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate questions");
      }

      const result = await response.json();

      // Transform API response to our Question format
      const generatedQuestions: Question[] = result.questions.map(
        (q: { question_text: string; options: { text: string; is_correct: boolean }[]; explanation: string }, index: number) => ({
          id: `q-${Date.now()}-${index}`,
          questionText: q.question_text,
          options: q.options.map((opt: { text: string; is_correct: boolean }, optIndex: number) => ({
            id: String.fromCharCode(97 + optIndex), // a, b, c, d
            text: opt.text,
            isCorrect: opt.is_correct,
          })),
          explanation: q.explanation || "",
        })
      );

      setQuestions(generatedQuestions);
      setStep("review");
      toast.success("Questions generated! Review and edit them below.");
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle form submission
  const onSubmit = (data: QuizFormData) => {
    setQuizData(data);
    if (mode === "ai") {
      generateQuestions(data);
    } else {
      // Manual mode: go directly to question editor
      if (questions.length === 0) {
        // Add first blank question
        addQuestion();
      }
      setStep("review");
    }
  };

  // Update a question
  const updateQuestion = (questionId: string, field: keyof Question, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, [field]: value } : q
      )
    );
  };

  // Update an option
  const updateOption = (questionId: string, optionId: string, field: keyof QuestionOption, value: string | boolean) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt) =>
                opt.id === optionId ? { ...opt, [field]: value } : opt
              ),
            }
          : q
      )
    );
  };

  // Set correct answer
  const setCorrectAnswer = (questionId: string, optionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt) => ({
                ...opt,
                isCorrect: opt.id === optionId,
              })),
            }
          : q
      )
    );
  };

  // Delete a question
  const deleteQuestion = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  // Add a new blank question
  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      questionText: "",
      options: [
        { id: "a", text: "", isCorrect: true },
        { id: "b", text: "", isCorrect: false },
        { id: "c", text: "", isCorrect: false },
        { id: "d", text: "", isCorrect: false },
      ],
      explanation: "",
    };
    setQuestions((prev) => [...prev, newQuestion]);
  };

  // Save quiz to database
  const saveQuiz = async () => {
    if (!quizData) return;
    if (questions.length === 0) {
      toast.error("Please add at least one question");
      return;
    }

    // Validate all questions have text and correct answers
    for (const q of questions) {
      if (!q.questionText.trim()) {
        toast.error("All questions must have text");
        return;
      }
      if (!q.options.some((opt) => opt.isCorrect)) {
        toast.error("Each question must have a correct answer");
        return;
      }
      if (q.options.some((opt) => !opt.text.trim())) {
        toast.error("All options must have text");
        return;
      }
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz: {
            title: quizData.title,
            description: quizData.description,
            topic: quizData.topic,
            difficulty: quizData.difficulty,
            timePerQuestion: quizData.timePerQuestion,
          },
          questions: questions.map((q, index) => ({
            questionText: q.questionText,
            options: q.options.map((opt) => ({
              id: opt.id,
              text: opt.text,
              is_correct: opt.isCorrect,
            })),
            explanation: q.explanation,
            orderIndex: index,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save quiz");
      }

      toast.success("Quiz created successfully!");
      router.push("/teacher/quizzes");
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save quiz");
    } finally {
      setIsSaving(false);
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

  // Mode selection screen
  if (mode === null) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/teacher/quizzes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create Quiz</h1>
            <p className="text-muted-foreground">
              Choose how you want to create your quiz
            </p>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="grid gap-6 md:grid-cols-2 mt-8">
          {/* AI Mode */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group"
            onClick={() => setMode("ai")}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>AI Generated</CardTitle>
              </div>
              <CardDescription>
                Let AI generate quiz questions automatically based on your topic and difficulty level.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Generate questions instantly
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Customize topic and difficulty
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Edit generated questions
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Manual Mode */}
          <Card 
            className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group"
            onClick={() => setMode("manual")}
          >
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Manual Entry</CardTitle>
              </div>
              <CardDescription>
                Create questions manually with full control over every question and option.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Full creative control
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Add questions one by one
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  Customize everything
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => {
          if (step === "review") {
            setStep("form");
          } else {
            setMode(null);
            setQuestions([]);
            setQuizData(null);
          }
        }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Quiz</h1>
          <p className="text-muted-foreground">
            {mode === "ai" 
              ? step === "form"
                ? "Set up your quiz and generate questions with AI"
                : "Review and edit your questions before saving"
              : step === "form"
                ? "Set up your quiz details"
                : "Add and edit your questions manually"
            }
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            step === "form"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
            1
          </span>
          Quiz Details
        </div>
        <div className="h-px w-8 bg-border" />
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            step === "review"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
            2
          </span>
          Review Questions
        </div>
      </div>

      {step === "form" ? (
        /* Quiz Form */
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mode === "ai" ? (
                <>
                  <Wand2 className="h-5 w-5 text-primary" />
                  Quiz Details
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-primary" />
                  Quiz Details
                </>
              )}
            </CardTitle>
            <CardDescription>
              {mode === "ai" 
                ? "Fill in the quiz details and let AI generate questions for you"
                : "Fill in the quiz details and then add questions manually"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Binary Search Trees Fundamentals"
                  className="h-11"
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of what this quiz covers..."
                  className="resize-none"
                  rows={3}
                  {...register("description")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Select
                    value={selectedTopic}
                    onValueChange={(value) => setValue("topic", value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a DSA topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {DSA_TOPICS.map((topic) => (
                        <SelectItem key={topic} value={topic}>
                          {topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.topic && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.topic.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <div className="flex gap-2">
                    {(["easy", "medium", "hard"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setValue("difficulty", level)}
                        className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium capitalize transition-all ${
                          selectedDifficulty === level
                            ? getDifficultyColor(level) + " border-current"
                            : "border-border/50 hover:border-primary/30"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timePerQuestion">
                  Time per Question (seconds)
                </Label>
                <Input
                  id="timePerQuestion"
                  type="number"
                  min={10}
                  max={300}
                  className="h-11 w-32"
                  {...register("timePerQuestion", { valueAsNumber: true })}
                />
              </div>

              <div className="pt-4 flex gap-3">
                {mode === "ai" ? (
                  <Button
                    type="submit"
                    size="lg"
                    className="gap-2"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Questions with AI
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="lg"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Continue to Add Questions
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setMode(null);
                    setQuestions([]);
                    setQuizData(null);
                  }}
                >
                  Change Mode
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Review Questions UI */
        <div className="space-y-6">
          {/* Quiz summary */}
          {quizData && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Quiz Title</p>
                    <p className="font-semibold">{quizData.title}</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div>
                    <p className="text-sm text-muted-foreground">Topic</p>
                    <p className="font-semibold">{quizData.topic}</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div>
                    <p className="text-sm text-muted-foreground">Difficulty</p>
                    <Badge
                      variant="outline"
                      className={getDifficultyColor(quizData.difficulty)}
                    >
                      {quizData.difficulty}
                    </Badge>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div>
                    <p className="text-sm text-muted-foreground">Questions</p>
                    <p className="font-semibold">{questions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Questions list */}
          <div className="space-y-4">
            {questions.map((question, index) => (
              <Card key={question.id} className="border-border/50 group">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                        {index + 1}
                      </div>
                      <GripVertical className="h-5 w-5 text-muted-foreground/50 cursor-grab" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question text */}
                  <div className="space-y-2">
                    <Label>Question</Label>
                    <Textarea
                      value={question.questionText}
                      onChange={(e) =>
                        updateQuestion(question.id, "questionText", e.target.value)
                      }
                      placeholder="Enter question text..."
                      className="resize-none"
                      rows={2}
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <Label>Options (select the correct answer)</Label>
                    <RadioGroup
                      value={question.options.find((o) => o.isCorrect)?.id || ""}
                      onValueChange={(value) =>
                        setCorrectAnswer(question.id, value)
                      }
                    >
                      {question.options.map((option) => (
                        <div
                          key={option.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            option.isCorrect
                              ? "border-green-500/50 bg-green-500/5"
                              : "border-border/50"
                          }`}
                        >
                          <RadioGroupItem
                            value={option.id}
                            id={`${question.id}-${option.id}`}
                            className="shrink-0"
                          />
                          <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-medium uppercase shrink-0">
                            {option.id}
                          </span>
                          <Input
                            value={option.text}
                            onChange={(e) =>
                              updateOption(
                                question.id,
                                option.id,
                                "text",
                                e.target.value
                              )
                            }
                            placeholder={`Option ${option.id.toUpperCase()}`}
                            className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                          />
                          {option.isCorrect && (
                            <Check className="h-4 w-4 text-green-600 shrink-0" />
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Explanation */}
                  <div className="space-y-2">
                    <Label>Explanation (shown after answering)</Label>
                    <Textarea
                      value={question.explanation}
                      onChange={(e) =>
                        updateQuestion(question.id, "explanation", e.target.value)
                      }
                      placeholder="Explain why the correct answer is correct..."
                      className="resize-none"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add question button */}
          <Button
            variant="outline"
            className="w-full border-dashed gap-2"
            onClick={addQuestion}
          >
            <Plus className="h-4 w-4" />
            Add Question
          </Button>

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setStep("form");
                // If manual mode and no questions, clear quiz data to start fresh
                if (mode === "manual" && questions.length === 0) {
                  setQuizData(null);
                }
              }}
              className="sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {mode === "manual" ? "Details" : "Edit"}
            </Button>
            {mode === "ai" && (
              <Button
                variant="outline"
                onClick={() => generateQuestions(quizData!)}
                disabled={isGenerating || !quizData}
                className="sm:w-auto"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Regenerate All
              </Button>
            )}
            <Button
              onClick={saveQuiz}
              disabled={isSaving || questions.length === 0}
              className="sm:w-auto sm:ml-auto gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Quiz
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

