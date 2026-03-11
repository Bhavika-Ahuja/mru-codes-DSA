"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Plus, Loader2, Calendar, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import toast from "react-hot-toast";

interface Contest {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  status: string;
  _count: { problems: number; submissions: number };
  createdBy?: { fullName: string };
}

export default function TeacherContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startAt: "",
    endAt: "",
  });

  useEffect(() => {
    fetchContests();
  }, []);

  async function fetchContests() {
    try {
      setLoading(true);
      const res = await fetch("/api/contests");
      const data = await res.json();
      if (data.success) setContests(data.contests || []);
      else toast.error(data.error || "Failed to load");
    } catch (e) {
      toast.error("Failed to load contests");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.startAt || !form.endAt) {
      toast.error("Start and end time required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          status: "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      toast.success("Contest created");
      setShowCreate(false);
      setForm({ title: "", description: "", startAt: "", endAt: "" });
      fetchContests();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this contest? All submissions will be lost.")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/contests/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Contest deleted");
      fetchContests();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function statusColor(s: string) {
    if (s === "live") return "default";
    if (s === "ended") return "secondary";
    if (s === "scheduled") return "outline";
    return "outline";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            Coding Contests
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage LeetCode-style coding contests.
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Contest</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Contest</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Weekly Contest 1"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>Start *</Label>
                <Input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                />
              </div>
              <div>
                <Label>End *</Label>
                <Input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : contests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No contests yet. Create one and add problems from the Coding Problems bank.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contests.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{c.title}</CardTitle>
                  <Badge variant={statusColor(c.status)}>{c.status}</Badge>
                </div>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(c.startAt).toLocaleString()} – {new Date(c.endAt).toLocaleString()}
                </CardDescription>
                <p className="text-sm text-muted-foreground mt-1">
                  {c._count.problems} problems · {c._count.submissions} submissions
                </p>
              </CardHeader>
              <CardContent className="mt-auto flex flex-wrap gap-2">
                <Button variant="default" size="sm" asChild>
                  <Link href={`/teacher/contests/${c.id}`}>
                    <Edit className="h-4 w-4 mr-1" /> Manage
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(c.id)}
                  disabled={deleting === c.id}
                >
                  {deleting === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
