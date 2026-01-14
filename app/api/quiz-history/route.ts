import { NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import type { DifficultyLevel } from "@prisma/client";

// GET: Get student's quiz history
export async function GET(request: Request) {
  try {
    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "student") {
      return NextResponse.json(
        { error: "Only students can access quiz history" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const topic = searchParams.get("topic");
    const difficulty = searchParams.get("difficulty");

    const isDifficultyLevel = (value: string | null): value is DifficultyLevel =>
      value === "easy" || value === "medium" || value === "hard";

    // Get all completed sessions for this student
    const participants = await prisma.sessionParticipant.findMany({
      where: {
        studentId: profile.id,
        session: {
          status: "completed",
          quiz: {
            ...(topic && topic !== "all" ? { topic } : {}),
            ...(isDifficultyLevel(difficulty) ? { difficulty } : {}),
          },
        },
      },
      include: {
        session: {
          include: {
            quiz: {
              select: {
                id: true,
                title: true,
                topic: true,
                difficulty: true,
                totalQuestions: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    // Calculate history data
    const history = participants.map((p) => {
      const accuracy =
        p.questionsAnswered > 0
          ? (p.correctAnswers / p.questionsAnswered) * 100
          : 0;

      // Calculate max possible score (assuming 10 points per question)
      const maxScore = p.session.quiz.totalQuestions * 10;

      return {
        sessionId: p.sessionId,
        quizTitle: p.session.quiz.title,
        topic: p.session.quiz.topic,
        difficulty: p.session.quiz.difficulty,
        score: p.sessionScore,
        maxScore,
        accuracy,
        questionsAnswered: p.questionsAnswered,
        totalQuestions: p.session.quiz.totalQuestions,
        completedAt: p.session.endedAt?.toISOString() || p.joinedAt.toISOString(),
        timeTaken: 0, // Would need to calculate from session duration
      };
    });

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Error fetching quiz history:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz history" },
      { status: 500 }
    );
  }
}
