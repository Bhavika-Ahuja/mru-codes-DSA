"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, Loader2, ArrowLeft, Plus, Trash2, Calendar, List, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

interface ContestProblem {
  id: string;
  orderIndex: number;
  points: number;
  problem: { id: string; title: string; slug: string; difficulty: string };
}

interface Contest {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  status: string;
  problems: ContestProblem[];
}

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
}

export default function TeacherContestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [contest, setContest] = useState<Contest | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [tab, setTab] = useState<"problems" | "submissions" | "leaderboard">("problems");
  const [submissions, setSubmissions] = useState<unknown[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ fullName: string; rollNumber: string | null; totalScore: number; problemsSolved: number }[]>([]);

  useEffect(() => {
    if (id) {
      fetchContest();
      fetchProblems();
    }
  }, [id]);

  useEffect(() => {
    if (id && tab === "submissions") fetchSubmissions();
    if (id && tab === "leaderboard") fetchLeaderboard();
  }, [id, tab]);

  async function fetchContest() {
    try {
      setLoading(true);
      const res = await fetch(`/api/contests/${id}`);
      const data = await res.json();
      if (data.success) setContest(data.contest);
      else toast.error(data.error || "Failed to load");
    } catch (e) {
      toast.error("Failed to load contest");
    } finally {
      setLoading(false);
    }
  }

  async function fetchProblems() {
    try {
      const res = await fetch("/api/coding-problems");
      const data = await res.json();
      if (data.success) setProblems(data.problems || []);
    } catch (_) {}
  }

  async function fetchSubmissions() {
    try {
      const res = await fetch(`/api/contests/${id}/submissions`);
      const data = await res.json();
      if (data.success) setSubmissions(data.submissions || []);
    } catch (_) {}
  }

  async function fetchLeaderboard() {
    try {
      const res = await fetch(`/api/contests/${id}/leaderboard`);
      const data = await res.json();
      if (data.success) setLeaderboard(data.leaderboard || []);
    } catch (_) {}
  }

  async function addProblem(problemId: string) {
    setAdding(true);
    try {
      const res = await fetch(`/api/contests/${id}/problems`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      toast.success("Problem added");
      fetchContest();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  }

  async function removeProblem(problemId: string) {
    if (!confirm("Remove this problem from the contest?")) return;
    try {
      const res = await fetch(`/api/contests/${id}/problems?problemId=${problemId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove");
      toast.success("Problem removed");
      fetchContest();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    }
  }

  async function updateStatus(status: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/contests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success("Status updated");
      setContest((c) => (c ? { ...c, status } : null));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setUpdating(false);
    }
  }

  const alreadyAdded = new Set(contest?.problems.map((p) => p.problem.id) ?? []);

  if (loading || !contest) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teacher/contests">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            {contest.title}
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" />
            {new Date(contest.startAt).toLocaleString()} – {new Date(contest.endAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={contest.status} onValueChange={updateStatus} disabled={updating}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <Button variant={tab === "problems" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("problems")}>
          <List className="h-4 w-4 mr-1" /> Problems
        </Button>
        <Button variant={tab === "submissions" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("submissions")}>
          Submissions
        </Button>
        <Button variant={tab === "leaderboard" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("leaderboard")}>
          <Award className="h-4 w-4 mr-1" /> Leaderboard
        </Button>
      </div>

      {tab === "problems" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Problems</CardTitle>
            <Select onValueChange={(pid) => pid && addProblem(pid)} disabled={adding}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Add problem..." />
              </SelectTrigger>
              <SelectContent>
                {problems.filter((p) => !alreadyAdded.has(p.id)).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title} ({p.difficulty})</SelectItem>
                ))}
                {problems.filter((p) => !alreadyAdded.has(p.id)).length === 0 && (
                  <SelectItem value="" disabled>No more problems</SelectItem>
                )}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {contest.problems.length === 0 ? (
              <p className="text-muted-foreground text-sm">No problems yet. Add from the dropdown above.</p>
            ) : (
              <ul className="space-y-2">
                {contest.problems.sort((a, b) => a.orderIndex - b.orderIndex).map((cp) => (
                  <li key={cp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium">{cp.problem.title}</span>
                      <Badge variant="outline" className="ml-2">{cp.points} pts</Badge>
                      <Badge variant="secondary" className="ml-1">{cp.problem.difficulty}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeProblem(cp.problem.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "submissions" && (
        <Card>
          <CardHeader><CardTitle>Submissions</CardTitle></CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-muted-foreground">No submissions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">User</th>
                      <th className="text-left py-2">Problem</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Score</th>
                      <th className="text-left py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(submissions as { user: { fullName: string; rollNumber: string | null }; problem: { title: string }; status: string; score: number; submittedAt: string }[]).map((s, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2">{s.user?.fullName} {s.user?.rollNumber && `(${s.user.rollNumber})`}</td>
                        <td className="py-2">{s.problem?.title}</td>
                        <td className="py-2"><Badge variant={s.status === "accepted" ? "default" : "secondary"}>{s.status}</Badge></td>
                        <td className="py-2">{s.score}</td>
                        <td className="py-2">{new Date(s.submittedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "leaderboard" && (
        <Card>
          <CardHeader><CardTitle>Leaderboard</CardTitle></CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-muted-foreground">No accepted submissions yet.</p>
            ) : (
              <ul className="space-y-2">
                {leaderboard.map((u, i) => (
                  <li key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-medium">#{i + 1} {u.fullName} {u.rollNumber && `(${u.rollNumber})`}</span>
                    <span>{u.totalScore} pts · {u.problemsSolved} solved</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
