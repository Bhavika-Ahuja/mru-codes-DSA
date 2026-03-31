"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Users,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Clock,
  FileX,
  Download,
  Star,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { formatDepartmentSection } from "@/lib/departments";

interface Submission {
  id: string;
  pdfUrl: string;
  pdfFileName: string;
  status: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  student: {
    id: string;
    fullName: string;
    email: string;
    rollNumber: string | null;
    section: string | null;
    avatarUrl: string | null;
  };
}

interface Assignment {
  id: string;
  title: string;
  maxPoints: number;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "graded":
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-700 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Graded
        </Badge>
      );
    case "submitted":
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "returned":
      return (
        <Badge variant="outline">
          <FileX className="h-3 w-3 mr-1" />
          Returned
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState<string | null>(null);
  const [aiGrading, setAiGrading] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetchData();
  }, [assignmentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignmentRes, submissionsRes] = await Promise.all([
        fetch(`/api/assignments/${assignmentId}`),
        fetch(`/api/assignments/${assignmentId}/submissions`),
      ]);

      if (!assignmentRes.ok || !submissionsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const assignmentData = await assignmentRes.json();
      const submissionsData = await submissionsRes.json();

      setAssignment(assignmentData.assignment);
      setSubmissions(submissionsData.submissions);
    } catch (error) {
      toast.error("Failed to load submissions");
      router.push("/teacher/assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (submissionId: string) => {
    if (!grade || !assignment) return;

    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > assignment.maxPoints) {
      toast.error(`Grade must be between 0 and ${assignment.maxPoints}`);
      return;
    }

    try {
      setGrading(submissionId);
      const response = await fetch(`/api/submissions/${submissionId}/grade`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grade: gradeNum,
          feedback: feedback || null,
          status: "graded",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to grade submission");
      }

      toast.success("Submission graded successfully!");
      setSelectedSubmission(null);
      setGrade("");
      setFeedback("");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to grade submission");
    } finally {
      setGrading(null);
    }
  };

  const handleAiGrade = async (submissionId: string) => {
    try {
      setAiGrading(submissionId);
      const response = await fetch(`/api/submissions/${submissionId}/ai-grade`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to grade submission with AI");
      }

      const data = await response.json();
      toast.success(
        `AI graded successfully: ${data.submission.grade}/${assignment?.maxPoints}`
      );
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to grade submission with AI"
      );
    } finally {
      setAiGrading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!assignment) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/teacher/assignments/${assignmentId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Submissions
          </h1>
          <p className="text-muted-foreground mt-1">{assignment.title}</p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-semibold text-lg mb-2">No submissions yet</h3>
            <p className="text-muted-foreground text-center">
              Students haven&apos;t submitted any solutions for this assignment yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((submission) => (
            <Card key={submission.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={submission.student.avatarUrl || undefined} />
                      <AvatarFallback>
                        {submission.student.fullName
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {submission.student.fullName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {submission.student.rollNumber && (
                          <span>{submission.student.rollNumber}</span>
                        )}
                        {(submission.student.department || submission.student.section) && (
                          <>
                            <span>•</span>
                            <span>
                              {formatDepartmentSection(
                                submission.student.department ?? null,
                                submission.student.section ?? null
                              )}
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(submission.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        Submitted: {formatDate(submission.submittedAt)}
                      </span>
                      {submission.grade !== null && (
                        <span className="font-medium">
                          Grade: {submission.grade}/{assignment.maxPoints}
                        </span>
                      )}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={submission.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View PDF
                      </a>
                    </Button>
                  </div>

                  {submission.feedback && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Feedback
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {submission.feedback}
                      </p>
                    </div>
                  )}

                  {submission.status === "submitted" && (
                    <div className="pt-4 border-t space-y-4">
                      <Button
                        variant="secondary"
                        onClick={() => handleAiGrade(submission.id)}
                        disabled={aiGrading === submission.id || grading === submission.id}
                        size="sm"
                      >
                        {aiGrading === submission.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            AI Grading...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            AI Grade & Save
                          </>
                        )}
                      </Button>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`grade-${submission.id}`}>
                            Grade (0 - {assignment.maxPoints})
                          </Label>
                          <Input
                            id={`grade-${submission.id}`}
                            type="number"
                            min={0}
                            max={assignment.maxPoints}
                            value={selectedSubmission?.id === submission.id ? grade : ""}
                            onChange={(e) => {
                              setSelectedSubmission(submission);
                              setGrade(e.target.value);
                              setFeedback(submission.feedback || "");
                            }}
                            placeholder="Enter grade"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`feedback-${submission.id}`}>
                          Feedback (optional)
                        </Label>
                        <Textarea
                          id={`feedback-${submission.id}`}
                          value={selectedSubmission?.id === submission.id ? feedback : ""}
                          onChange={(e) => {
                            setSelectedSubmission(submission);
                            setFeedback(e.target.value);
                          }}
                          placeholder="Enter feedback for the student..."
                          rows={3}
                        />
                      </div>
                      <Button
                        onClick={() => handleGrade(submission.id)}
                        disabled={
                          grading === submission.id ||
                          aiGrading === submission.id ||
                          !grade
                        }
                        size="sm"
                      >
                        {grading === submission.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Grading...
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-2" />
                            Grade Submission
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
