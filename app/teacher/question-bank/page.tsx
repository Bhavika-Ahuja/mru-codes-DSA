"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Copy, Edit, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Question {
  id: string;
  questionText: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  options: { id: string; text: string; is_correct: boolean }[];
  explanation: string | null;
  usageCount: number;
  createdAt: string;
}

interface QuestionFormData {
  questionText: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  options: { id: string; text: string; is_correct: boolean }[];
  explanation: string;
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<QuestionFormData>({
    questionText: "",
    topic: "",
    difficulty: "medium",
    options: [
      { id: "a", text: "", is_correct: true },
      { id: "b", text: "", is_correct: false },
      { id: "c", text: "", is_correct: false },
      { id: "d", text: "", is_correct: false },
    ],
    explanation: "",
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch("/api/question-bank");
      const data = await response.json();
      if (response.ok) {
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTopic = filterTopic === "all" || q.topic === filterTopic;
    const matchesDifficulty =
      filterDifficulty === "all" || q.difficulty === filterDifficulty;
    return matchesSearch && matchesTopic && matchesDifficulty;
  });

  const topics = Array.from(new Set(questions.map((q) => q.topic)));

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-muted-foreground mt-1">
            Manage your reusable question library
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterTopic} onValueChange={setFilterTopic}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Difficulties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Questions Grid */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading questions...</p>
            </CardContent>
          </Card>
        ) : filteredQuestions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No questions found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredQuestions.map((question) => (
            <Card key={question.id} className="hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                        {question.difficulty}
                      </Badge>
                      <Badge variant="outline">{question.topic}</Badge>
                      <Badge variant="outline" className="text-xs">
                        Used {question.usageCount} times
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mb-2">{question.questionText}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {question.options.map((option, idx) => (
                    <div
                      key={option.id}
                      className={`p-2 rounded border ${option.is_correct
                        ? "bg-green-500/10 border-green-500/20"
                        : "bg-muted/50"
                        }`}
                    >
                      <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                      {option.text}
                      {option.is_correct && (
                        <Badge className="ml-2 bg-green-500">Correct</Badge>
                      )}
                    </div>
                  ))}
                </div>
                {question.explanation && (
                  <div className="p-3 bg-muted/50 rounded text-sm">
                    <strong>Explanation:</strong> {question.explanation}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info("Edit feature coming soon")}
                  >
                    <Edit className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `/api/question-bank/${question.id}/use`,
                          { method: "POST" }
                        );
                        if (response.ok) {
                          toast.success("Question copied to clipboard!");
                          navigator.clipboard.writeText(JSON.stringify(question));
                        }
                      } catch {
                        toast.error("Failed to copy question");
                      }
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Use in Quiz
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Question Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Question to Bank</DialogTitle>
            <DialogDescription>
              Create a reusable question that can be added to any quiz
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Question Text */}
            <div className="space-y-2">
              <Label htmlFor="questionText">Question Text *</Label>
              <Textarea
                id="questionText"
                placeholder="Enter your question here..."
                value={formData.questionText}
                onChange={(e) =>
                  setFormData({ ...formData, questionText: e.target.value })
                }
                className="min-h-[100px]"
              />
            </div>

            {/* Topic and Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="topic">Topic *</Label>
                <Input
                  id="topic"
                  placeholder="e.g., Arrays, Linked Lists, Trees"
                  value={formData.topic}
                  onChange={(e) =>
                    setFormData({ ...formData, topic: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty *</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: "easy" | "medium" | "hard") =>
                    setFormData({ ...formData, difficulty: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label>Answer Options *</Label>
              <div className="space-y-3">
                {formData.options.map((option, index) => (
                  <div key={option.id} className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted font-bold text-sm mt-1">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          value={option.text}
                          onChange={(e) => {
                            const newOptions = [...formData.options];
                            newOptions[index].text = e.target.value;
                            setFormData({ ...formData, options: newOptions });
                          }}
                        />
                        <Button
                          type="button"
                          variant={option.is_correct ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const newOptions = formData.options.map((opt, idx) => ({
                              ...opt,
                              is_correct: idx === index,
                            }));
                            setFormData({ ...formData, options: newOptions });
                          }}
                          className="min-w-[100px]"
                        >
                          {option.is_correct ? "Correct" : "Mark Correct"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-2">
              <Label htmlFor="explanation">Explanation (Optional)</Label>
              <Textarea
                id="explanation"
                placeholder="Explain why the correct answer is right..."
                value={formData.explanation}
                onChange={(e) =>
                  setFormData({ ...formData, explanation: e.target.value })
                }
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setFormData({
                  questionText: "",
                  topic: "",
                  difficulty: "medium",
                  options: [
                    { id: "a", text: "", is_correct: true },
                    { id: "b", text: "", is_correct: false },
                    { id: "c", text: "", is_correct: false },
                    { id: "d", text: "", is_correct: false },
                  ],
                  explanation: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitQuestion}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  async function handleSubmitQuestion() {
    // Validation
    if (!formData.questionText.trim()) {
      toast.error("Please enter a question");
      return;
    }
    if (!formData.topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }
    if (formData.options.some((opt) => !opt.text.trim())) {
      toast.error("All options must have text");
      return;
    }
    if (!formData.options.some((opt) => opt.is_correct)) {
      toast.error("Please mark at least one option as correct");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/question-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: formData.questionText.trim(),
          topic: formData.topic.trim(),
          difficulty: formData.difficulty,
          options: formData.options.map((opt) => ({
            id: opt.id,
            text: opt.text.trim(),
            is_correct: opt.is_correct,
          })),
          explanation: formData.explanation.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add question");
      }

      toast.success("Question added to bank successfully!");
      setIsDialogOpen(false);
      setFormData({
        questionText: "",
        topic: "",
        difficulty: "medium",
        options: [
          { id: "a", text: "", is_correct: true },
          { id: "b", text: "", is_correct: false },
          { id: "c", text: "", is_correct: false },
          { id: "d", text: "", is_correct: false },
        ],
        explanation: "",
      });
      fetchQuestions();
    } catch (error) {
      console.error("Error adding question:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add question"
      );
    } finally {
      setIsSubmitting(false);
    }
  }
}
