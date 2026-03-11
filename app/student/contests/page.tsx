"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Loader2, Calendar, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

interface Contest {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  status: string;
  _count: { problems: number };
}

export default function StudentContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

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

  function getStatus(c: Contest) {
    const now = new Date();
    const start = new Date(c.startAt);
    const end = new Date(c.endAt);
    if (c.status === "ended" || now > end) return { label: "Ended", variant: "secondary" as const };
    if (c.status === "live" && now >= start && now <= end) return { label: "Live", variant: "default" as const };
    if (now < start) return { label: "Upcoming", variant: "outline" as const };
    return { label: c.status, variant: "outline" as const };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          Coding Contests
        </h1>
        <p className="text-muted-foreground mt-1">
          Compete in timed coding contests. Solve problems, submit code, and climb the leaderboard.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-16 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      ) : contests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No contests available. Check back later.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contests.map((c) => {
            const status = getStatus(c);
            return (
              <Link key={c.id} href={`/student/contests/${c.id}`}>
                <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">{c.title}</CardTitle>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(c.startAt).toLocaleString()} – {new Date(c.endAt).toLocaleString()}
                    </CardDescription>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {c._count.problems} problems
                    </p>
                  </CardHeader>
                  <CardContent>
                    <span className="text-sm text-primary font-medium flex items-center gap-1">
                      View contest <ChevronRight className="h-4 w-4" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
