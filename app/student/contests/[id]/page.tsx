"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Trophy, Loader2, ArrowLeft, Calendar, Award, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

interface ProblemInfo {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  timeLimitMs: number;
  testCases: { input: string; expectedOutput: string }[];
}

interface ContestProblem {
  id: string;
  orderIndex: number;
  points: number;
  problem: ProblemInfo;
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

export default function StudentContestDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchContest();
  }, [id]);

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

  const isLive = contest?.status === "live" && new Date() >= new Date(contest.startAt) && new Date() <= new Date(contest.endAt);

  if (loading || !contest) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const sortedProblems = [...contest.problems].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/student/contests">
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
        <Link href={`/student/contests/${id}/leaderboard`}>
          <Button variant="outline" size="sm"><Award className="h-4 w-4 mr-1" /> Leaderboard</Button>
        </Link>
      </div>

      {contest.description && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contest.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Problems
          </CardTitle>
          <CardDescription>
            {isLive ? "Submit your solution for each problem." : "Contest is not live. You can still view problems."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedProblems.length === 0 ? (
            <p className="text-muted-foreground">No problems in this contest.</p>
          ) : (
            <ul className="space-y-2">
              {sortedProblems.map((cp, i) => (
                <li key={cp.id}>
                  <Link href={`/student/contests/${id}/problems/${cp.problem.id}`}>
                    <div className="flex items-center justify-between py-3 px-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-mono w-6">{i + 1}.</span>
                        <span className="font-medium">{cp.problem.title}</span>
                        <Badge variant={cp.problem.difficulty === "easy" ? "default" : cp.problem.difficulty === "medium" ? "secondary" : "destructive"}>
                          {cp.problem.difficulty}
                        </Badge>
                        <Badge variant="outline">{cp.points} pts</Badge>
                      </div>
                      <span className="text-muted-foreground text-sm">Solve →</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
