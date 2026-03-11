"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Code2, Loader2, ArrowLeft, Send, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

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
  problem: ProblemInfo;
  points: number;
}

const DEFAULT_CPP = `#include <iostream>
using namespace std;

int main() {
    // your code here
    return 0;
}
`;

const DEFAULT_C = `#include <stdio.h>

int main() {
    // your code here
    return 0;
}
`;

export default function StudentContestProblemPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = params.id as string;
  const problemId = params.problemId as string;
  const [contest, setContest] = useState<{ id: string; title: string; status: string; startAt: string; endAt: string } | null>(null);
  const [cp, setCp] = useState<ContestProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState(DEFAULT_CPP);
  const [language, setLanguage] = useState<"c" | "cpp">("cpp");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: string; score: number; passedTests: number; totalTests: number } | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (contestId && problemId) fetchContest();
  }, [contestId, problemId]);

  async function fetchContest() {
    try {
      setLoading(true);
      const res = await fetch(`/api/contests/${contestId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setContest(data.contest);
      const found = data.contest.problems?.find((p: ContestProblem) => p.problem.id === problemId);
      setCp(found || null);
      if (found && language === "cpp") setCode(DEFAULT_CPP);
      if (found && language === "c") setCode(DEFAULT_C);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!cp) return;
    const isLive = contest?.status === "live" && new Date() >= new Date(contest.startAt) && new Date() <= new Date(contest.endAt);
    if (!isLive) {
      toast.error("Contest is not live. Submissions are not accepted.");
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/contests/${contestId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId: cp.problem.id, code, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      setResult({
        status: data.submission.status,
        score: data.submission.score,
        passedTests: data.submission.passedTests,
        totalTests: data.submission.totalTests,
      });
      if (data.submission.status === "accepted") toast.success("Accepted!");
      else toast.error(`Wrong answer or error: ${data.submission.status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !contest || !cp) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isLive = contest.status === "live" && new Date() >= new Date(contest.startAt) && new Date() <= new Date(contest.endAt);
  const monacoTheme = resolvedTheme === "dark" ? "vs-dark" : "light";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/student/contests/${contestId}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            {cp.problem.title}
          </h1>
          <div className="flex gap-2 mt-1">
            <Badge variant={cp.problem.difficulty === "easy" ? "default" : cp.problem.difficulty === "medium" ? "secondary" : "destructive"}>
              {cp.problem.difficulty}
            </Badge>
            <Badge variant="outline">{cp.points} pts</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col min-h-[500px]">
          <CardHeader>
            <CardTitle>Problem</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{cp.problem.description}</ReactMarkdown>
              </div>
              {cp.problem.testCases && cp.problem.testCases.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="font-semibold">Examples</h3>
                  {cp.problem.testCases.map((tc, i) => (
                    <div key={i} className="rounded border p-3 text-sm font-mono space-y-1">
                      <p><strong>Input:</strong></p>
                      <pre className="whitespace-pre-wrap bg-muted p-2 rounded">{tc.input || "(empty)"}</pre>
                      <p><strong>Output:</strong></p>
                      <pre className="whitespace-pre-wrap bg-muted p-2 rounded">{tc.expectedOutput || "(empty)"}</pre>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex flex-col min-h-[500px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Solution</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={language === "cpp" ? "default" : "outline"}
                size="sm"
                onClick={() => { setLanguage("cpp"); setCode(DEFAULT_CPP); }}
              >
                C++
              </Button>
              <Button
                variant={language === "c" ? "default" : "outline"}
                size="sm"
                onClick={() => { setLanguage("c"); setCode(DEFAULT_C); }}
              >
                C
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-[320px] border rounded overflow-hidden">
              <MonacoEditor
                height="100%"
                language={language}
                value={code}
                onChange={(v) => setCode(v ?? "")}
                theme={monacoTheme}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                }}
              />
            </div>
            {result && (
              <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${result.status === "accepted" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>
                {result.status === "accepted" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                <div>
                  <p className="font-medium">{result.status === "accepted" ? "Accepted" : result.status}</p>
                  <p className="text-sm">{result.passedTests}/{result.totalTests} tests passed · Score: {result.score}</p>
                </div>
              </div>
            )}
            <Button
              className="mt-4"
              onClick={handleSubmit}
              disabled={submitting || !isLive}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Submit
            </Button>
            {!isLive && (
              <p className="text-sm text-muted-foreground mt-2">Submissions are only accepted when the contest is live.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
