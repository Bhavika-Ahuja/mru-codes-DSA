"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  Filter,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface QuestionDetail {
  questionId: string;
  orderIndex: number;
  isCorrect: boolean;
  score: number;
  submittedAt: string;
}

interface StudentResult {
  studentId: string;
  fullName: string;
  rollNumber: string | null;
  email: string;
  sessionId: string;
  sessionScore: number;
  questionsAnswered: number;
  correctAnswers: number;
  totalQuestions: number;
  marks: number;
  accuracy: number;
  completedAt: string | null;
  questionDetails: QuestionDetail[];
}

interface SectionResult {
  section: string;
  department: string | null;
  students: StudentResult[];
}

interface QuizResult {
  quiz: {
    id: string;
    title: string;
    topic: string;
    difficulty: string;
    totalQuestions: number;
  };
  sections: SectionResult[];
  summary: {
    totalSessions: number;
    totalStudents: number;
    totalSections: number;
    averageMarks: number;
  };
}

export default function QuizMarksPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [results, setResults] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(
    new Set()
  );

  // Fetch quizzes immediately on mount
  useEffect(() => {
    let mounted = true;
    
    async function fetchQuizzes() {
      try {
        setQuizzesLoading(true);
        const response = await fetch("/api/quizzes");
        const data = await response.json();
        if (mounted && data.success) {
          setQuizzes(data.quizzes || []);
        }
      } catch (error) {
        console.error("Error fetching quizzes:", error);
      } finally {
        if (mounted) {
          setQuizzesLoading(false);
        }
      }
    }
    
    fetchQuizzes();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch results when quiz is selected
  useEffect(() => {
    if (selectedQuizId) {
      fetchResults(selectedQuizId);
    }
  }, [selectedQuizId]);

  async function fetchResults(quizId: string) {
    setLoading(true);
    try {
      const response = await fetch(`/api/quizzes/${quizId}/results`);
      const data = await response.json();
      if (data.success) {
        setResults(data);
      } else {
        console.error("Error fetching results:", data.error);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  }

  const toggleStudentExpansion = (studentId: string) => {
    setExpandedStudents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const filteredSections = results?.sections.filter((section) => {
    if (selectedSection !== "all" && section.section !== selectedSection) {
      return false;
    }
    return true;
  }) || [];

  const filteredStudents = filteredSections.flatMap((section) =>
    section.students.filter((student) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        student.fullName.toLowerCase().includes(searchLower) ||
        student.rollNumber?.toLowerCase().includes(searchLower) ||
        student.email.toLowerCase().includes(searchLower)
      );
    })
  );

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600 dark:text-green-400";
    if (accuracy >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getMarksColor = (marks: number, total: number) => {
    const percentage = (marks / total) * 100;
    if (percentage >= 80) return "text-green-600 dark:text-green-400 font-bold";
    if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400 font-bold";
    return "text-red-600 dark:text-red-400 font-bold";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quiz Marks Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          View all students&apos; quiz results organized by section
        </p>
      </div>

      {/* Quiz Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Quiz</CardTitle>
          <CardDescription>
            Choose a quiz to view student results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quizzesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full max-w-md" />
              <p className="text-sm text-muted-foreground">Loading quizzes...</p>
            </div>
          ) : (
            <Select value={selectedQuizId} onValueChange={setSelectedQuizId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a quiz..." />
              </SelectTrigger>
              <SelectContent>
                {quizzes.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No quizzes available
                  </div>
                ) : (
                  quizzes.map((quiz) => (
                    <SelectItem key={quiz.id} value={quiz.id}>
                      {quiz.title} - {quiz.topic} ({quiz.difficulty})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {results && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Students
                </CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{results.summary.totalStudents}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {results.summary.totalSections} sections
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Questions
                </CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{results.quiz.totalQuestions}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {results.quiz.topic}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Marks
                </CardTitle>
                <Trophy className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {results.summary.averageMarks.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Out of {results.quiz.totalQuestions} marks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quiz Sessions
                </CardTitle>
                <Clock className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{results.summary.totalSessions}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed sessions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, roll number, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="All Sections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {results.sections.map((section) => (
                      <SelectItem key={section.section} value={section.section}>
                        {section.department
                          ? `${section.department} - ${section.section}`
                          : section.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results by Section */}
          {filteredSections.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {searchTerm || selectedSection !== "all"
                    ? "No students found matching your filters"
                    : "No students have completed this quiz yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSections.map((section) => {
              const sectionStudents = section.students.filter((student) => {
                if (!searchTerm) return true;
                const searchLower = searchTerm.toLowerCase();
                return (
                  student.fullName.toLowerCase().includes(searchLower) ||
                  student.rollNumber?.toLowerCase().includes(searchLower) ||
                  student.email.toLowerCase().includes(searchLower)
                );
              });

              if (sectionStudents.length === 0) return null;

              return (
                <Card key={section.section}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Section: {section.section}
                          {section.department && (
                            <Badge variant="outline" className="ml-2">
                              {section.department}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {sectionStudents.length} student
                          {sectionStudents.length !== 1 ? "s" : ""} in this section
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Rank</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Roll Number</TableHead>
                            <TableHead className="text-right">Marks</TableHead>
                            <TableHead className="text-right">Accuracy</TableHead>
                            <TableHead className="text-right">Questions</TableHead>
                            <TableHead>Completed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sectionStudents.map((student, index) => (
                            <React.Fragment key={student.studentId}>
                              <TableRow>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      toggleStudentExpansion(student.studentId)
                                    }
                                  >
                                    {expandedStudents.has(student.studentId) ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {index === 0 && (
                                      <Trophy className="h-4 w-4 text-yellow-500" />
                                    )}
                                    <span className="font-medium">
                                      #{index + 1}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {student.fullName}
                                </TableCell>
                                <TableCell>
                                  {student.rollNumber || (
                                    <span className="text-muted-foreground">
                                      N/A
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span
                                    className={getMarksColor(
                                      student.marks,
                                      results.quiz.totalQuestions
                                    )}
                                  >
                                    {student.marks} / {results.quiz.totalQuestions}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className={getAccuracyColor(student.accuracy)}>
                                    {student.accuracy.toFixed(1)}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {student.correctAnswers} /{" "}
                                  {student.questionsAnswered}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {student.completedAt
                                    ? new Date(
                                        student.completedAt
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </TableCell>
                              </TableRow>
                              {expandedStudents.has(student.studentId) && (
                                <TableRow key={`${student.studentId}-details`}>
                                  <TableCell colSpan={8}>
                                    <div className="p-4 bg-muted/50 rounded-lg">
                                      <h4 className="font-semibold mb-3">
                                        Question-wise Details
                                      </h4>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                        {student.questionDetails.map((q) => (
                                          <div
                                            key={q.questionId}
                                            className={`p-3 rounded-md border ${
                                              q.isCorrect
                                                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                                                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-sm font-medium">
                                                Q{q.orderIndex + 1}
                                              </span>
                                              {q.isCorrect ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                              ) : (
                                                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                              )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {q.isCorrect ? "1 mark" : "0 marks"}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </>
      )}

      {!selectedQuizId && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Please select a quiz to view student results
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
