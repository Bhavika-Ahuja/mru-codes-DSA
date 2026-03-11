import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// GET: Single problem with test cases (teacher only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const problem = await prisma.codingProblem.findFirst({
      where: { id, createdById: profile.id },
      include: { testCases: { orderBy: { orderIndex: "asc" } } },
    });
    if (!problem) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, problem });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch problem" }, { status: 500 });
  }
}

// PUT: Update problem and test cases
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  timeLimitMs: z.number().int().positive().optional(),
  testCases: z.array(z.object({
    input: z.string(),
    expectedOutput: z.string(),
    isSample: z.boolean().optional(),
  })).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const problem = await prisma.codingProblem.findFirst({
      where: { id, createdById: profile.id },
    });
    if (!problem) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;
    if (data.slug && data.slug !== problem.slug) {
      const existing = await prisma.codingProblem.findUnique({ where: { slug: data.slug } });
      if (existing) return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
    }

    await prisma.codingProblem.update({
      where: { id },
      data: {
        ...(data.title != null && { title: data.title }),
        ...(data.slug != null && { slug: data.slug }),
        ...(data.description != null && { description: data.description }),
        ...(data.difficulty != null && { difficulty: data.difficulty }),
        ...(data.timeLimitMs != null && { timeLimitMs: data.timeLimitMs }),
      },
    });

    if (data.testCases && Array.isArray(data.testCases)) {
      await prisma.problemTestCase.deleteMany({ where: { problemId: id } });
      if (data.testCases.length > 0) {
        await prisma.problemTestCase.createMany({
          data: data.testCases.map((tc, i) => ({
            problemId: id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isSample: tc.isSample ?? false,
            orderIndex: i,
          })),
        });
      }
    }

    const updated = await prisma.codingProblem.findUnique({
      where: { id },
      include: { testCases: true },
    });
    return NextResponse.json({ success: true, problem: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update problem" }, { status: 500 });
  }
}

// DELETE: Delete problem
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const problem = await prisma.codingProblem.findFirst({
      where: { id, createdById: profile.id },
    });
    if (!problem) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.codingProblem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete problem" }, { status: 500 });
  }
}
