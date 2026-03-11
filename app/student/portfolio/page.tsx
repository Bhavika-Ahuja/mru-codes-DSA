"use client";

import { useEffect, useState } from "react";
import {
  FolderGit2,
  Plus,
  Loader2,
  Trash2,
  ExternalLink,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

interface PortfolioProject {
  id: string;
  title: string;
  description: string | null;
  projectUrl: string;
  techStack: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
}

export default function StudentPortfolioPage() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    projectUrl: "",
    techStack: "",
    thumbnailUrl: "",
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      setLoading(true);
      const res = await fetch("/api/portfolio");
      const data = await res.json();
      if (data.success) setProjects(data.projects || []);
      else toast.error(data.error || "Failed to load projects");
    } catch (e) {
      console.error(e);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.projectUrl.trim()) {
      toast.error("Project URL is required (e.g. GitHub or live demo link)");
      return;
    }
    try {
      new URL(form.projectUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          projectUrl: form.projectUrl.trim(),
          techStack: form.techStack.trim() || undefined,
          thumbnailUrl: form.thumbnailUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add project");
      toast.success("Project added to your portfolio!");
      setShowDialog(false);
      setForm({ title: "", description: "", projectUrl: "", techStack: "", thumbnailUrl: "" });
      fetchProjects();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add project");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this project from your portfolio?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Project removed");
      fetchProjects();
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
            <FolderGit2 className="h-8 w-8 text-primary" />
            E-Portfolio
          </h1>
          <p className="text-muted-foreground mt-1">
            Showcase your CS projects. Teachers can view your portfolio.
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Project</DialogTitle>
              <DialogDescription>
                Add a link to your project (GitHub, live demo, or document).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Project title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. E-Commerce Web App"
                />
              </div>
              <div>
                <Label>Project URL *</Label>
                <Input
                  type="url"
                  value={form.projectUrl}
                  onChange={(e) => setForm({ ...form, projectUrl: e.target.value })}
                  placeholder="https://github.com/... or https://your-demo.vercel.app"
                />
              </div>
              <div>
                <Label>Tech stack</Label>
                <Input
                  value={form.techStack}
                  onChange={(e) => setForm({ ...form, techStack: e.target.value })}
                  placeholder="e.g. React, Node.js, PostgreSQL"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the project"
                  rows={3}
                />
              </div>
              <div>
                <Label>Thumbnail URL (optional)</Label>
                <Input
                  type="url"
                  value={form.thumbnailUrl}
                  onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowDialog(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Project
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
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No projects yet. Add your first CS project to build your e-portfolio.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col overflow-hidden">
              {project.thumbnailUrl ? (
                <div className="aspect-video w-full bg-muted overflow-hidden">
                  <img
                    src={project.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{project.title}</CardTitle>
                {project.techStack && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {project.techStack.split(",").map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
                {project.description && (
                  <CardDescription className="line-clamp-2 mt-1">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="mt-auto flex flex-wrap gap-2">
                <Button variant="default" size="sm" asChild>
                  <a href={project.projectUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(project.id)}
                  disabled={deleting === project.id}
                >
                  {deleting === project.id ? (
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
