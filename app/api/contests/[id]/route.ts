import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  status: z.enum(["draft", "scheduled", "live", "ended"]).optional(),
});

// GET: Single contest with problems (no test cases exposed to students)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        problems: {
          orderBy: { orderIndex: "asc" },
          include: {
            problem: {
              select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                difficulty: true,
                timeLimitMs: true,
                testCases: {
                  where: { isSample: true },
                  orderBy: { orderIndex: "asc" },
                  select: { input: true, expectedOutput: true },
                },
              },
            },
            points: true,
            orderIndex: true,
          },
        },
      },
    });
    if (!contest) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (profile.role === "student" && !["scheduled", "live", "ended"].includes(contest.status)) {
      return NextResponse.json({ error: "Contest not available" }, { status: 403 });
    }

    return NextResponse.json({ success: true, contest });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch contest" }, { status: 500 });
  }
}

// PUT: Update contest (teacher)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const contest = await prisma.contest.findFirst({ where: { id, createdById: profile.id } });
    if (!contest) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

    const updateData: Record<string, unknown> = {};
    if (parsed.data.title != null) updateData.title = parsed.data.title;
    if (parsed.data.description != null) updateData.description = parsed.data.description;
    if (parsed.data.startAt != null) updateData.startAt = new Date(parsed.data.startAt);
    if (parsed.data.endAt != null) updateData.endAt = new Date(parsed.data.endAt);
    if (parsed.data.status != null) updateData.status = parsed.data.status;

    const updated = await prisma.contest.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json({ success: true, contest: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update contest" }, { status: 500 });
  }
}

// DELETE contest (teacher)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const contest = await prisma.contest.findFirst({ where: { id, createdById: profile.id } });
    if (!contest) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.contest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete contest" }, { status: 500 });
  }
}
