import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  timeLimitMs: z.number().int().positive().optional(),
  testCases: z.array(z.object({
    input: z.string(),
    expectedOutput: z.string(),
    isSample: z.boolean().optional(),
  })).optional(),
});

// GET: List coding problems (teacher: all they created)
export async function GET(_request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const problems = await prisma.codingProblem.findMany({
      where: { createdById: profile.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { testCases: true } } },
    });
    return NextResponse.json({ success: true, problems });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list problems" }, { status: 500 });
  }
}

// POST: Create coding problem
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const existing = await prisma.codingProblem.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) return NextResponse.json({ error: "Slug already exists" }, { status: 400 });

    const { testCases = [], ...data } = parsed.data;
    const problem = await prisma.codingProblem.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        difficulty: data.difficulty as "easy" | "medium" | "hard",
        timeLimitMs: data.timeLimitMs ?? 2000,
        createdById: profile.id,
      },
    });

    if (testCases.length > 0) {
      await prisma.problemTestCase.createMany({
        data: testCases.map((tc, i) => ({
          problemId: problem.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isSample: tc.isSample ?? false,
          orderIndex: i,
        })),
      });
    }

    const created = await prisma.codingProblem.findUnique({
      where: { id: problem.id },
      include: { testCases: true },
    });
    return NextResponse.json({ success: true, problem: created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create problem" }, { status: 500 });
  }
}
