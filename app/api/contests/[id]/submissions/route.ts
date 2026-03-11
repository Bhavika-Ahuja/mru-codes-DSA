import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// GET: Submissions for contest (student: own only; teacher: all)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: contestId } = await params;
    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const where: { contestId: string; userId?: string } = { contestId };
    if (profile.role === "student") where.userId = profile.id;

    const submissions = await prisma.contestSubmission.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      include: {
        user: { select: { id: true, fullName: true, rollNumber: true } },
        problem: { select: { id: true, title: true, slug: true } },
      },
    });

    return NextResponse.json({ success: true, submissions });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}
