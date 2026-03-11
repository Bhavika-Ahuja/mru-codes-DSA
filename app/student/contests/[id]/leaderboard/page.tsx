"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Trophy, Loader2, ArrowLeft, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

interface LeaderboardEntry {
  userId: string;
  fullName: string;
  rollNumber: string | null;
  section: string | null;
  totalScore: number;
  problemsSolved: number;
}

export default function ContestLeaderboardPage() {
  const params = useParams();
  const id = params.id as string;
  const [contest, setContest] = useState<{ title: string } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchContest();
      fetchLeaderboard();
    }
  }, [id]);

  async function fetchContest() {
    try {
      const res = await fetch(`/api/contests/${id}`);
      const data = await res.json();
      if (data.success) setContest(data.contest);
    } catch (_) {}
  }

  async function fetchLeaderboard() {
    try {
      setLoading(true);
      const res = await fetch(`/api/contests/${id}/leaderboard`);
      const data = await res.json();
      if (data.success) setLeaderboard(data.leaderboard || []);
      else toast.error(data.error || "Failed to load");
    } catch (e) {
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }

  if (loading && leaderboard.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/student/contests/${id}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          Leaderboard {contest ? `· ${contest.title}` : ""}
        </h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Rankings</CardTitle></CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-muted-foreground">No submissions yet.</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between py-3 px-4 rounded-lg border ${
                    i === 0 ? "bg-amber-500/10 border-amber-500/30" : i === 1 ? "bg-zinc-500/10" : i === 2 ? "bg-orange-500/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-lg w-8">
                      {i + 1 === 1 ? "🥇" : i + 1 === 2 ? "🥈" : i + 1 === 3 ? "🥉" : `#${i + 1}`}
                    </span>
                    <div>
                      <p className="font-medium">{entry.fullName}</p>
                      {(entry.rollNumber || entry.section) && (
                        <p className="text-sm text-muted-foreground">
                          {entry.rollNumber} {entry.section && `· ${entry.section}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{entry.totalScore} pts</p>
                    <p className="text-sm text-muted-foreground">{entry.problemsSolved} solved</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
