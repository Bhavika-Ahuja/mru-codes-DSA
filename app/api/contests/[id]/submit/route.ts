import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { runCode } from "@/lib/code-executor";

const submitSchema = z.object({
  problemId: z.string().uuid(),
  code: z.string().min(1),
  language: z.enum(["c", "cpp"]),
});

function normalizeOutput(s: string): string {
  return s.trimEnd().replace(/\r\n/g, "\n");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.role !== "student") return NextResponse.json({ error: "Only students can submit" }, { status: 403 });

    const { id: contestId } = await params;
    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    if (contest.status !== "live") return NextResponse.json({ error: "Contest is not live" }, { status: 400 });

    const now = new Date();
    if (now < contest.startAt || now > contest.endAt) {
      return NextResponse.json({ error: "Contest is not active at this time" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const { problemId, code, language } = parsed.data;
    const cpRel = await prisma.contestProblem.findUnique({
      where: { contestId_problemId: { contestId, problemId } },
      include: { problem: { include: { testCases: { orderBy: { orderIndex: "asc" } } } } },
    });
    if (!cpRel) return NextResponse.json({ error: "Problem not in this contest" }, { status: 404 });
    if (cpRel.problem.testCases.length === 0) return NextResponse.json({ error: "Problem has no test cases" }, { status: 400 });

    let passed = 0;
    let status: "accepted" | "wrong_answer" | "compile_error" | "runtime_error" = "accepted";
    const lang = language as "c" | "cpp";

    for (const tc of cpRel.problem.testCases) {
      try {
        const result = await runCode(code, lang, tc.input);
        if (result.compileCode !== 0) {
          status = "compile_error";
          break;
        }
        if (result.runCode !== 0) {
          status = "runtime_error";
          break;
        }
        const expected = normalizeOutput(tc.expectedOutput);
        const actual = normalizeOutput(result.stdout);
        if (expected !== actual) {
          status = "wrong_answer";
          break;
        }
        passed++;
      } catch (err) {
        console.error("Judge run error:", err);
        status = "runtime_error";
        break;
      }
    }

    const totalTests = cpRel.problem.testCases.length;
    const score = status === "accepted" ? cpRel.points : 0;

    const submission = await prisma.contestSubmission.create({
      data: {
        contestId,
        problemId,
        userId: profile.id,
        code,
        language,
        status,
        score,
        passedTests: passed,
        totalTests,
      },
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status,
        score,
        passedTests: passed,
        totalTests,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
