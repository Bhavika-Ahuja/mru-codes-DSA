import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

// GET: Get cheating detection reports
export async function GET(request: Request) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "teacher") {
      return NextResponse.json(
        { error: "Only teachers can access cheating detection" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    // Get all sessions created by this teacher
    const sessions = await prisma.quizSession.findMany({
      where: {
        hostId: profile.id,
        ...(sessionId && { id: sessionId }),
      },
      include: {
        quiz: {
          select: {
            title: true,
          },
        },
        participants: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    // For now, we'll simulate violation data
    // In production, you'd store violations in a separate table
    // For this implementation, we'll return empty arrays as violations
    // are tracked in real-time but not yet stored persistently

    const violations: any[] = [];
    const sessionViolations: any[] = sessions.map((session) => ({
      sessionId: session.id,
      quizTitle: session.quiz.title,
      totalViolations: 0, // Would be calculated from violations table
      studentsAffected: 0,
      startedAt: session.startedAt?.toISOString() || session.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      violations,
      sessions: sessionViolations,
    });
  } catch (error) {
    console.error("Error fetching cheating detection data:", error);
    return NextResponse.json(
      { error: "Failed to fetch violation data" },
      { status: 500 }
    );
  }
}
