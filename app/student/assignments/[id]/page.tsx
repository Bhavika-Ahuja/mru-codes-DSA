"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Upload,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
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
import { FileUpload } from "@/components/ui/file-upload";
import toast from "react-hot-toast";

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  maxPoints: number;
  dueDate: string | null;
  pdfUrl: string | null;
  pdfFileName: string | null;
  createdBy: {
    fullName: string;
  };
  submissions: Array<{
    id: string;
    status: string;
    grade: number | null;
    feedback: string | null;
    submittedAt: string;
    pdfUrl: string;
    pdfFileName: string;
  }>;
}

function formatDate(dateString: string | null) {
  if (!dateString) return "No due date";
  const date = new Date(dateString);
  const isOverdue = date < new Date();
  return (
    <span className={isOverdue ? "text-destructive font-medium" : ""}>
      {date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

export default function StudentAssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assignments/${assignmentId}?forStudent=true`);

      if (!response.ok) {
        throw new Error("Failed to fetch assignment");
      }

      const data = await response.json();
      setAssignment(data.assignment);

      // If student has a submission, pre-fill the PDF
      if (data.assignment.submissions && data.assignment.submissions.length > 0) {
        const submission = data.assignment.submissions[0];
        setPdfUrl(submission.pdfUrl);
        setPdfFileName(submission.pdfFileName);
      }
    } catch (error) {
      toast.error("Failed to load assignment");
      router.push("/student/assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setUploadError(null);
    setPdfFile(file);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload file");
      }

      const data = await response.json();
      setPdfUrl(data.url);
      setPdfFileName(data.fileName);
      toast.success("PDF uploaded successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
      setUploadError(errorMessage);
      toast.error(errorMessage);
      setPdfFile(null);
      setPdfUrl(null);
      setPdfFileName(null);
    } finally {
      setUploading(false);
    }
  };

  const handleFileRemove = () => {
    setPdfFile(null);
    setPdfUrl(null);
    setPdfFileName(null);
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pdfUrl || !pdfFileName) {
      toast.error("Please upload a PDF file");
      return;
    }

    // Check due date
    if (assignment?.dueDate && new Date(assignment.dueDate) < new Date()) {
      toast.error("The due date for this assignment has passed");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/assignments/${assignmentId}/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfUrl,
          pdfFileName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit assignment");
      }

      toast.success("Assignment submitted successfully!", {
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      fetchAssignment(); // Refresh to show updated submission
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit assignment", {
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setSubmitting(false);
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

  const submission = assignment.submissions?.[0];
  const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();
  const hasSubmission = submission !== undefined;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/student/assignments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            {assignment.title}
          </h1>
          <p className="text-muted-foreground mt-1">Assignment Details</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Assignment Info */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Information</CardTitle>
            <CardDescription>Review the assignment requirements and submit your solution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignment.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Description
                </p>
                <p className="text-base whitespace-pre-wrap">{assignment.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              {assignment.topic && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Topic</p>
                  <Badge variant="outline">{assignment.topic}</Badge>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Maximum Points
                </p>
                <p className="text-base">{assignment.maxPoints} points</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due Date
                </p>
                <p className="text-base">{formatDate(assignment.dueDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Instructor
                </p>
                <p className="text-base">{assignment.createdBy.fullName}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Assignment PDF
              </p>
              {assignment.pdfUrl ? (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={assignment.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {assignment.pdfFileName || "View Assignment PDF"}
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">No PDF available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submission Status */}
        {hasSubmission && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Submission Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">Status</p>
                  <Badge
                    variant={
                      submission.status === "graded"
                        ? "default"
                        : submission.status === "submitted"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {submission.status === "graded" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {submission.status === "submitted" && <Clock className="h-3 w-3 mr-1" />}
                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                  </Badge>
                </div>
                {submission.grade !== null && (
                  <div>
                    <p className="text-sm font-medium mb-1">Grade</p>
                    <p className="text-2xl font-bold text-primary">
                      {submission.grade}/{assignment.maxPoints}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Submitted At
                </p>
                <p className="text-sm">
                  {new Date(submission.submittedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {submission.feedback && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Feedback
                  </p>
                  <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                    {submission.feedback}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Your Submission
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={submission.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Submitted PDF
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Solution */}
        {(!hasSubmission || submission.status === "returned") && (
          <Card>
            <CardHeader>
              <CardTitle>Submit Solution</CardTitle>
              <CardDescription>
                Upload your solution as a PDF file (max 10MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isOverdue && !hasSubmission && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      The due date for this assignment has passed
                    </span>
                  </div>
                )}

                <FileUpload
                  onFileSelect={handleFileSelect}
                  onFileRemove={handleFileRemove}
                  accept="application/pdf"
                  maxSize={10}
                  disabled={submitting || (isOverdue && !hasSubmission)}
                  uploading={uploading}
                  uploadedFileName={pdfFileName}
                  error={uploadError}
                  label="Solution PDF"
                  description="Drag and drop your solution PDF here or click to browse. Maximum file size is 10MB."
                  required
                />

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      submitting ||
                      uploading ||
                      !pdfUrl ||
                      (isOverdue && !hasSubmission)
                    }
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {hasSubmission ? "Resubmit Solution" : "Submit Solution"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
