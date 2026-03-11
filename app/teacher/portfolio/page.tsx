"use client";

import { useEffect, useState } from "react";
import {
  FolderGit2,
  ExternalLink,
  User,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

interface StudentInfo {
  id: string;
  fullName: string;
  email: string;
  rollNumber: string | null;
  section: string | null;
  department: string | null;
}

interface PortfolioProjectWithStudent {
  id: string;
  title: string;
  description: string | null;
  projectUrl: string;
  techStack: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  student: StudentInfo;
}

export default function TeacherPortfolioPage() {
  const [projects, setProjects] = useState<PortfolioProjectWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      setLoading(true);
      const res = await fetch("/api/portfolio");
      const data = await res.json();
      if (data.success) setProjects(data.projects || []);
      else toast.error(data.error || "Failed to load portfolios");
    } catch (e) {
      console.error(e);
      toast.error("Failed to load portfolios");
    } finally {
      setLoading(false);
    }
  }

  const sections = Array.from(
    new Set(projects.map((p) => p.student.section).filter(Boolean))
  ) as string[];

  const filtered = projects.filter((p) => {
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.student.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (p.student.rollNumber && p.student.rollNumber.toLowerCase().includes(search.toLowerCase())) ||
      (p.techStack && p.techStack.toLowerCase().includes(search.toLowerCase()));
    const matchSection =
      !filterSection || p.student.section === filterSection;
    return matchSearch && matchSection;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FolderGit2 className="h-8 w-8 text-primary" />
          E-Portfolio
        </h1>
        <p className="text-muted-foreground mt-1">
          View students&apos; CS projects and portfolios
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, student name, roll no., tech..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {projects.length === 0
                  ? "No portfolio projects submitted yet."
                  : "No projects match your filters."}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((project) => (
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
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="truncate">{project.student.fullName}</span>
                      {project.student.rollNumber && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {project.student.rollNumber}
                        </Badge>
                      )}
                    </div>
                    {project.student.section && (
                      <Badge variant="secondary" className="w-fit text-xs">
                        {project.student.section}
                      </Badge>
                    )}
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
                  <CardContent className="mt-auto">
                    <Button variant="default" size="sm" asChild>
                      <a
                        href={project.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View Project
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
