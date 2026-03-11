"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Code2, Plus, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  timeLimitMs: number;
  _count: { testCases: number };
}

export default function TeacherCodingProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchProblems();
  }, []);

  async function fetchProblems() {
    try {
      setLoading(true);
      const res = await fetch("/api/coding-problems");
      const data = await res.json();
      if (data.success) setProblems(data.problems || []);
      else toast.error(data.error || "Failed to load");
    } catch (e) {
      toast.error("Failed to load problems");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this problem? It will be removed from any contests.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/coding-problems/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Problem deleted");
      fetchProblems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Code2 className="h-8 w-8 text-primary" />
            Coding Problems
          </h1>
          <p className="text-muted-foreground mt-1">
            Create problems for contests (LeetCode-style). Add test cases when creating.
          </p>
        </div>
        <Link href="/teacher/coding-problems/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Problem
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : problems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No problems yet. Create one to use in contests.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{p.title}</CardTitle>
                <CardDescription>{p.slug}</CardDescription>
                <div className="flex gap-2 mt-2">
                  <Badge variant={p.difficulty === "easy" ? "default" : p.difficulty === "medium" ? "secondary" : "destructive"}>
                    {p.difficulty}
                  </Badge>
                  <Badge variant="outline">{p._count.testCases} tests</Badge>
                </div>
              </CardHeader>
              <CardContent className="mt-auto flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/teacher/coding-problems/${p.id}/edit`}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(p.id)}
                  disabled={deleting === p.id}
                >
                  {deleting === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
