"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Code2, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import toast from "react-hot-toast";

type TestCase = { input: string; expectedOutput: string; isSample: boolean };

export default function EditCodingProblemPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
    timeLimitMs: 2000,
  });
  const [testCases, setTestCases] = useState<TestCase[]>([]);

  useEffect(() => {
    if (id) fetchProblem();
  }, [id]);

  async function fetchProblem() {
    try {
      setLoading(true);
      const res = await fetch(`/api/coding-problems/${id}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const p = data.problem;
      setForm({
        title: p.title,
        slug: p.slug,
        description: p.description,
        difficulty: p.difficulty,
        timeLimitMs: p.timeLimitMs ?? 2000,
      });
      const cases = (p.testCases || []).map((tc: { input: string; expectedOutput: string; isSample: boolean }) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isSample: tc.isSample ?? false,
      }));
      setTestCases(cases.length ? cases : [{ input: "", expectedOutput: "", isSample: true }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
      router.push("/teacher/coding-problems");
    } finally {
      setLoading(false);
    }
  }

  function addTestCase() {
    setTestCases((t) => [...t, { input: "", expectedOutput: "", isSample: false }]);
  }
  function removeTestCase(i: number) {
    setTestCases((t) => t.filter((_, idx) => idx !== i));
  }
  function updateTestCase(i: number, field: keyof TestCase, value: string | boolean) {
    setTestCases((t) => t.map((tc, idx) => (idx === i ? { ...tc, [field]: value } : tc)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim() || !form.description.trim()) {
      toast.error("Title, slug, and description are required");
      return;
    }
    const validTests = testCases.filter((tc) => tc.input.trim() || tc.expectedOutput.trim());
    if (validTests.length === 0) {
      toast.error("Add at least one test case");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/coding-problems/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          slug: form.slug.trim(),
          description: form.description.trim(),
          difficulty: form.difficulty,
          timeLimitMs: form.timeLimitMs,
          testCases: validTests.map((tc) => ({
            input: tc.input.trim(),
            expectedOutput: tc.expectedOutput.trim(),
            isSample: tc.isSample,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success("Problem updated");
      router.push("/teacher/coding-problems");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/teacher/coding-problems">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Code2 className="h-6 w-6 text-primary" />
          Edit Problem
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Problem</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as "easy" | "medium" | "hard" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Time limit (ms)</Label>
              <Input type="number" value={form.timeLimitMs} onChange={(e) => setForm({ ...form, timeLimitMs: parseInt(e.target.value, 10) || 2000 })} />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={8} className="font-mono text-sm" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Test cases</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addTestCase}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {testCases.map((tc, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Test case {i + 1}</span>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={tc.isSample} onChange={(e) => updateTestCase(i, "isSample", e.target.checked)} />
                    Sample
                  </label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeTestCase(i)} disabled={testCases.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div>
                  <Label className="text-xs">Input</Label>
                  <Textarea value={tc.input} onChange={(e) => updateTestCase(i, "input", e.target.value)} rows={2} className="font-mono text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Expected output</Label>
                  <Textarea value={tc.expectedOutput} onChange={(e) => updateTestCase(i, "expectedOutput", e.target.value)} rows={2} className="font-mono text-sm" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save
          </Button>
          <Link href="/teacher/coding-problems"><Button type="button" variant="outline">Cancel</Button></Link>
        </div>
      </form>
    </div>
  );
}
