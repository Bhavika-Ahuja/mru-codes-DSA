import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// GET: Leaderboard for contest (total score per user, then by accepted count / time)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: contestId } = await params;
    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const submissions = await prisma.contestSubmission.findMany({
      where: { contestId, status: "accepted" },
      orderBy: { submittedAt: "asc" },
      include: {
        user: { select: { id: true, fullName: true, rollNumber: true, section: true } },
        problem: { select: { id: true, title: true } },
      },
    });

    const byUser = new Map<string, { user: { id: string; fullName: string; rollNumber: string | null; section: string | null }; totalScore: number; problems: Set<string>; firstAccept: Record<string, string> }>();

    for (const s of submissions) {
      const uid = s.userId;
      if (!byUser.has(uid)) {
        byUser.set(uid, {
          user: s.user,
          totalScore: 0,
          problems: new Set(),
          firstAccept: {},
        });
      }
      const row = byUser.get(uid)!;
      if (!row.problems.has(s.problemId)) {
        row.problems.add(s.problemId);
        row.totalScore += s.score;
        row.firstAccept[s.problemId] = s.submittedAt.toISOString();
      }
    }

    const leaderboard = Array.from(byUser.entries())
      .map(([userId, data]) => ({
        userId,
        fullName: data.user.fullName,
        rollNumber: data.user.rollNumber,
        section: data.user.section,
        totalScore: data.totalScore,
        problemsSolved: data.problems.size,
      }))
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.problemsSolved === b.problemsSolved ? 0 : b.problemsSolved - a.problemsSolved;
      });

    return NextResponse.json({ success: true, leaderboard });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
