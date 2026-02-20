"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Upload,
  FileText,
  Video,
  Presentation,
  Plus,
  Eye,
  Loader2,
  Link as LinkIcon,
  Trash2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

interface Course {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  icon: string | null;
  _count: {
    content: number;
  };
}

interface LearningContent {
  id: string;
  title: string;
  description: string | null;
  contentType: "pdf" | "ppt" | "video" | "document" | "other";
  contentUrl: string;
  fileName: string | null;
  orderIndex: number;
  createdAt: string;
}

export default function LearnContentPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [content, setContent] = useState<LearningContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url");

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    contentType: "pdf" as "pdf" | "ppt" | "video" | "document" | "other",
    contentUrl: "",
    fileName: "",
    file: null as File | null,
  });

  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    slug: "",
    icon: "",
    orderIndex: 0,
  });

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchContent(selectedCourse);
    }
  }, [selectedCourse]);

  async function fetchCourses() {
    try {
      setLoading(true);
      const response = await fetch("/api/courses");
      const data = await response.json();
      if (data.success) {
        setCourses(data.courses || []);
        if (data.courses.length > 0 && !selectedCourse) {
          setSelectedCourse(data.courses[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  async function fetchContent(courseId: string) {
    try {
      const response = await fetch(`/api/courses/${courseId}/content`);
      const data = await response.json();
      if (data.success) {
        setContent(data.content || []);
      }
    } catch (error) {
      console.error("Error fetching content:", error);
      toast.error("Failed to load content");
    }
  }

  async function handleAddContent() {
    if (!selectedCourse || !uploadForm.title) {
      toast.error("Please fill all required fields");
      return;
    }

    setUploading(true);
    try {
      let finalUrl = uploadForm.contentUrl;
      let finalFileName = uploadForm.fileName;

      // If uploading a file, upload it first
      if (uploadMethod === "file") {
        if (!uploadForm.file) {
          toast.error("Please select a file to upload");
          setUploading(false);
          return;
        }

        // Upload file first
        const formData = new FormData();
        formData.append("file", uploadForm.file);
        formData.append("contentType", uploadForm.contentType);

        const uploadResponse = await fetch("/api/learning-content/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || "Failed to upload file");
        }

        finalUrl = uploadData.url;
        finalFileName = uploadData.fileName || uploadForm.file.name;
      } else {
        // Validate URL
        if (!uploadForm.contentUrl) {
          toast.error("Please provide a URL or upload a file");
          setUploading(false);
          return;
        }

        try {
          new URL(uploadForm.contentUrl);
        } catch {
          toast.error("Please enter a valid URL");
          setUploading(false);
          return;
        }
      }

      // Create content record
      const contentResponse = await fetch("/api/learning-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse,
          title: uploadForm.title,
          description: uploadForm.description || undefined,
          contentType: uploadForm.contentType,
          contentUrl: finalUrl,
          fileName: finalFileName || undefined,
          orderIndex: content.length,
        }),
      });

      const contentData = await contentResponse.json();

      if (!contentResponse.ok) {
        throw new Error(contentData.error || "Failed to add content");
      }

      toast.success("Content added successfully!");
      setShowUploadDialog(false);
      setUploadForm({
        title: "",
        description: "",
        contentType: "pdf",
        contentUrl: "",
        fileName: "",
        file: null,
      });
      setUploadMethod("url");
      fetchContent(selectedCourse);
    } catch (error) {
      console.error("Error adding content:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add content"
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleCreateCourse() {
    if (!courseForm.title || !courseForm.slug) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(courseForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create course");
      }

      toast.success("Course created successfully!");
      setShowCourseDialog(false);
      setCourseForm({
        title: "",
        description: "",
        slug: "",
        icon: "",
        orderIndex: 0,
      });
      fetchCourses();
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create course"
      );
    }
  }

  function getContentTypeIcon(type: string) {
    switch (type) {
      case "pdf":
        return <FileText className="h-5 w-5" />;
      case "ppt":
        return <Presentation className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleDeleteContent(contentId: string) {
    if (!confirm("Are you sure you want to delete this content? This action cannot be undone.")) {
      return;
    }

    setDeleting(contentId);
    try {
      const response = await fetch(`/api/learning-content/${contentId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete content");
      }

      toast.success("Content deleted successfully!");
      fetchContent(selectedCourse);
    } catch (error) {
      console.error("Error deleting content:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete content"
      );
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            Manage Learning Content
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload and organize course materials for students
          </p>
        </div>
        <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Course
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Course</DialogTitle>
              <DialogDescription>
                Add a new course topic for learning content
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="course-title">Title *</Label>
                <Input
                  id="course-title"
                  value={courseForm.title}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, title: e.target.value })
                  }
                  placeholder="e.g., Arrays & Strings"
                />
              </div>
              <div>
                <Label htmlFor="course-slug">Slug *</Label>
                <Input
                  id="course-slug"
                  value={courseForm.slug}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                  placeholder="e.g., arrays-strings"
                />
              </div>
              <div>
                <Label htmlFor="course-icon">Icon (Emoji)</Label>
                <Input
                  id="course-icon"
                  value={courseForm.icon}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, icon: e.target.value })
                  }
                  placeholder="📊"
                />
              </div>
              <div>
                <Label htmlFor="course-description">Description</Label>
                <Textarea
                  id="course-description"
                  value={courseForm.description}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, description: e.target.value })
                  }
                  placeholder="Course description..."
                />
              </div>
              <Button onClick={handleCreateCourse} className="w-full">
                Create Course
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Course</CardTitle>
          <CardDescription>Choose a course to manage its content</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-10 w-full max-w-md" />
          ) : (
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a course..." />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.icon && <span className="mr-2">{course.icon}</span>}
                    {course.title} ({course._count.content} items)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedCourse && (
        <>
          {/* Upload Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Course Content</CardTitle>
                      <CardDescription>
                        Upload files or add links to PDFs, PPTs, videos, and other materials
                      </CardDescription>
                </div>
                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Content
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Learning Content</DialogTitle>
                      <DialogDescription>
                        Upload a file or add a link/URL to learning materials
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Upload Method Selection */}
                      <div>
                        <Label>Upload Method *</Label>
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant={uploadMethod === "file" ? "default" : "outline"}
                            onClick={() => setUploadMethod("file")}
                            className="flex-1"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload File
                          </Button>
                          <Button
                            type="button"
                            variant={uploadMethod === "url" ? "default" : "outline"}
                            onClick={() => setUploadMethod("url")}
                            className="flex-1"
                          >
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Add URL/Link
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="content-title">Title *</Label>
                        <Input
                          id="content-title"
                          value={uploadForm.title}
                          onChange={(e) =>
                            setUploadForm({ ...uploadForm, title: e.target.value })
                          }
                          placeholder="e.g., Introduction to Arrays"
                        />
                      </div>
                      <div>
                        <Label htmlFor="content-type">Content Type *</Label>
                        <Select
                          value={uploadForm.contentType}
                          onValueChange={(value: "pdf" | "ppt" | "video" | "document" | "other") =>
                            setUploadForm({ ...uploadForm, contentType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pdf">PDF Document</SelectItem>
                            <SelectItem value="ppt">PowerPoint Presentation</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="document">Word Document</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* File Upload Section */}
                      {uploadMethod === "file" && (
                        <div>
                          <Label htmlFor="content-file">File *</Label>
                          <Input
                            id="content-file"
                            type="file"
                            accept={
                              uploadForm.contentType === "pdf"
                                ? ".pdf"
                                : uploadForm.contentType === "ppt"
                                ? ".ppt,.pptx"
                                : uploadForm.contentType === "video"
                                ? ".mp4,.webm,.ogg,.mov,.avi"
                                : uploadForm.contentType === "document"
                                ? ".doc,.docx,.txt"
                                : "*"
                            }
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setUploadForm({
                                ...uploadForm,
                                file,
                                fileName: file ? file.name : "",
                              });
                            }}
                          />
                          {uploadForm.file && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Selected: {uploadForm.file.name} (
                              {formatFileSize(uploadForm.file.size)})
                            </p>
                          )}
                        </div>
                      )}

                      {/* URL Input Section */}
                      {uploadMethod === "url" && (
                        <div>
                          <Label htmlFor="content-url">Content URL/Link *</Label>
                          <Input
                            id="content-url"
                            type="url"
                            value={uploadForm.contentUrl}
                            onChange={(e) =>
                              setUploadForm({
                                ...uploadForm,
                                contentUrl: e.target.value,
                              })
                            }
                            placeholder="https://drive.google.com/file/d/... or https://youtube.com/watch?v=..."
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Paste a link to Google Drive, YouTube, or any other resource
                          </p>
                        </div>
                      )}

                      {uploadMethod === "url" && (
                        <div>
                          <Label htmlFor="content-filename">Resource Name (Optional)</Label>
                          <Input
                            id="content-filename"
                            value={uploadForm.fileName}
                            onChange={(e) =>
                              setUploadForm({
                                ...uploadForm,
                                fileName: e.target.value,
                              })
                            }
                            placeholder="e.g., Arrays_Introduction.pdf"
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="content-description">Description</Label>
                        <Textarea
                          id="content-description"
                          value={uploadForm.description}
                          onChange={(e) =>
                            setUploadForm({
                              ...uploadForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="Brief description of the content..."
                        />
                      </div>
                      <Button
                        onClick={handleAddContent}
                        disabled={uploading}
                        className="w-full"
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {uploadMethod === "file" ? "Uploading..." : "Adding..."}
                          </>
                        ) : (
                          <>
                            {uploadMethod === "file" ? (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Content
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Content
                              </>
                            )}
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {content.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No content added yet. Click &quot;Upload Content&quot; to add materials.
                </div>
              ) : (
                <div className="space-y-3">
                  {content.map((item) => (
                    <Card key={item.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              {getContentTypeIcon(item.contentType)}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">{item.title}</h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <Badge variant="outline">
                                  {item.contentType.toUpperCase()}
                                </Badge>
                                {item.fileName && (
                                  <span className="text-xs text-muted-foreground">
                                    {item.fileName}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(item.contentUrl, "_blank")}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteContent(item.id)}
                              disabled={deleting === item.id}
                              className="text-destructive hover:text-destructive"
                            >
                              {deleting === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
