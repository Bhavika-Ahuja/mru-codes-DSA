"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Loader2,
  Trash2,
  ExternalLink,
  Upload,
  Link as LinkIcon,
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

interface ExamPaper {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  year: number | null;
  semester: string | null;
  fileUrl: string;
  fileName: string;
  createdAt: string;
  createdBy: { id: string; fullName: string };
}

export default function TeacherExamPapersPage() {
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [method, setMethod] = useState<"url" | "file">("url");
  const [form, setForm] = useState({
    title: "",
    description: "",
    subject: "",
    year: "",
    semester: "",
    fileUrl: "",
    fileName: "",
    file: null as File | null,
  });

  useEffect(() => {
    fetchPapers();
  }, []);

  async function fetchPapers() {
    try {
      setLoading(true);
      const res = await fetch("/api/exam-papers");
      const data = await res.json();
      if (data.success) setPapers(data.examPapers || []);
      else toast.error(data.error || "Failed to load exam papers");
    } catch (e) {
      console.error(e);
      toast.error("Failed to load exam papers");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.subject.trim()) {
      toast.error("Title and Subject are required");
      return;
    }

    let fileUrl = form.fileUrl;
    let fileName = form.fileName || form.title;

    if (method === "file") {
      if (!form.file) {
        toast.error("Please select a PDF file");
        return;
      }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", form.file);
        const uploadRes = await fetch("/api/exam-papers/upload", {
          method: "POST",
          body: fd,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
        fileUrl = uploadData.url;
        fileName = uploadData.fileName || form.file.name;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
        setUploading(false);
        return;
      }
    } else {
      if (!form.fileUrl.trim()) {
        toast.error("Please enter a PDF URL or upload a file");
        setUploading(false);
        return;
      }
      try {
        new URL(form.fileUrl);
      } catch {
        toast.error("Please enter a valid URL");
        return;
      }
      fileName = form.fileName || form.title;
    }

    try {
      const res = await fetch("/api/exam-papers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          subject: form.subject.trim(),
          year: form.year ? parseInt(form.year, 10) : undefined,
          semester: form.semester.trim() || undefined,
          fileUrl,
          fileName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add exam paper");
      toast.success("Exam paper added successfully!");
      setShowDialog(false);
      setForm({
        title: "",
        description: "",
        subject: "",
        year: "",
        semester: "",
        fileUrl: "",
        fileName: "",
        file: null,
      });
      setMethod("url");
      fetchPapers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add exam paper");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this exam paper? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/exam-papers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Exam paper deleted");
      fetchPapers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Previous Exam Papers
          </h1>
          <p className="text-muted-foreground mt-1">
            Store exam papers for students to view and download
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Exam Paper
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Exam Paper</DialogTitle>
              <DialogDescription>
                Add a PDF link or upload a PDF file
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. DSA Mid-Term 2023"
                />
              </div>
              <div>
                <Label>Subject *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. DSA, Data Structures"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    placeholder="2023"
                  />
                </div>
                <div>
                  <Label>Semester</Label>
                  <Input
                    value={form.semester}
                    onChange={(e) =>
                      setForm({ ...form, semester: e.target.value })
                    }
                    placeholder="Fall, Spring"
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional notes"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={method === "url" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMethod("url")}
                >
                  <LinkIcon className="h-4 w-4 mr-1" />
                  Paste URL
                </Button>
                <Button
                  type="button"
                  variant={method === "file" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMethod("file")}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload PDF
                </Button>
              </div>

              {method === "url" && (
                <>
                  <div>
                    <Label>PDF URL *</Label>
                    <Input
                      type="url"
                      value={form.fileUrl}
                      onChange={(e) =>
                        setForm({ ...form, fileUrl: e.target.value })
                      }
                      placeholder="https://drive.google.com/... or direct PDF link"
                    />
                  </div>
                  <div>
                    <Label>File name (optional)</Label>
                    <Input
                      value={form.fileName}
                      onChange={(e) =>
                        setForm({ ...form, fileName: e.target.value })
                      }
                      placeholder="Display name for the file"
                    />
                  </div>
                </>
              )}
              {method === "file" && (
                <div>
                  <Label>PDF File *</Label>
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) =>
                      setForm({
                        ...form,
                        file: e.target.files?.[0] || null,
                        fileName: e.target.files?.[0]?.name || "",
                      })
                    }
                  />
                  {form.file && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Selected: {form.file.name}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Add Paper
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : papers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No exam papers yet. Add one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((paper) => (
            <Card key={paper.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">
                      {paper.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {paper.subject}
                      {paper.year != null && ` · ${paper.year}`}
                      {paper.semester && ` · ${paper.semester}`}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    PDF
                  </Badge>
                </div>
                {paper.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {paper.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="mt-auto flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={paper.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(paper.id)}
                  disabled={deleting === paper.id}
                >
                  {deleting === paper.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
