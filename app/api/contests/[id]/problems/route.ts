import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const addSchema = z.object({
  problemId: z.string().uuid(),
  orderIndex: z.number().int().min(0).optional(),
  points: z.number().int().min(0).optional(),
});

// POST: Add problem to contest (teacher)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: contestId } = await params;
    const contest = await prisma.contest.findFirst({ where: { id: contestId, createdById: profile.id } });
    if (!contest) return NextResponse.json({ error: "Contest not found" }, { status: 404 });

    const body = await request.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const problem = await prisma.codingProblem.findFirst({
      where: { id: parsed.data.problemId, createdById: profile.id },
    });
    if (!problem) return NextResponse.json({ error: "Problem not found" }, { status: 404 });

    const existing = await prisma.contestProblem.findUnique({
      where: { contestId_problemId: { contestId, problemId: parsed.data.problemId } },
    });
    if (existing) return NextResponse.json({ error: "Problem already in contest" }, { status: 400 });

    const maxOrder = await prisma.contestProblem.aggregate({
      where: { contestId },
      _max: { orderIndex: true },
    });
    const orderIndex = parsed.data.orderIndex ?? (maxOrder._max.orderIndex ?? -1) + 1;
    const points = parsed.data.points ?? 100;

    await prisma.contestProblem.create({
      data: { contestId, problemId: parsed.data.problemId, orderIndex, points },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to add problem" }, { status: 500 });
  }
}

// DELETE: Remove problem from contest (teacher)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: contestId } = await params;
    const contest = await prisma.contest.findFirst({ where: { id: contestId, createdById: profile.id } });
    if (!contest) return NextResponse.json({ error: "Contest not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get("problemId");
    if (!problemId) return NextResponse.json({ error: "problemId required" }, { status: 400 });

    await prisma.contestProblem.deleteMany({
      where: { contestId, problemId },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to remove problem" }, { status: 500 });
  }
}
