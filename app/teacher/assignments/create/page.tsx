"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FileText,
  Upload,
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { toast } from "sonner";
import Link from "next/link";

const assignmentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  topic: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  maxPoints: z.number().min(1).max(1000).default(100),
  dueDate: z.string().optional(),
  status: z.enum(["draft", "published", "closed"]).default("draft"),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

export default function CreateAssignmentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      difficulty: "medium",
      maxPoints: 100,
      status: "draft",
    },
  });

  const difficulty = watch("difficulty");
  const status = watch("status");

  const handleFileSelect = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);

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
      setPdfUrl(null);
      setPdfFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileRemove = () => {
    setPdfUrl(null);
    setPdfFileName(null);
    setUploadError(null);
  };

  const onSubmit = async (data: AssignmentFormData) => {
    if (!pdfUrl || !pdfFileName) {
      toast.error("Please upload a PDF file");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          pdfUrl,
          pdfFileName,
          maxPoints: Number(data.maxPoints),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create assignment");
      }

      const { assignment } = await response.json();
      toast.success("Assignment created successfully!", {
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      router.push(`/teacher/assignments/${assignment.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create assignment", {
        icon: <AlertCircle className="h-4 w-4" />,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/teacher/assignments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Create Assignment
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload a PDF assignment and set details for your students
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Enter the title and description for your assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Binary Tree Traversal Assignment"
                  {...register("title")}
                  disabled={isLoading}
                />
                {errors.title && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide instructions and requirements for the assignment..."
                  rows={4}
                  {...register("description")}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic (optional)</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Binary Trees, Arrays"
                    {...register("topic")}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={difficulty}
                    onValueChange={(value) => setValue("difficulty", value as "easy" | "medium" | "hard")}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="difficulty">
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
            </CardContent>
          </Card>

          {/* PDF Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment PDF</CardTitle>
              <CardDescription>
                Upload the assignment PDF file for your students to download
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload
                onFileSelect={handleFileSelect}
                onFileRemove={handleFileRemove}
                accept="application/pdf"
                maxSize={10}
                disabled={isLoading}
                uploading={isUploading}
                uploadedFileName={pdfFileName}
                error={uploadError}
                label="Assignment PDF"
                description="Drag and drop your PDF here or click to browse. Maximum file size is 10MB."
                required
              />
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Configure points, due date, and publication status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxPoints">Maximum Points</Label>
                  <Input
                    id="maxPoints"
                    type="number"
                    min={1}
                    max={1000}
                    {...register("maxPoints", { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                  {errors.maxPoints && (
                    <p className="text-sm text-destructive">
                      {errors.maxPoints.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date (optional)</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    {...register("dueDate")}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setValue("status", value as "draft" | "published" | "closed")}
                  disabled={isLoading}
                >
                  <SelectTrigger id="status">
                    <SelectValue>
                      {status === "published" && "Published - Visible to students, they can submit"}
                      {status === "draft" && "Draft - Hidden from students"}
                      {status === "closed" && "Closed - Students can view but cannot submit"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">
                      Draft - Hidden from students
                    </SelectItem>
                    <SelectItem value="published">
                      Published - Visible to students, they can submit
                    </SelectItem>
                    <SelectItem value="closed">
                      Closed - Students can view but cannot submit
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !pdfUrl}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Create Assignment
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
